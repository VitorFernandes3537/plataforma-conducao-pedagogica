import type { AvisoDeErro } from '@/lib/erros'

import { Aviso } from './estado'

/**
 * O que a pessoa vê quando uma ação falha.
 *
 * Um componente só, para o erro ter a mesma forma em toda tela. Antes cada
 * cliente montava o seu — uma linha de `legenda` vermelha aqui, um `Aviso` ali —
 * e o mesmo tipo de falha aparecia com peso diferente dependendo de onde
 * acontecia.
 *
 * O tom vem do erro, não da tela: quem decide se aquilo é bloqueio ou recado é
 * `src/lib/erros.ts`, que é onde a classificação mora.
 */
export function ErroDaAcao({
  erro,
  className = '',
}: {
  erro: AvisoDeErro | null
  className?: string
}) {
  if (!erro) return null

  return (
    <Aviso tom={erro.tom} className={`max-w-[62ch] ${className}`}>
      {erro.mensagem}
    </Aviso>
  )
}
