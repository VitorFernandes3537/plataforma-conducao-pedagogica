import { describe, expect, it } from 'vitest'

import { analisa, secoes, textoDe, trechosDaLinha } from '@/lib/markdown'

/**
 * O analisador é puro e é o único lugar do projeto que lê markdown. Bug aqui
 * some no meio de uma aula — o slide fica torto e ninguém sabe se é o conteúdo
 * ou o código —, e é por isso que ele tem teste apesar de não ser regra de
 * negócio nem consulta.
 *
 * Os casos vêm do que o Doc 11 usa de fato, não do que o CommonMark admite.
 */
describe('markdown', () => {
  it('quebra ênfase em linha, e código antes de negrito', () => {
    expect(trechosDaLinha('o **local** da lógica')).toEqual([
      { tipo: 'texto', texto: 'o ' },
      { tipo: 'forte', texto: 'local' },
      { tipo: 'texto', texto: ' da lógica' },
    ])

    // Código primeiro: uma fórmula com asteriscos dentro de crase não pode
    // virar negrito e engolir a crase.
    expect(trechosDaLinha('use `a ** b` aqui')).toEqual([
      { tipo: 'texto', texto: 'use ' },
      { tipo: 'codigo', texto: 'a ** b' },
      { tipo: 'texto', texto: ' aqui' },
    ])
  })

  it('separa título, parágrafo e lista', () => {
    const nos = analisa('# Tese\n\nUma frase só.\nE a continuação dela.\n\n- primeiro\n- segundo')

    expect(nos.map((n) => n.tipo)).toEqual(['titulo', 'paragrafo', 'lista'])
    expect(nos[0]).toMatchObject({ nivel: 1 })

    const paragrafo = nos[1]
    const lista = nos[2]
    if (paragrafo?.tipo !== 'paragrafo' || lista?.tipo !== 'lista') {
      throw new Error('o analisador não devolveu parágrafo e lista')
    }

    // Linhas seguidas viram um parágrafo, não dois.
    expect(textoDe(paragrafo.conteudo)).toBe('Uma frase só. E a continuação dela.')
    expect(lista.itens).toHaveLength(2)
  })

  it('lista ordenada não se mistura com a não ordenada', () => {
    const nos = analisa('1. um\n2. dois\n- outro')
    expect(nos.map((n) => n.tipo)).toEqual(['lista', 'lista'])
    expect(nos[0]).toMatchObject({ ordenada: true })
    expect(nos[1]).toMatchObject({ ordenada: false })
  })

  it('bloco de código é literal, inclusive o que pareceria marcação', () => {
    const nos = analisa('```ts\n// # não é título\nconst a = `x`\n```\n\ndepois')

    expect(nos[0]).toEqual({
      tipo: 'codigo',
      lingua: 'ts',
      linhas: ['// # não é título', 'const a = `x`'],
    })
    expect(nos[1]?.tipo).toBe('paragrafo')
  })

  it('cerca de código sem fechamento não engole o resto em silêncio', () => {
    const nos = analisa('```\nsó isto')
    expect(nos).toHaveLength(1)
    expect(nos[0]).toMatchObject({ tipo: 'codigo', linhas: ['só isto'] })
  })

  it('tabela descarta o separador e mantém as células', () => {
    const nos = analisa(
      '| | Imperativo | OO |\n|---|---|---|\n| **Controle** | Cada passo | Cada objeto |',
    )

    const tabela = nos[0]
    if (tabela?.tipo !== 'tabela') throw new Error('o analisador não devolveu tabela')

    expect(tabela.cabecalho).toHaveLength(3)
    // O separador não vira linha de conteúdo.
    expect(tabela.linhas).toHaveLength(1)
    expect(textoDe(tabela.linhas[0]![0]!)).toBe('Controle')
  })

  it('citação junta linhas e separa parágrafos pela linha vazia', () => {
    const nos = analisa('> Primeira parte\n> ainda a primeira\n>\n> Segunda parte')
    const citacao = nos[0]
    if (citacao?.tipo !== 'citacao') throw new Error('o analisador não devolveu citação')

    expect(citacao.paragrafos).toHaveLength(2)
    expect(textoDe(citacao.paragrafos[0]!)).toBe('Primeira parte ainda a primeira')
  })

  it('divide em seções por título de nível 2, sem seção fantasma', () => {
    const divisao = secoes(analisa('abertura\n\n## Forças\n- uma\n\n## Limites\n- outra'))

    expect(divisao.abertura).toHaveLength(1)
    expect(divisao.secoes).toHaveLength(2)
    expect(textoDe(divisao.secoes[0]!.titulo)).toBe('Forças')
    expect(divisao.secoes[1]!.corpo).toHaveLength(1)
  })

  it('markdown vazio não vira nó nenhum', () => {
    expect(analisa('')).toEqual([])
    expect(analisa('\n\n   \n')).toEqual([])
  })
})
