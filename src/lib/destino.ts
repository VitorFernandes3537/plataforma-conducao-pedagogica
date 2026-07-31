/**
 * Destino seguro depois da entrada.
 *
 * O `callbackUrl` chega pela barra de endereço, então é entrada do cliente e
 * vale a regra de sempre: o que não for caminho interno vira o padrão. Sem isso,
 * um link com `callbackUrl=https://outro.site` transformaria a tela de entrada
 * em redirecionamento aberto — e redirecionamento aberto **na tela de login** é
 * o degrau clássico do phishing, justamente porque a origem que a pessoa confere
 * antes de clicar é a nossa.
 *
 * Três formas passam por caminho e não são: `//outro.site` é protocolo-relativo
 * e sai do domínio; `/\outro.site` é aceito por vários navegadores como o mesmo
 * truque; e `https://…` é externo na cara. As três caem no padrão.
 *
 * Mora fora de `acoes.ts` porque arquivo com `'use server'` só pode exportar
 * função assíncrona — e uma função pura exportada de lá viraria erro de build.
 */
export function destinoSeguro(bruto: string | null | undefined, padrao = '/'): string {
  if (!bruto) return padrao
  if (!bruto.startsWith('/')) return padrao
  if (bruto.startsWith('//') || bruto.startsWith('/\\')) return padrao
  return bruto
}
