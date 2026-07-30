import { readFileSync } from 'node:fs'

import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { duracaoTotalPorDia } from '@/db/calendario'
import { blocos, dias, marcos } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 2 em
// docs/BACKLOG.md. SSOT: `D4-CALENDARIO` · `D4-RITMO` · `D4-MARCOS`.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 2 — modelo genérico: Dia, Bloco, Marco', () => {
  let banco: BancoEfemero

  async function novoCurso(nome = 'Curso') {
    return criaCurso(banco, { nome })
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('dia_tem_blocos_ordenados', async () => {
    const curso = await novoCurso()
    const [dia] = await banco.db
      .insert(dias)
      .values({ cursoId: curso.id, ordem: 1 })
      .returning()

    // Inseridos fora de ordem de propósito: a ordem é do dado, não da inserção.
    await banco.db.insert(blocos).values([
      { diaId: dia!.id, ordem: 3, duracaoMinutos: 30, tipo: 'demonstracao' },
      { diaId: dia!.id, ordem: 1, duracaoMinutos: 20, tipo: 'abertura' },
      { diaId: dia!.id, ordem: 2, duracaoMinutos: 40, tipo: 'tentativa' },
    ])

    const emOrdem = await banco.db
      .select()
      .from(blocos)
      .where(eq(blocos.diaId, dia!.id))
      .orderBy(asc(blocos.ordem))

    expect(emOrdem.map((b) => b.ordem)).toEqual([1, 2, 3])
    expect(emOrdem.map((b) => b.tipo)).toEqual(['abertura', 'tentativa', 'demonstracao'])
    expect(emOrdem.map((b) => b.duracaoMinutos)).toEqual([20, 40, 30])

    // Duas vagas iguais na mesma ordem não existem.
    await expect(
      banco.db
        .insert(blocos)
        .values({ diaId: dia!.id, ordem: 1, duracaoMinutos: 10, tipo: 'outro' }),
    ).rejects.toThrow()

    // Duração precisa ser positiva.
    await expect(
      banco.db
        .insert(blocos)
        .values({ diaId: dia!.id, ordem: 9, duracaoMinutos: 0, tipo: 'outro' }),
    ).rejects.toThrow()
  })

  it('marco_tem_tipo_duro_ou_triagem', async () => {
    const curso = await novoCurso()
    const criados = await banco.db
      .insert(dias)
      .values([
        { cursoId: curso.id, ordem: 1 },
        { cursoId: curso.id, ordem: 2 },
        { cursoId: curso.id, ordem: 3 },
      ])
      .returning()

    // Doc 4 §4: o marco pendura no DIA, não no bloco (Doc 7 §2.1, v1.3).
    await banco.db.insert(marcos).values([
      { diaId: criados[0]!.id, nome: 'Contrato aprovado', tipo: 'duro' },
      { diaId: criados[1]!.id, nome: 'Triagem intermediária', tipo: 'triagem' },
    ])

    const todos = await banco.db.select().from(marcos)
    expect(todos.map((m) => m.tipo).sort()).toEqual(['duro', 'triagem'])

    // Marco é opcional: o terceiro dia não tem.
    const semMarco = await banco.db.select().from(marcos).where(eq(marcos.diaId, criados[2]!.id))
    expect(semMarco).toHaveLength(0)

    // Um dia tem no máximo um marco.
    await expect(
      banco.db.insert(marcos).values({ diaId: criados[0]!.id, nome: 'Outro', tipo: 'triagem' }),
    ).rejects.toThrow()

    // Tipo fora do enum é rejeitado pelo banco.
    await expect(
      banco.db.execute(
        `insert into marcos (dia_id, nome, tipo) values ('${criados[2]!.id}', 'X', 'suave')`,
      ),
    ).rejects.toThrow()
  })

  it('numero_de_dias_e_configuravel', async () => {
    // Dois cursos com contagens diferentes, e nenhuma delas é 15.
    const curtoTotal = 3
    const longoTotal = 22

    const curto = await novoCurso('Curso curto')
    const longo = await novoCurso('Curso longo')

    await banco.db.insert(dias).values(
      Array.from({ length: curtoTotal }, (_, i) => ({ cursoId: curto.id, ordem: i + 1 })),
    )
    await banco.db.insert(dias).values(
      Array.from({ length: longoTotal }, (_, i) => ({ cursoId: longo.id, ordem: i + 1 })),
    )

    expect(await banco.db.select().from(dias).where(eq(dias.cursoId, curto.id))).toHaveLength(
      curtoTotal,
    )
    expect(await banco.db.select().from(dias).where(eq(dias.cursoId, longo.id))).toHaveLength(
      longoTotal,
    )

    // Nenhum literal de contagem de dias no CÓDIGO. Comentário é removido
    // antes: prosa explicando a regra não é violação da regra.
    const fontes = ['src/db/schema/index.ts', 'src/db/calendario.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/\b15\b/)

    // A ordem é única por curso, e dois cursos podem ter o mesmo número de dia.
    await expect(
      banco.db.insert(dias).values({ cursoId: curto.id, ordem: 1 }),
    ).rejects.toThrow()
  })

  it('soma_das_duracoes_por_dia', async () => {
    const curso = await novoCurso()
    const criados = await banco.db
      .insert(dias)
      .values([
        { cursoId: curso.id, ordem: 1 },
        { cursoId: curso.id, ordem: 2 },
      ])
      .returning()

    await banco.db.insert(blocos).values([
      { diaId: criados[0]!.id, ordem: 1, duracaoMinutos: 20, tipo: 'abertura' },
      { diaId: criados[0]!.id, ordem: 2, duracaoMinutos: 40, tipo: 'tentativa' },
      { diaId: criados[0]!.id, ordem: 3, duracaoMinutos: 30, tipo: 'demonstracao' },
      { diaId: criados[0]!.id, ordem: 4, duracaoMinutos: 75, tipo: 'implementacao' },
      { diaId: criados[0]!.id, ordem: 5, duracaoMinutos: 15, tipo: 'fechamento' },
    ])

    const somas = await duracaoTotalPorDia(banco.db, curso.id)

    expect(somas).toHaveLength(2)
    expect(somas[0]).toEqual({ diaId: criados[0]!.id, ordem: 1, totalMinutos: 180 })
    // Dia sem bloco soma zero, e não desaparece do resultado.
    expect(somas[1]).toEqual({ diaId: criados[1]!.id, ordem: 2, totalMinutos: 0 })
  })
})
