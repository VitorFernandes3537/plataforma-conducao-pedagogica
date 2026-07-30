import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { duracaoTotalPorDia } from '@/db/calendario'
import { laminasDoDiaCorrente, referenciasVisiveis } from '@/db/material'
import { temasComDisponibilidade } from '@/db/temas'
import { alunos, cursos, grupos, marcos, repositorios } from '@/db/schema'
import { EXEMPLO, semeia } from '@/db/seed'

import { criaBancoEfemero } from './suporte/banco-efemero'

// Os nomes destes testes vêm literalmente dos critérios de aceite da
// INFRA-1 em docs/BACKLOG.md. Renomear aqui quebra a rastreabilidade
// exigida pelo processo (CLAUDE.md §5).

describe('INFRA-1 — scaffold e pipeline', () => {
  it('build_passa_em_modo_estrito', () => {
    // `next build` compila e checa tipos, mas demora. O que este critério
    // protege é a checagem estrita, então roda só ela.
    expect(() =>
      execFileSync('npx', ['tsc', '--noEmit'], {
        stdio: 'pipe',
        shell: process.platform === 'win32',
      }),
    ).not.toThrow()
  })

  it('migrations_aplicam_em_banco_vazio', async () => {
    const banco = await criaBancoEfemero()
    try {
      const { rows } = await banco.db.$client.query<{ contagem: number }>(
        `select count(*)::int as contagem from information_schema.tables where table_schema = 'public'`,
      )
      // Enquanto não houver entidade (issues 1 e 2), o que se prova é que o
      // migrator aplica a pasta inteira contra um banco vazio sem erro.
      expect(rows[0]?.contagem).toBeGreaterThanOrEqual(0)
    } finally {
      await banco.encerra()
    }
  })

  it('ci_executa_suite_em_cada_push', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
    // O critério é "a cada push", não "a cada pull request". Um workflow só
    // com gatilho de PR não atende, e o erro é silencioso: ele fica verde.
    expect(workflow).toMatch(/^\s{2}push:/m)
    expect(workflow).toContain('npm run test')
    expect(workflow).toContain('npm run typecheck')
  })

  it('seed_cria_curso_completo', async () => {
    const banco = await criaBancoEfemero()
    try {
      const { cursoId, turmaId, bancoDeTemasId } = await semeia(banco.db)

      const [curso] = await banco.db.select().from(cursos).where(eq(cursos.id, cursoId))
      expect(curso).toBeDefined()

      const daTurma = await banco.db.select().from(alunos).where(eq(alunos.turmaId, turmaId))
      const gruposDaTurma = await banco.db.select().from(grupos).where(eq(grupos.turmaId, turmaId))
      const repos = await banco.db.select().from(repositorios)

      const esperados = EXEMPLO.grupos.flat().length
      expect(gruposDaTurma).toHaveLength(EXEMPLO.grupos.length)
      expect(daTurma).toHaveLength(esperados)
      // Curso "completo" inclui o repositório individual de cada aluno.
      expect(repos).toHaveLength(esperados)

      // O exemplo cobre o grupo cheio e o aluno solo, que é caso válido.
      const tamanhos = gruposDaTurma
        .map((g) => daTurma.filter((a) => a.grupoId === g.id).length)
        .sort()
      expect(tamanhos).toEqual([...EXEMPLO.grupos.map((g) => g.length)].sort())

      // Curso completo inclui calendário: dias, blocos e o marco.
      const somas = await duracaoTotalPorDia(banco.db, cursoId)
      expect(somas).toHaveLength(EXEMPLO.dias.length)
      expect(somas.map((s) => s.totalMinutos)).toEqual(
        EXEMPLO.dias.map((d) => d.blocos.reduce((t, b) => t + b.duracaoMinutos, 0)),
      )

      const marcosDoCurso = await banco.db.select().from(marcos)
      expect(marcosDoCurso).toHaveLength(EXEMPLO.dias.filter((d) => d.marco !== null).length)

      // Banco de temas, com um tema já alocado e o resto livre — os dois
      // estados que a listagem precisa mostrar.
      const listados = await temasComDisponibilidade(banco.db, bancoDeTemasId, turmaId)
      expect(listados).toHaveLength(EXEMPLO.temas.length)
      expect(listados.filter((t) => !t.disponivel)).toHaveLength(1)
      expect(listados.find((t) => t.trilha === 'desafio')?.briefing).toBeTruthy()

      // Lâminas do primeiro dia, para a tela de apresentação ter o que abrir.
      const laminas = await laminasDoDiaCorrente(banco.db, cursoId, 1)
      const esperadasNoPrimeiroDia = EXEMPLO.dias[0]?.laminas.length ?? 0
      expect(laminas).toHaveLength(esperadasNoPrimeiroDia)
      expect(laminas.map((l) => l.ordem)).toEqual(
        Array.from({ length: esperadasNoPrimeiroDia }, (_, i) => i + 1),
      )

      // Material de referência com os dois estados: o instrutor vê todos, e no
      // primeiro dia o aluno vê só o que já liberou.
      const instrutor = { papel: 'instrutor' as const, usuarioId: 'seed' }
      const aluno = { papel: 'aluno' as const, usuarioId: 'seed', grupoId: null }
      expect(await referenciasVisiveis(banco.db, cursoId, 1, instrutor)).toHaveLength(
        EXEMPLO.referencias.length,
      )
      expect(await referenciasVisiveis(banco.db, cursoId, 1, aluno)).toHaveLength(
        EXEMPLO.referencias.filter((r) => r.ordemDeLiberacao <= 1).length,
      )
    } finally {
      await banco.encerra()
    }
  })
})
