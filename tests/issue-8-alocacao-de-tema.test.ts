import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alocaTema, AlocacaoInvalida, temaDoGrupo } from '@/db/alocacao'
import { bancosDeTemas, grupos, temas, turmas } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 8 em
// docs/BACKLOG.md. SSOT: `D2-BANCO` · Doc 7 §2.4.

describe('Issue 8 — alocação de tema com unicidade', () => {
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
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Tema A', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Tema B', dificuldade: 'Fácil', trilha: 'padrao' },
      ])
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    return {
      curso,
      turma: turma!,
      temaA: temasCriados[0]!,
      temaB: temasCriados[1]!,
      grupoA: gruposCriados[0]!,
      grupoB: gruposCriados[1]!,
      grupoC: gruposCriados[2]!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('tema_pertence_a_no_maximo_um_grupo', async () => {
    const { curso, turma, temaA, grupoA, grupoB } = await cenario()

    await alocaTema(banco.db, grupoA.id, temaA.id)
    expect(await temaDoGrupo(banco.db, grupoA.id)).toBe(temaA.id)

    // O segundo grupo da MESMA turma não consegue o mesmo tema.
    await expect(alocaTema(banco.db, grupoB.id, temaA.id)).rejects.toThrow(AlocacaoInvalida)
    expect(await temaDoGrupo(banco.db, grupoB.id)).toBeNull()

    // A unicidade é POR TURMA: outra turma do mesmo curso usa o mesmo tema.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Outra turma' })
      .returning()
    const [grupoDaOutra] = await banco.db
      .insert(grupos)
      .values({ turmaId: outraTurma!.id })
      .returning()

    await alocaTema(banco.db, grupoDaOutra!.id, temaA.id)
    expect(await temaDoGrupo(banco.db, grupoDaOutra!.id)).toBe(temaA.id)

    // E vários grupos SEM tema convivem: o índice é parcial, e nulo não colide.
    const semTema = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma.id }, { turmaId: turma.id }])
      .returning()
    expect(semTema.every((g) => g.temaId === null)).toBe(true)
  })

  it('alocacao_de_tema_ocupado_falha', async () => {
    const { temaA, grupoA, grupoB } = await cenario()

    await alocaTema(banco.db, grupoA.id, temaA.id)

    // A mensagem é para o aluno ler, não código de erro do Postgres.
    const erro = await alocaTema(banco.db, grupoB.id, temaA.id).then(
      () => null,
      (e: unknown) => e,
    )

    expect(erro).toBeInstanceOf(AlocacaoInvalida)
    expect((erro as Error).message).toContain('outro grupo')
    expect((erro as Error).message).toContain('Escolha outro')

    // Grupo que já tem tema recebe mensagem DIFERENTE: o problema é outro, e
    // dizer "escolha outro tema" quando o erro é "você já escolheu" mandaria o
    // aluno para o lugar errado.
    const { temaB } = await cenario()
    const jaTem = await alocaTema(banco.db, grupoA.id, temaB.id).then(
      () => null,
      (e: unknown) => e,
    )
    expect(jaTem).toBeInstanceOf(AlocacaoInvalida)
    expect((jaTem as Error).message).toContain('já tem tema')
    expect((jaTem as Error).message).toContain('realocar')

    // E o tema do grupo A não mudou pela tentativa recusada.
    expect(await temaDoGrupo(banco.db, grupoA.id)).toBe(temaA.id)
  })

  it('alocacao_concorrente_resolve_para_um', async () => {
    const { temaA, grupoA, grupoB, grupoC } = await cenario()

    // Três grupos disputando o mesmo tema ao mesmo tempo. É o caso real: a
    // alocação acontece por negociação em sala, então todos clicam junto.
    const resultados = await Promise.allSettled([
      alocaTema(banco.db, grupoA.id, temaA.id),
      alocaTema(banco.db, grupoB.id, temaA.id),
      alocaTema(banco.db, grupoC.id, temaA.id),
    ])

    const venceram = resultados.filter((r) => r.status === 'fulfilled')
    const perderam = resultados.filter((r) => r.status === 'rejected')

    // EXATAMENTE UM vence. Não zero, não dois.
    expect(venceram).toHaveLength(1)
    expect(perderam).toHaveLength(2)

    // Quem perdeu recebe erro de regra, não estouro de banco cru.
    for (const derrota of perderam) {
      expect((derrota as PromiseRejectedResult).reason).toBeInstanceOf(AlocacaoInvalida)
    }

    // E o estado final tem um único grupo com o tema.
    const comTema = await banco.db.select().from(grupos).where(eq(grupos.temaId, temaA.id))
    expect(comTema).toHaveLength(1)
  })
})
