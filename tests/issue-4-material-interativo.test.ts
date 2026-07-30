import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { laminasDoDia, laminasDoDiaCorrente, navega } from '@/db/material'
import { dias, materiaisInterativos } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 4 em
// docs/BACKLOG.md. SSOT: Doc 4, D1 · Doc 7 §2.1 e §6.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 4 — slides interativos de abertura', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const criados = await banco.db
      .insert(dias)
      .values([
        { cursoId: curso.id, ordem: 1 },
        { cursoId: curso.id, ordem: 2 },
      ])
      .returning()
    return { curso, primeiroDia: criados[0]!, segundoDia: criados[1]! }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('material_interativo_pertence_a_um_dia', async () => {
    const { primeiroDia, segundoDia } = await cenario()

    await banco.db.insert(materiaisInterativos).values([
      { diaId: primeiroDia.id, ordem: 1, titulo: 'Abertura', conteudo: '# Bem-vindos' },
      { diaId: segundoDia.id, ordem: 1, titulo: 'Outro dia', conteudo: '# Outro' },
    ])

    // Cada lâmina pertence a UM dia, e o conjunto de um dia não vaza no outro.
    expect(await laminasDoDia(banco.db, primeiroDia.id)).toHaveLength(1)
    expect((await laminasDoDia(banco.db, primeiroDia.id))[0]?.titulo).toBe('Abertura')
    expect(await laminasDoDia(banco.db, segundoDia.id)).toHaveLength(1)

    // Dia inexistente não é erro: é conjunto vazio.
    expect(await laminasDoDia(banco.db, primeiroDia.id.replace(/.$/, '0'))).toHaveLength(0)

    // Apagar o dia leva as lâminas com ele — material órfão não existe.
    await banco.db.delete(dias).where(eq(dias.id, primeiroDia.id))
    expect(await laminasDoDia(banco.db, primeiroDia.id)).toHaveLength(0)
  })

  it('aluno_abre_material_do_dia', async () => {
    const { curso, primeiroDia, segundoDia } = await cenario()

    // Inseridas fora de ordem de propósito: a sequência é do dado.
    await banco.db.insert(materiaisInterativos).values([
      { diaId: primeiroDia.id, ordem: 3, titulo: 'Fechamento', conteudo: 'c' },
      { diaId: primeiroDia.id, ordem: 1, titulo: 'Conversa de abertura', conteudo: 'a' },
      { diaId: primeiroDia.id, ordem: 2, titulo: 'Paradigmas', conteudo: 'b' },
      { diaId: segundoDia.id, ordem: 1, titulo: 'Do dia seguinte', conteudo: 'z' },
    ])

    const doDia = await laminasDoDiaCorrente(banco.db, curso.id, 1)

    expect(doDia.map((l) => l.ordem)).toEqual([1, 2, 3])
    expect(doDia.map((l) => l.titulo)).toEqual([
      'Conversa de abertura',
      'Paradigmas',
      'Fechamento',
    ])
    // O material do dia seguinte não aparece.
    expect(doDia.map((l) => l.titulo)).not.toContain('Do dia seguinte')

    // Dia sem material é estado válido, não erro: o instrutor pode não ter
    // cadastrado nada ainda.
    expect(await laminasDoDiaCorrente(banco.db, curso.id, 9)).toHaveLength(0)

    // Duas lâminas na mesma posição do mesmo dia não existem.
    await expect(
      banco.db
        .insert(materiaisInterativos)
        .values({ diaId: primeiroDia.id, ordem: 1, titulo: 'Duplicada', conteudo: 'x' }),
    ).rejects.toThrow()
  })

  it('instrutor_navega_em_modo_apresentacao', () => {
    const total = 3

    // Do começo só se avança.
    expect(navega(0, total, 'proxima')).toEqual({
      indice: 1,
      temAnterior: true,
      temProxima: true,
    })
    expect(navega(0, total, 'anterior')).toEqual({
      indice: 0,
      temAnterior: false,
      temProxima: true,
    })

    // No fim só se volta — e a navegação não estoura o limite.
    expect(navega(2, total, 'proxima')).toEqual({
      indice: 2,
      temAnterior: true,
      temProxima: false,
    })
    expect(navega(2, total, 'anterior')).toEqual({
      indice: 1,
      temAnterior: true,
      temProxima: true,
    })

    // Conjunto vazio não quebra a navegação.
    expect(navega(0, 0, 'proxima')).toEqual({
      indice: 0,
      temAnterior: false,
      temProxima: false,
    })
    // Lâmina única não tem para onde ir.
    expect(navega(0, 1, 'proxima')).toEqual({
      indice: 0,
      temAnterior: false,
      temProxima: false,
    })
  })

  it('plataforma_nao_gera_conteudo_pedagogico', () => {
    // Doc 7 §6. Nenhum conteúdo de aula embutido no código: o material é dado
    // que o instrutor cadastra. O que existe aqui é estrutura.
    const fontes = ['src/db/material.ts', 'src/db/schema/index.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')

    expect(fontes).not.toMatch(/\b(paradigma|polimorfismo|encapsulamento|heranca|herança)\b/i)
  })
})
