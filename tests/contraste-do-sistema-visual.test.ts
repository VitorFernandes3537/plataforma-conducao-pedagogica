import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * Guarda de contraste sobre os tokens de cor da ADR 0003.
 *
 * Existe porque nada no repositório olhava para isto. A suíte não testa JSX de
 * propósito (CLAUDE.md §7) — teste de renderização quebra a cada ajuste de
 * layout e não pega o que importa. Contraste é o oposto: é aritmética sobre
 * dois hex, não muda quando o layout muda, e falha em silêncio até alguém não
 * conseguir ler a tela.
 *
 * A primeira execução achou sete pares fora do mínimo, dois deles em texto de
 * dez pixels. Ler o token do CSS em vez de repetir o valor aqui é o ponto: o
 * teste segue a paleta quando ela mudar, em vez de virar cópia envelhecida.
 */
const CSS = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8')

function token(nome: string): string {
  const achado = CSS.match(new RegExp(String.raw`--color-${nome}:\s*(#[0-9a-fA-F]{6})`))
  const valor = achado?.[1]
  if (!valor) throw new Error(`Token --color-${nome} não existe em globals.css`)
  return valor
}

const canal = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = canal(((n >> 16) & 255) / 255)
  const g = canal(((n >> 8) & 255) / 255)
  const b = canal((n & 255) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste da WCAG 2.1, sempre ≥ 1. */
function razao(frente: string, fundo: string): number {
  const a = luminancia(frente)
  const b = luminancia(fundo)
  const claro = Math.max(a, b)
  const escuro = Math.min(a, b)
  return (claro + 0.05) / (escuro + 0.05)
}

/**
 * Pares que a interface REALMENTE usa, e só eles.
 *
 * Combinar toda tinta com toda superfície geraria falha em par que ninguém
 * desenha — e guarda que reclama do que não existe é guarda que se desliga.
 */
const TEXTO: ReadonlyArray<[string, string, string]> = [
  ['corpo sobre papel', 'tinta', 'papel'],
  ['corpo dentro de cartão', 'tinta', 'superficie'],
  ['secundário sobre papel', 'tinta-media', 'papel'],
  ['terciário sobre papel', 'tinta-fraca', 'papel'],
  ['terciário sobre recuo', 'tinta-fraca', 'recuo'],
  ['destaque sobre papel', 'destaque', 'papel'],
  ['destaque dentro da pílula', 'destaque', 'destaque-tenue'],
  ['rótulo do botão de ação', 'superficie', 'acao'],
]

/** WCAG 1.4.11: elemento não textual que carrega estado pede 3:1. */
const NAO_TEXTO: ReadonlyArray<[string, string, string]> = [
  ['anel de foco', 'destaque', 'papel'],
  ['filete de portão', 'portao', 'portao-tenue'],
]

describe('contraste do sistema visual', () => {
  it.each(TEXTO)('texto: %s atinge 4.5:1', (_nome, frente, fundo) => {
    expect(razao(token(frente), token(fundo))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(NAO_TEXTO)('não textual: %s atinge 3:1', (_nome, frente, fundo) => {
    expect(razao(token(frente), token(fundo))).toBeGreaterThanOrEqual(3)
  })

  /**
   * `tinta-tenue` fica em 2.31:1 e continua na paleta de propósito: ela é para
   * traço de SVG e anotação de margem, nunca para texto de interface. O teste
   * trava o uso, não o valor — quando ela reaparecer como cor de texto, é aqui
   * que a conversa acontece.
   */
  it('a tinta mais fraca não volta a ser cor de texto', () => {
    expect(razao(token('tinta-tenue'), token('papel'))).toBeLessThan(4.5)
  })

  /**
   * Dois pares ficam FORA das listas acima, e o motivo precisa estar escrito
   * aqui e não só no relatório de quem rodou a auditoria.
   *
   * `portao` sobre `papel` dá 4.00:1 e sobre a própria pílula 3.56:1 — reprova.
   * É a cor do estado que bloqueia, então é a pior de todas para ficar difícil
   * de ler. O conserto é #dc4b1e → #bf411a, que passa em 4.53:1 no pior caso,
   * mas escurece um acento que o dono do curso escolheu por rodadas. Palete é
   * decisão dele, não minha, e teste vermelho não é lugar de guardar pergunta.
   *
   * `linha` sobre `papel` dá 1.25:1. Não entra porque a 1.4.11 fala de
   * componente e estado, e filete de cartão não é nem um nem outro. Levá-lo a
   * 3:1 pediria #a09164 — uma linha verde-oliva grossa no lugar de um fio.
   */
  it.todo('portão atinge 4.5:1 — pende escolher entre #dc4b1e e #bf411a')
})
