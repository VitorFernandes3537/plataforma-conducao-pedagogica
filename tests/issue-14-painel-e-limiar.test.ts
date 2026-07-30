import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { painelAcumulado, painelDoDia, PainelIndisponivel } from '@/db/painel'
import { lancaAvaliacaoDoAluno } from '@/db/registro-diario'
import {
  alunos,
  cursos,
  dias,
  grupos,
  niveisDeAvaliacao,
  obstaculos,
  turmas,
  usuarios,
} from '@/db/schema'
import { apura } from '@/domain/superacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 14 em
// docs/BACKLOG.md. SSOT: Doc 4 §5.2 · Doc 6 §2 · ADR 0005.

/** A escala deste curso de teste. É dado, como manda a ADR 0004. */
const ESCALA = [
  { valor: 0, descritor: 'Não superou', contaComoSuperacao: false },
  { valor: 1, descritor: 'Superou com apoio', contaComoSuperacao: true },
  { valor: 2, descritor: 'Superou sozinho', contaComoSuperacao: true },
]

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 14 — painel do instrutor e limiar de adiantamento', () => {
  let banco: BancoEfemero

  /** Cinco grupos de dois: nada aqui é regra, é a turma de um curso fictício. */
  const GRUPOS = 5
  const POR_GRUPO = 2

  async function cenario(configuracao: Partial<typeof cursos.$inferInsert> = {}) {
    const curso = await criaCurso(banco, { tamanhoMaximoDeGrupo: POR_GRUPO, ...configuracao })
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    await banco.db.insert(niveisDeAvaliacao).values(ESCALA.map((n) => ({ cursoId: curso.id, ...n })))

    const [obstaculo] = await banco.db
      .insert(obstaculos)
      .values({
        cursoId: curso.id,
        ordem: 1,
        pergunta: 'Por que meu programa aceita um estado que não existe?',
        peso: 1,
      })
      .returning()

    // Dia 1 sem obstáculo — abertura. Dia 2 com o obstáculo do dia.
    const diasCriados = await banco.db
      .insert(dias)
      .values([
        { cursoId: curso.id, ordem: 1 },
        { cursoId: curso.id, ordem: 2, obstaculoId: obstaculo!.id },
      ])
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const turmaInteira = []
    for (let g = 0; g < GRUPOS; g += 1) {
      const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()
      const integrantes = []
      for (let i = 0; i < POR_GRUPO; i += 1) {
        const numero = 2100 + g * 10 + i
        const [usuario] = await banco.db
          .insert(usuarios)
          .values({
            githubUserId: numero,
            githubLogin: `a${numero}`,
            nome: `Aluno ${numero}`,
            papel: 'aluno',
          })
          .returning()
        const [aluno] = await banco.db
          .insert(alunos)
          .values({
            turmaId: turma!.id,
            usuarioId: usuario!.id,
            grupoId: grupo!.id,
            posicaoNoGrupo: i + 1,
          })
          .returning()
        integrantes.push(aluno!)
      }
      turmaInteira.push({ grupo: grupo!, integrantes })
    }

    return {
      curso,
      turma: turma!,
      obstaculo: obstaculo!,
      diaSemObstaculo: diasCriados[0]!,
      dia: diasCriados[1]!,
      instrutora: instrutora!,
      turmaInteira,
    }
  }

  /** Lança o mesmo valor para todos os integrantes dos primeiros `quantos` grupos. */
  async function lancaParaOsPrimeiros(
    c: Awaited<ReturnType<typeof cenario>>,
    quantos: number,
    valor: number,
  ) {
    for (const { integrantes } of c.turmaInteira.slice(0, quantos)) {
      for (const aluno of integrantes) {
        await lancaAvaliacaoDoAluno(banco.db, aluno.id, {
          diaId: c.dia.id,
          obstaculoId: c.obstaculo.id,
          valor,
          instrutorId: c.instrutora.id,
        })
      }
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('painel_calcula_grupos_que_superaram', async () => {
    const c = await cenario({
      unidadeDeSuperacao: 'grupo',
      criterioDeSuperacaoDoGrupo: 'todos_os_integrantes',
    })

    // Três grupos inteiros superam, dois ficam sem avaliação nenhuma.
    await lancaParaOsPrimeiros(c, 3, 2)

    const painel = await painelDoDia(banco.db, c.turma.id, c.dia.id)

    expect(painel.obstaculoId).toBe(c.obstaculo.id)
    expect(painel.pergunta).toBe(c.obstaculo.pergunta)
    expect(painel.apuracao.total).toBe(GRUPOS)
    expect(painel.apuracao.superadas).toBe(3)
    expect(painel.apuracao.pendentes).toBe(2)

    // A unidade contada é o GRUPO: dez alunos, cinco unidades.
    expect(painel.apuracao.unidades).toHaveLength(GRUPOS)
    expect(new Set(painel.apuracao.unidades.map((u) => u.id)).size).toBe(GRUPOS)

    // O obstáculo vem do DIA. Dia sem obstáculo não é erro: é um dia que não
    // tem o que superar, e a tela precisa dizer isso em vez de parecer quebrada.
    const abertura = await painelDoDia(banco.db, c.turma.id, c.diaSemObstaculo.id)
    expect(abertura.obstaculoId).toBeNull()
    expect(abertura.apuracao.total).toBe(0)
    expect(abertura.apuracao.limiarAtingido).toBe(false)

    // Dia de outro curso não monta painel desta turma.
    const outroCurso = await criaCurso(banco, { nome: 'Outro curso' })
    const [diaAlheio] = await banco.db
      .insert(dias)
      .values({ cursoId: outroCurso.id, ordem: 1 })
      .returning()
    await expect(painelDoDia(banco.db, c.turma.id, diaAlheio!.id)).rejects.toThrow(
      PainelIndisponivel,
    )
  })

  it('superado_e_avaliacao_maior_ou_igual_a_um', async () => {
    const c = await cenario()

    const [primeiro, segundo, terceiro] = c.turmaInteira

    // Nível 0 não conta; 1 e 2 contam. E o predicado sai de
    // `contaComoSuperacao`, não de comparação com número (ADR 0004).
    for (const aluno of primeiro!.integrantes) {
      await lancaAvaliacaoDoAluno(banco.db, aluno.id, {
        diaId: c.dia.id,
        obstaculoId: c.obstaculo.id,
        valor: 0,
        instrutorId: c.instrutora.id,
      })
    }
    for (const aluno of segundo!.integrantes) {
      await lancaAvaliacaoDoAluno(banco.db, aluno.id, {
        diaId: c.dia.id,
        obstaculoId: c.obstaculo.id,
        valor: 1,
        instrutorId: c.instrutora.id,
      })
    }
    for (const aluno of terceiro!.integrantes) {
      await lancaAvaliacaoDoAluno(banco.db, aluno.id, {
        diaId: c.dia.id,
        obstaculoId: c.obstaculo.id,
        valor: 2,
        instrutorId: c.instrutora.id,
      })
    }

    // Unidade `aluno`, que é a configuração deste curso: dez alunos, quatro
    // superaram, dois não, quatro pendentes.
    const painel = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(painel.politica.unidade).toBe('aluno')
    expect(painel.apuracao.total).toBe(GRUPOS * POR_GRUPO)
    expect(painel.apuracao.superadas).toBe(4)
    expect(painel.apuracao.pendentes).toBe(4)

    // A prova de que o corte é dado e não código: mudar `contaComoSuperacao` do
    // nível 1 muda o painel, sem tocar em uma linha de fonte.
    await banco.db
      .update(niveisDeAvaliacao)
      .set({ contaComoSuperacao: false })
      .where(eq(niveisDeAvaliacao.cursoId, c.curso.id))

    const depois = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(depois.apuracao.superadas).toBe(0)

    // E nenhum número da escala aparece na fonte do painel nem do motor.
    const fontes = ['src/db/painel.ts', 'src/domain/superacao.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/nivel\s*[<>]=?\s*\d/i)
    expect(fontes).not.toMatch(/valor\s*[<>]=?\s*\d/i)
  })

  it('painel_sinaliza_limiar_atingido', async () => {
    // Limiar de 60% sobre grupos: com cinco grupos, três bastam.
    const c = await cenario({
      limiarDeAdiantamento: 0.6,
      unidadeDeSuperacao: 'grupo',
      criterioDeSuperacaoDoGrupo: 'todos_os_integrantes',
    })

    await lancaParaOsPrimeiros(c, 2, 2)
    const abaixo = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(abaixo.apuracao.proporcao).toBeCloseTo(2 / GRUPOS)
    expect(abaixo.apuracao.limiarAtingido).toBe(false)

    await lancaParaOsPrimeiros(c, 3, 2)
    const noLimiar = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(noLimiar.apuracao.proporcao).toBeCloseTo(3 / GRUPOS)
    expect(noLimiar.apuracao.limiarAtingido).toBe(true)

    // A plataforma SINALIZA; quem decide adiantar é o instrutor. O painel não
    // tem nem campo para registrar a decisão — está fora de escopo por escolha.
    expect(Object.keys(noLimiar)).not.toContain('adiantou')
    expect(Object.keys(noLimiar.apuracao)).not.toContain('decisao')

    // Turma vazia não adianta: sem ninguém aferido, "100% superaram" seria
    // verdade vazia.
    const vazia = apura([], { unidade: 'aluno', criterioDoGrupo: null, limiar: 0.6 })
    expect(vazia.total).toBe(0)
    expect(vazia.limiarAtingido).toBe(false)
  })

  it('limiar_e_proporcao_configuravel', async () => {
    const c = await cenario({ limiarDeAdiantamento: 0.8, unidadeDeSuperacao: 'aluno' })

    // Seis de dez alunos superam: 60%.
    await lancaParaOsPrimeiros(c, 3, 2)
    expect((await painelDoDia(banco.db, c.turma.id, c.dia.id)).apuracao.limiarAtingido).toBe(false)

    // A MESMA turma, com o mesmo lançamento, passa a atingir o limiar quando só
    // a configuração muda. É proporção, não número absoluto (Doc 4 §5.2): o
    // curso pode rodar com oito grupos ou com quatorze.
    await banco.db
      .update(cursos)
      .set({ limiarDeAdiantamento: 0.5 })
      .where(eq(cursos.id, c.curso.id))

    const frouxo = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(frouxo.politica.limiar).toBe(0.5)
    expect(frouxo.apuracao.limiarAtingido).toBe(true)

    // Proporção fora de 0..1 é recusada pelo banco: zero adiantaria sempre e
    // acima de um nunca, e os dois desligam o limiar sem dizer que o desligaram.
    for (const invalido of [0, 1.5, -0.2]) {
      await expect(
        banco.db
          .update(cursos)
          .set({ limiarDeAdiantamento: invalido })
          .where(eq(cursos.id, c.curso.id)),
      ).rejects.toThrow()
    }

    // Nenhuma proporção mora na fonte.
    const fontes = ['src/db/painel.ts', 'src/domain/superacao.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/0\.\d+/)
    expect(fontes).not.toMatch(/limiar\s*[:=]\s*[\d.]+/)
  })

  it('dia_sem_registro_aparece_pendente', async () => {
    const c = await cenario()

    // Ninguém avaliado ainda: todo mundo pendente, e ninguém superado. É a
    // diferença entre "não superou" e "ninguém olhou" — as duas pedem ações
    // opostas do instrutor.
    const antes = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(antes.apuracao.total).toBe(GRUPOS * POR_GRUPO)
    expect(antes.apuracao.pendentes).toBe(GRUPOS * POR_GRUPO)
    expect(antes.apuracao.superadas).toBe(0)
    expect(antes.apuracao.unidades.every((u) => u.pendente && !u.superado)).toBe(true)

    // Avaliar com zero tira a pendência sem contar como superação.
    const primeiro = c.turmaInteira[0]!.integrantes[0]!
    await lancaAvaliacaoDoAluno(banco.db, primeiro.id, {
      diaId: c.dia.id,
      obstaculoId: c.obstaculo.id,
      valor: 0,
      instrutorId: c.instrutora.id,
    })

    const depois = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    const dele = depois.apuracao.unidades.find((u) => u.id === primeiro.id)
    expect(dele?.pendente).toBe(false)
    expect(dele?.superado).toBe(false)
    expect(depois.apuracao.pendentes).toBe(GRUPOS * POR_GRUPO - 1)

    // O acumulado mostra o dia sem obstáculo também, com apuração vazia — o
    // calendário é contínuo, e um buraco na lista pareceria dado faltando.
    const acumulado = await painelAcumulado(banco.db, c.turma.id, c.dia.id)
    expect(acumulado.map((p) => p.ordemDoDia)).toEqual([1, 2])
    expect(acumulado[0]?.apuracao.total).toBe(0)
    expect(acumulado[1]?.apuracao.total).toBe(GRUPOS * POR_GRUPO)
  })

  it('a_politica_de_superacao_e_do_instrutor_nao_da_plataforma', async () => {
    // O núcleo da ADR 0005: o MESMO conjunto de avaliações produz vereditos
    // diferentes quando só a política muda. Se a plataforma tivesse uma
    // preferência embutida, este teste não conseguiria mudar o resultado.
    const c = await cenario({
      unidadeDeSuperacao: 'grupo',
      criterioDeSuperacaoDoGrupo: 'todos_os_integrantes',
    })

    // Um integrante de cada um dos três primeiros grupos supera; o parceiro não.
    for (const { integrantes } of c.turmaInteira.slice(0, 3)) {
      await lancaAvaliacaoDoAluno(banco.db, integrantes[0]!.id, {
        diaId: c.dia.id,
        obstaculoId: c.obstaculo.id,
        valor: 2,
        instrutorId: c.instrutora.id,
      })
      await lancaAvaliacaoDoAluno(banco.db, integrantes[1]!.id, {
        diaId: c.dia.id,
        obstaculoId: c.obstaculo.id,
        valor: 0,
        instrutorId: c.instrutora.id,
      })
    }

    // Exigindo todos: nenhum grupo superou — protege quem ficaria para trás, ao
    // custo de travar a turma por um aluno.
    const exigindoTodos = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(exigindoTodos.apuracao.superadas).toBe(0)

    // Bastando um: três grupos superaram — deixa a turma andar, ao custo de
    // carregar quem não acompanhou. As duas leituras são defensáveis, e a
    // escolha é de quem conduz o módulo.
    await banco.db
      .update(cursos)
      .set({ criterioDeSuperacaoDoGrupo: 'qualquer_integrante' })
      .where(eq(cursos.id, c.curso.id))

    const bastandoUm = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(bastandoUm.apuracao.superadas).toBe(3)

    // E por aluno, a pergunta da agregação nem chega a ser feita: três
    // superaram, três não, quatro pendentes.
    await banco.db
      .update(cursos)
      .set({ unidadeDeSuperacao: 'aluno', criterioDeSuperacaoDoGrupo: null })
      .where(eq(cursos.id, c.curso.id))

    const porAluno = await painelDoDia(banco.db, c.turma.id, c.dia.id)
    expect(porAluno.apuracao.total).toBe(GRUPOS * POR_GRUPO)
    expect(porAluno.apuracao.superadas).toBe(3)
    expect(porAluno.apuracao.pendentes).toBe(4)

    // O banco recusa política incoerente: critério de grupo com aferição por
    // aluno é estado que nenhuma tela sabe desenhar.
    await expect(
      banco.db
        .update(cursos)
        .set({ unidadeDeSuperacao: 'aluno', criterioDeSuperacaoDoGrupo: 'todos_os_integrantes' })
        .where(eq(cursos.id, c.curso.id)),
    ).rejects.toThrow()
    await expect(
      banco.db
        .update(cursos)
        .set({ unidadeDeSuperacao: 'grupo', criterioDeSuperacaoDoGrupo: null })
        .where(eq(cursos.id, c.curso.id)),
    ).rejects.toThrow()
  })
})
