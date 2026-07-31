import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ehControleDeFluxoDoNext,
  NOMES_DE_ERRO_DE_REGRA,
  tenta,
  traduzErro,
} from '@/lib/erros'

/**
 * O guarda do tratamento de erro.
 *
 * O teste que mais importa é o da cobertura: uma classe de erro nova que ninguém
 * classificar cai no genérico em silêncio, e a mensagem específica que alguém
 * escreveu ao lado da regra nunca chega a ninguém. Só se descobre em aula.
 */
describe('tratamento de erro', () => {
  it('toda classe de erro do projeto está classificada', () => {
    const encontradas = new Set<string>()

    for (const pasta of ['src/db', 'src/domain', 'src/lib']) {
      for (const arquivo of readdirSync(pasta).filter((n) => n.endsWith('.ts'))) {
        const fonte = readFileSync(join(pasta, arquivo), 'utf8')
        for (const achado of fonte.matchAll(/class\s+(\w+)\s+extends\s+Error/g)) {
          encontradas.add(achado[1]!)
        }
      }
    }

    // Uma classe existe: se a varredura não achar nada, o teste está passando à toa.
    expect(encontradas.size).toBeGreaterThan(5)

    const naoClassificadas = [...encontradas].filter(
      (nome) => !NOMES_DE_ERRO_DE_REGRA.includes(nome),
    )

    expect(
      naoClassificadas,
      'classifique em src/lib/erros.ts, ou a mensagem escrita ao lado da regra nunca chega a ninguém',
    ).toEqual([])
  })

  it('erro de regra mostra a frase que a regra escreveu', () => {
    class EscopoInvalido extends Error {
      constructor(motivo: string) {
        super(motivo)
        this.name = 'EscopoInvalido'
      }
    }

    expect(traduzErro(new EscopoInvalido('Este tema já foi alocado a outro grupo.'))).toEqual({
      mensagem: 'Este tema já foi alocado a outro grupo.',
      tom: 'destaque',
    })
  })

  it('erro de autorização é bloqueio', () => {
    class NaoAutorizado extends Error {
      constructor(motivo: string) {
        super(motivo)
        this.name = 'NaoAutorizado'
      }
    }

    expect(traduzErro(new NaoAutorizado('somente o instrutor aprova')).tom).toBe('portao')
  })

  it('erro de infraestrutura nunca vaza a mensagem original', () => {
    const doDriver = new Error('No transactions support in neon-http driver')
    const aviso = traduzErro(doDriver)

    expect(aviso.mensagem).not.toContain('neon')
    expect(aviso.mensagem).not.toContain('driver')
    // E o que sobra tem de ser útil, não um "algo deu errado".
    expect(aviso.mensagem.length).toBeGreaterThan(40)
  })

  it('coisa que não é Error também cai no genérico', () => {
    expect(traduzErro('quebrou').mensagem).toBe(traduzErro(null).mensagem)
    expect(traduzErro({ qualquer: 'coisa' }).tom).toBe('destaque')
  })

  it('erro de regra sem mensagem não vira aviso vazio', () => {
    class EscopoInvalido extends Error {
      constructor() {
        super('   ')
        this.name = 'EscopoInvalido'
      }
    }

    // Cairia num aviso em branco, que é pior que o genérico.
    expect(traduzErro(new EscopoInvalido()).mensagem.length).toBeGreaterThan(40)
  })

  it('sessão expirada tem frase própria, e é bloqueio', () => {
    const aviso = traduzErro(new Error('Sessão expirada. Entre de novo.'))
    expect(aviso.tom).toBe('portao')
    expect(aviso.mensagem).toContain('Entre de novo')
  })

  it('tenta devolve o valor quando dá certo', async () => {
    await expect(tenta(async () => 42)).resolves.toEqual({ ok: true, valor: 42 })
  })

  it('tenta devolve o erro traduzido em vez de lançar', async () => {
    const resultado = await tenta(async () => {
      throw new Error('detalhe interno que ninguém deve ler')
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) throw new Error('deveria ter falhado')
    expect(resultado.erro.mensagem).not.toContain('detalhe interno')
  })

  it('tenta deixa a navegação do Next passar', async () => {
    const redirecionamento = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/entrar;307;',
    })

    expect(ehControleDeFluxoDoNext(redirecionamento)).toBe(true)
    await expect(
      tenta(async () => {
        throw redirecionamento
      }),
    ).rejects.toBe(redirecionamento)
  })

  it('erro comum não é confundido com navegação', () => {
    expect(ehControleDeFluxoDoNext(new Error('qualquer'))).toBe(false)
    expect(ehControleDeFluxoDoNext({ digest: 'outra-coisa' })).toBe(false)
  })
})
