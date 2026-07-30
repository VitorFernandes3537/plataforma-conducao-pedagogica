import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alocaTema } from '@/db/alocacao'
import { indicePublicoDaTurma, turmasComIndice } from '@/db/indice'
import {
  alunos,
  bancosDeTemas,
  grupos,
  repositorios,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'
import { ehRotaDeInstrutor, PREFIXO_DE_INSTRUTOR } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 19 em
// docs/BACKLOG.md. SSOT: Doc 5 §6.2.

/** O caminho público do índice, como a aplicação o serve. */
const CAMINHO_DO_INDICE = '/turma/qualquer-id'

describe('Issue 19 — índice público da turma', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [bancoDeTemas] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()

    const temasCriados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Reserva de salas', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Atendimento de chamados', dificuldade: 'Médio', trilha: 'padrao' },
      ])
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    // Os dois primeiros grupos têm tema; o terceiro ainda não.
    await alocaTema(banco.db, gruposCriados[0]!.id, temasCriados[0]!.id)
    await alocaTema(banco.db, gruposCriados[1]!.id, temasCriados[1]!.id)

    async function matricula(nome: string, id: number, grupoId: string, posicao: number) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: id, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({ turmaId: turma!.id, usuarioId: usuario!.id, grupoId, posicaoNoGrupo: posicao })
        .returning()
      return { aluno: aluno!, usuario: usuario! }
    }

    const ana = await matricula('Ana', 1901, gruposCriados[0]!.id, 1)
    const bruno = await matricula('Bruno', 1902, gruposCriados[0]!.id, 2)
    const carla = await matricula('Carla', 1903, gruposCriados[1]!.id, 1)

    await banco.db.insert(repositorios).values([
      { alunoId: ana.aluno.id, url: 'https://github.com/ana/projeto-reserva' },
      { alunoId: bruno.aluno.id, url: 'https://github.com/bruno/projeto-reserva' },
      { alunoId: carla.aluno.id, url: 'https://github.com/carla/projeto-chamados' },
    ])

    return {
      curso,
      turma: turma!,
      temas: temasCriados,
      grupos: gruposCriados,
      ana,
      bruno,
      carla,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('indice_publico_lista_tema_e_repositorio', async () => {
    const c = await cenario()

    const indice = await indicePublicoDaTurma(banco.db, c.turma.id)

    // Só os grupos com tema. O terceiro não teria o que mostrar, e uma linha
    // vazia pareceria projeto abandonado em vez de projeto ainda sem tema.
    expect(indice).toHaveLength(2)
    expect(indice.map((g) => g.tema).sort()).toEqual([
      'Atendimento de chamados',
      'Reserva de salas',
    ])

    // O repositório é individual (Doc 5 §6): o grupo de dois mostra dois links.
    const daReserva = indice.find((g) => g.tema === 'Reserva de salas')
    expect(daReserva?.repositorios).toEqual([
      'https://github.com/ana/projeto-reserva',
      'https://github.com/bruno/projeto-reserva',
    ])

    const dosChamados = indice.find((g) => g.tema === 'Atendimento de chamados')
    expect(dosChamados?.repositorios).toHaveLength(1)

    // Grupo com tema e sem repositório ainda aparece: o tema existe desde o
    // terceiro dia e o repositório vem depois.
    await alocaTema(banco.db, c.grupos[2]!.id, (await temaExtra(c))!)
    const comPendente = await indicePublicoDaTurma(banco.db, c.turma.id)
    expect(comPendente).toHaveLength(3)
    expect(comPendente.find((g) => g.tema === 'Cadastro de equipamentos')?.repositorios).toEqual([])

    // É por turma: outra turma tem outro índice.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra turma' })
      .returning()
    expect(await indicePublicoDaTurma(banco.db, outraTurma!.id)).toHaveLength(0)

    // E `turmasComIndice` só devolve as que têm o que mostrar.
    const publicaveis = await turmasComIndice(banco.db, c.curso.id)
    expect(publicaveis.map((t) => t.turmaId)).toEqual([c.turma.id])
  })

  async function temaExtra(c: Awaited<ReturnType<typeof cenario>>) {
    const [bancoDeTemas] = await banco.db
      .select({ id: bancosDeTemas.id })
      .from(bancosDeTemas)
      .where(eq(bancosDeTemas.cursoId, c.curso.id))
      .limit(1)
    const [tema] = await banco.db
      .insert(temas)
      .values({
        bancoDeTemasId: bancoDeTemas!.id,
        nome: 'Cadastro de equipamentos',
        dificuldade: 'Fácil',
        trilha: 'padrao',
      })
      .returning()
    return tema?.id
  }

  it('indice_publico_dispensa_autenticacao', async () => {
    const c = await cenario()

    // A leitura não recebe ator. É a única da plataforma que não pergunta quem
    // está lendo — e é por isso que ela precisa devolver o mínimo. Um parâmetro
    // de ator convidaria a acrescentar campo "só para quem está logado", e a
    // página deixaria de ser a mesma para todo mundo.
    expect(indicePublicoDaTurma).toHaveLength(2)

    const indice = await indicePublicoDaTurma(banco.db, c.turma.id)
    expect(indice.length).toBeGreaterThan(0)

    // E o caminho fica fora do prefixo do instrutor, então o proxy o deixa
    // passar sem sessão. A garantia é essa: a rota não está protegida, em vez
    // de haver uma exceção escrita que alguém pode esquecer de manter.
    expect(ehRotaDeInstrutor(CAMINHO_DO_INDICE)).toBe(false)
    expect(CAMINHO_DO_INDICE.startsWith(PREFIXO_DE_INSTRUTOR)).toBe(false)

    // A página também não importa nada de autenticação.
    const pagina = readFileSync('src/app/turma/[turmaId]/page.tsx', 'utf8')
    expect(pagina).not.toMatch(/from '@\/lib\/auth'/)
    expect(pagina).not.toMatch(/\bauth\(\)/)
  })

  it('indice_publico_nao_expoe_avaliacao', async () => {
    const c = await cenario()

    const indice = await indicePublicoDaTurma(banco.db, c.turma.id)

    // O que sai é tema e URL. Nada mais — nem nome de pessoa: o documento diz
    // "domínios e repositórios da coorte", e o login do GitHub que aparece na
    // URL já é público pela decisão do próprio aluno de ter repositório
    // público (Doc 5 §6). O nome civil não é.
    for (const grupo of indice) {
      expect(Object.keys(grupo).sort()).toEqual(['grupoId', 'repositorios', 'tema'])
    }

    const serializado = JSON.stringify(indice)
    for (const nome of ['Ana', 'Bruno', 'Carla']) {
      expect(serializado).not.toContain(nome)
    }

    // A garantia estrutural: o módulo não busca esses dados. Não há campo a
    // esquecer de omitir, porque a tabela não é sequer importada.
    const fonte = readFileSync('src/db/indice.ts', 'utf8')
    const proibidas = [
      'avaliacoesDeObstaculo',
      'avaliacoesDeMudanca',
      'avaliacoesDaDefesa',
      'niveisDeAvaliacao',
      'incrementos',
      'eixos',
      'registrosDiarios',
      'respostasDeEscopo',
      'registrosDeDefesa',
    ]
    for (const tabela of proibidas) {
      expect(fonte).not.toContain(tabela)
    }

    // E o mesmo vale para a página: ela só chama a consulta do índice.
    const pagina = readFileSync('src/app/turma/[turmaId]/page.tsx', 'utf8')
    for (const tabela of proibidas) {
      expect(pagina).not.toContain(tabela)
    }
    expect(pagina).not.toMatch(/nota|avaliacao|incremento/i)

    // Sanidade: os dados existem no banco e mesmo assim não vazam.
    expect(await banco.db.select().from(repositorios)).toHaveLength(3)
    expect(c.ana.usuario.nome).toBe('Ana')
  })
})
