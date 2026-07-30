import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bancosDeTemas, grupos, temas, turmas } from '@/db/schema'
import { temasComDisponibilidade } from '@/db/temas'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 3 em
// docs/BACKLOG.md. SSOT: `D2-BANCO` · `D2-BRIEFING` · `D2-TRILHAS`.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 3 — BancoDeTemas com dificuldade, trilha e briefing', () => {
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
    return { curso, turma: turma!, bancoDeTemas: bancoDeTemas! }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('exibe_todos_os_temas_cadastrados', async () => {
    const { turma, bancoDeTemas } = await cenario()

    // Rótulos de dificuldade arbitrários de propósito: são dado, não enum.
    await banco.db.insert(temas).values([
      { bancoDeTemasId: bancoDeTemas.id, nome: 'Alfa', dificuldade: 'Fácil', trilha: 'padrao' },
      { bancoDeTemasId: bancoDeTemas.id, nome: 'Beta', dificuldade: 'Médio', trilha: 'padrao' },
      {
        bancoDeTemasId: bancoDeTemas.id,
        nome: 'Gama',
        dificuldade: 'Insano',
        trilha: 'desafio',
        briefing: 'Briefing do Gama',
      },
    ])

    const listados = await temasComDisponibilidade(banco.db, bancoDeTemas.id, turma.id)

    // "Todos" é literal: nada é filtrado por dificuldade nem por trilha.
    expect(listados).toHaveLength(3)
    expect(listados.map((t) => t.nome)).toEqual(['Alfa', 'Beta', 'Gama'])
    expect(listados.map((t) => t.dificuldade)).toEqual(['Fácil', 'Médio', 'Insano'])
    expect(listados.map((t) => t.trilha)).toEqual(['padrao', 'padrao', 'desafio'])
  })

  it('tema_desafio_exibe_briefing', async () => {
    const { turma, bancoDeTemas } = await cenario()

    await banco.db.insert(temas).values([
      { bancoDeTemasId: bancoDeTemas.id, nome: 'Comum', dificuldade: 'Fácil', trilha: 'padrao' },
      {
        bancoDeTemasId: bancoDeTemas.id,
        nome: 'Fora da curva',
        dificuldade: 'Difícil',
        trilha: 'desafio',
        briefing: 'O que a organização faz, quem solicita, etapas, recurso escasso.',
      },
    ])

    const listados = await temasComDisponibilidade(banco.db, bancoDeTemas.id, turma.id)
    const desafio = listados.find((t) => t.trilha === 'desafio')
    const padrao = listados.find((t) => t.trilha === 'padrao')

    expect(desafio?.briefing).toContain('recurso escasso')
    // Trilha padrão não exige briefing — não há janela de pesquisa a mitigar.
    expect(padrao?.briefing).toBeNull()

    // Desafio SEM briefing é rejeitado pelo banco: sem janela de pesquisa
    // prévia, o briefing é o que substitui a pesquisa (Doc 2 §3.4).
    const erro = await banco.db
      .insert(temas)
      .values({
        bancoDeTemasId: bancoDeTemas.id,
        nome: 'Desafio sem briefing',
        dificuldade: 'Difícil',
        trilha: 'desafio',
      })
      .then(
        () => null,
        (e: unknown) => e,
      )

    expect(erro).toBeInstanceOf(Error)
    expect(causaDe(erro)).toMatch(/desafio_exige_briefing/)
  })

  it('tema_alocado_aparece_indisponivel', async () => {
    const { curso, turma, bancoDeTemas } = await cenario()

    const criados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: bancoDeTemas.id, nome: 'Livre', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas.id, nome: 'Tomado', dificuldade: 'Fácil', trilha: 'padrao' },
      ])
      .returning()

    await banco.db.insert(grupos).values({ turmaId: turma.id, temaId: criados[1]!.id })

    const listados = await temasComDisponibilidade(banco.db, bancoDeTemas.id, turma.id)
    const porNome = new Map(listados.map((t) => [t.nome, t]))

    expect(porNome.get('Livre')?.disponivel).toBe(true)
    expect(porNome.get('Tomado')?.disponivel).toBe(false)
    // Indisponível continua LISTADO — o aluno precisa ver que existe e já foi.
    expect(listados).toHaveLength(2)

    // A indisponibilidade é por turma: outra turma do mesmo curso vê livre.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Outra turma' })
      .returning()

    const naOutra = await temasComDisponibilidade(banco.db, bancoDeTemas.id, outraTurma!.id)
    expect(naOutra.every((t) => t.disponivel)).toBe(true)
  })

  it('quantidade_de_temas_nao_e_constante', async () => {
    const { turma, bancoDeTemas } = await cenario()

    const quantidade = 4
    await banco.db.insert(temas).values(
      Array.from({ length: quantidade }, (_, i) => ({
        bancoDeTemasId: bancoDeTemas.id,
        nome: `Tema ${i + 1}`,
        dificuldade: 'Fácil',
        trilha: 'padrao' as const,
      })),
    )

    expect(await temasComDisponibilidade(banco.db, bancoDeTemas.id, turma.id)).toHaveLength(
      quantidade,
    )

    // Banco vazio é estado válido, não erro.
    const outroCenario = await cenario()
    expect(
      await temasComDisponibilidade(banco.db, outroCenario.bancoDeTemas.id, outroCenario.turma.id),
    ).toHaveLength(0)

    // Nenhuma contagem de temas no código — 18 é o número deste curso.
    const fontes = ['src/db/schema/index.ts', 'src/db/temas.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/\b18\b/)
  })

  it('trilha_desafio_e_padrao_sao_os_unicos_valores', async () => {
    const { bancoDeTemas } = await cenario()

    await expect(
      banco.db.execute(
        `insert into temas (banco_de_temas_id, nome, dificuldade, trilha)
         values ('${bancoDeTemas.id}', 'X', 'Fácil', 'intermediaria')`,
      ),
    ).rejects.toThrow()
  })
})
