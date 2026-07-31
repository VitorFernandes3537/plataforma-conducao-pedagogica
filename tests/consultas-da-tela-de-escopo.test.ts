import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { cursoDaTurma } from '@/db/curso'
import {
  abreRascunho,
  EscopoInvalido,
  estadoDaTraducao,
  gravaLinhaDeTraducao,
  traducaoDoEscopo,
} from '@/db/resposta-de-escopo'
import {
  bancosDeTemas,
  estruturas,
  formularios,
  grupos,
  linhasDeTraducao,
  papeisDaEstrutura,
  respostasDeEscopo,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'
import { temasDoCurso } from '@/db/temas'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

/**
 * As consultas que a tela de escopo precisava e não existiam.
 *
 * Duas eram lacuna de verdade: nada derivava o banco de temas a partir da
 * matrícula do aluno, e a tabela de tradução só tinha leitura de completude —
 * escrever uma linha era feito à mão nos testes, nunca por consulta.
 */
describe('consultas da tela de escopo', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário' })
      .returning()
    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    return { curso, turma: turma!, formulario: formulario!, grupo: grupo! }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  // ── O banco de temas, a partir da turma ──────────────────────────────

  it('curso_da_turma_independe_do_dia_corrente', async () => {
    const { curso, turma } = await cenario()

    // Nenhum dia foi criado e o ponteiro está nulo: é o estado real do D2, e a
    // tela do aluno precisa do curso mesmo assim.
    expect(await cursoDaTurma(banco.db, turma.id)).toEqual({ id: curso.id })
    expect(await cursoDaTurma(banco.db, crypto.randomUUID())).toBeNull()
  })

  it('temas_do_curso_atravessam_todos_os_bancos_do_curso', async () => {
    const { curso, turma } = await cenario()

    // Dois bancos no mesmo curso. O schema permite, e nenhum documento-dono diz
    // que existe um só — a consulta não pode escolher por sorte.
    const bancosCriados = await banco.db
      .insert(bancosDeTemas)
      .values([
        { cursoId: curso.id, nome: 'Primeiro banco' },
        { cursoId: curso.id, nome: 'Segundo banco' },
      ])
      .returning()

    await banco.db.insert(temas).values([
      { bancoDeTemasId: bancosCriados[0]!.id, nome: 'Barbearia', dificuldade: 'fácil', trilha: 'padrao' },
      { bancoDeTemasId: bancosCriados[1]!.id, nome: 'Oficina', dificuldade: 'médio', trilha: 'padrao' },
    ])

    const lista = await temasDoCurso(banco.db, curso.id, turma.id)
    expect(lista.map((t) => t.nome).sort()).toEqual(['Barbearia', 'Oficina'])
  })

  it('temas_do_curso_marcam_disponibilidade_por_turma', async () => {
    const { curso, turma, grupo } = await cenario()

    const [bancoDeTemas] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()

    const criados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Barbearia', dificuldade: 'fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Oficina', dificuldade: 'fácil', trilha: 'padrao' },
      ])
      .returning()

    await banco.db.update(grupos).set({ temaId: criados[0]!.id }).where(eq(grupos.id, grupo.id))

    const lista = await temasDoCurso(banco.db, curso.id, turma.id)
    const porNome = new Map(lista.map((t) => [t.nome, t]))

    // Tomado continua na lista, marcado. Some da lista seria esconder do aluno
    // o tamanho real da escolha.
    expect(porNome.get('Barbearia')?.disponivel).toBe(false)
    expect(porNome.get('Oficina')?.disponivel).toBe(true)

    // Outra turma do mesmo curso não herda a indisponibilidade: a unicidade é
    // por turma (Doc 7 §2.4).
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Outra turma' })
      .returning()
    const naOutra = await temasDoCurso(banco.db, curso.id, outraTurma!.id)
    expect(naOutra.every((t) => t.disponivel)).toBe(true)
  })

  // ── A tabela de tradução ─────────────────────────────────────────────

  async function comEstrutura(cursoId: string) {
    const [estrutura] = await banco.db
      .insert(estruturas)
      .values({ cursoId, nome: 'Estrutura' })
      .returning()

    return banco.db
      .insert(papeisDaEstrutura)
      .values([
        { estruturaId: estrutura!.id, ordem: 1, nome: 'Cliente', obrigatorio: true },
        { estruturaId: estrutura!.id, ordem: 2, nome: 'Atendimento', obrigatorio: true },
        { estruturaId: estrutura!.id, ordem: 3, nome: 'Apoio', obrigatorio: false },
      ])
      .returning()
  }

  it('traducao_lista_papel_vazio_e_papel_opcional', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    await gravaLinhaDeTraducao(banco.db, escopo.id, papeis[0]!.id, {
      nomeNoNegocio: 'Leitor',
      nomeNoCodigo: 'Leitor',
    })

    const linhas = await traducaoDoEscopo(banco.db, escopo.id, curso.id)

    // Em ordem, e o papel ainda vazio aparece — sumir tiraria o campo da tela.
    expect(linhas.map((l) => l.nome)).toEqual(['Cliente', 'Atendimento', 'Apoio'])
    expect(linhas[0]?.nomeNoNegocio).toBe('Leitor')
    expect(linhas[1]?.nomeNoNegocio).toBeNull()

    // O opcional vem junto e declarado como opcional.
    expect(linhas[2]?.obrigatorio).toBe(false)
  })

  it('traducao_lista_os_papeis_antes_de_existir_rascunho', async () => {
    const { curso } = await cenario()
    await comEstrutura(curso.id)

    // É o estado da primeira abertura da tela: ninguém gravou nada, e o
    // rascunho ainda não existe. A tabela precisa aparecer inteira mesmo assim,
    // senão a página teria que criar o rascunho ao ser lida.
    const linhas = await traducaoDoEscopo(banco.db, null, curso.id)

    expect(linhas.map((l) => l.nome)).toEqual(['Cliente', 'Atendimento', 'Apoio'])
    expect(linhas.every((l) => l.nomeNoNegocio === null)).toBe(true)
  })

  it('gravar_traducao_e_idempotente_por_papel', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    await gravaLinhaDeTraducao(banco.db, escopo.id, papeis[0]!.id, {
      nomeNoNegocio: 'Leitor',
      nomeNoCodigo: 'Leitor',
    })
    await gravaLinhaDeTraducao(banco.db, escopo.id, papeis[0]!.id, {
      nomeNoNegocio: 'Cliente do salão',
      nomeNoCodigo: 'ClienteDoSalao',
    })

    const linhas = await traducaoDoEscopo(banco.db, escopo.id, curso.id)
    expect(linhas[0]?.nomeNoNegocio).toBe('Cliente do salão')
    expect(linhas[0]?.nomeNoCodigo).toBe('ClienteDoSalao')

    // Corrigir não cria linha nova: a unicidade é por papel.
    expect(linhas.filter((l) => l.papelId === papeis[0]!.id)).toHaveLength(1)
  })

  it('traducao_completa_quando_todos_os_obrigatorios_tem_linha', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    for (const papel of papeis.filter((p) => p.obrigatorio)) {
      await gravaLinhaDeTraducao(banco.db, escopo.id, papel.id, {
        nomeNoNegocio: papel.nome,
        nomeNoCodigo: papel.nome,
      })
    }

    // O opcional continua sem linha, e a tabela está completa mesmo assim.
    const estado = await estadoDaTraducao(banco.db, escopo.id, curso.id)
    expect(estado.completa).toBe(true)
  })

  it('grupo_nao_edita_traducao_depois_de_entregar', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    // Entregue: a mesma janela de edição de `gravaResposta` fecha aqui, senão a
    // fila do instrutor vira alvo móvel.
    await banco.db
      .update(respostasDeEscopo)
      .set({ estado: 'submetido', submetidoEm: new Date() })
      .where(eq(respostasDeEscopo.id, escopo.id))

    await expect(
      gravaLinhaDeTraducao(banco.db, escopo.id, papeis[0]!.id, {
        nomeNoNegocio: 'Tarde demais',
        nomeNoCodigo: 'TardeDemais',
      }),
    ).rejects.toBeInstanceOf(EscopoInvalido)
  })

  it('banco_recusa_traducao_em_escopo_fechado_sem_passar_pela_aplicacao', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    await banco.db
      .update(respostasDeEscopo)
      .set({ estado: 'submetido', submetidoEm: new Date() })
      .where(eq(respostasDeEscopo.id, escopo.id))

    // INSERT direto, sem `gravaLinhaDeTraducao`. A guarda da aplicação não está
    // no caminho — quem recusa é o gatilho, como já acontecia com as respostas.
    // Sem isso, a única barreira da tabela de tradução seria a aplicação, e a
    // integridade deste projeto mora no banco.
    await expect(
      banco.db.insert(linhasDeTraducao).values({
        respostaDeEscopoId: escopo.id,
        papelId: papeis[0]!.id,
        nomeNoNegocio: 'Pela porta dos fundos',
        nomeNoCodigo: 'PortaDosFundos',
      }),
    ).rejects.toThrow()
  })

  it('grupo_volta_a_editar_traducao_quando_devolvido', async () => {
    const { curso, formulario, grupo } = await cenario()
    const papeis = await comEstrutura(curso.id)
    const escopo = await abreRascunho(banco.db, grupo.id, formulario.id)

    const [instrutor] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 9, githubLogin: 'instrutor', nome: 'Instrutor', papel: 'instrutor' })
      .returning()

    await banco.db
      .update(respostasDeEscopo)
      .set({
        estado: 'devolvido',
        submetidoEm: new Date(),
        decididoEm: new Date(),
        decididoPorId: instrutor!.id,
        motivoDaDevolucao: 'A tradução usa nome genérico.',
      })
      .where(eq(respostasDeEscopo.id, escopo.id))

    // Devolver existe para o grupo corrigir. Se a tradução continuasse travada,
    // a correção seria impossível justamente no que foi devolvido.
    await gravaLinhaDeTraducao(banco.db, escopo.id, papeis[0]!.id, {
      nomeNoNegocio: 'Cliente do salão',
      nomeNoCodigo: 'ClienteDoSalao',
    })

    const linhas = await traducaoDoEscopo(banco.db, escopo.id, curso.id)
    expect(linhas[0]?.nomeNoNegocio).toBe('Cliente do salão')
  })
})
