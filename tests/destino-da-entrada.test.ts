import { describe, expect, it } from 'vitest'

import { destinoSeguro } from '@/lib/destino'

/**
 * O `callbackUrl` da tela de entrada é entrada do cliente, e a tela de entrada é
 * o pior lugar do produto para um redirecionamento aberto: a origem que a pessoa
 * confere antes de clicar é a nossa, e o destino é de quem montou o link.
 *
 * Não é regra pedagógica, então não vive em `src/domain` — mas é integridade, e
 * por isso tem teste.
 */
describe('destino da entrada', () => {
  it('mantém caminho interno', () => {
    expect(destinoSeguro('/instrutor/turma/abc')).toBe('/instrutor/turma/abc')
    expect(destinoSeguro('/hoje')).toBe('/hoje')
  })

  it('cai no padrão quando não há destino', () => {
    expect(destinoSeguro(undefined)).toBe('/')
    expect(destinoSeguro(null)).toBe('/')
    expect(destinoSeguro('')).toBe('/')
    expect(destinoSeguro(undefined, '/hoje')).toBe('/hoje')
  })

  it('recusa destino absoluto', () => {
    expect(destinoSeguro('https://outro.site/entrar')).toBe('/')
    expect(destinoSeguro('http://outro.site')).toBe('/')
    expect(destinoSeguro('javascript:alert(1)')).toBe('/')
  })

  it('recusa as duas formas que parecem caminho e saem do domínio', () => {
    // Protocolo-relativo: o navegador completa com o esquema atual e vai embora.
    expect(destinoSeguro('//outro.site')).toBe('/')
    expect(destinoSeguro('//outro.site/hoje')).toBe('/')
    // Barra invertida: vários navegadores a normalizam para a segunda barra.
    expect(destinoSeguro('/\\outro.site')).toBe('/')
  })
})
