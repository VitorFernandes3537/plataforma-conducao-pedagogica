import type { ButtonHTMLAttributes } from 'react'

type Variante = 'acao' | 'fantasma' | 'texto' | 'portao'

const CLASSE: Record<Variante, string> = {
  acao: 'botao-acao',
  fantasma: 'botao-fantasma',
  texto: 'botao-texto',
  portao: 'botao-portao',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  /** Encolhe para barra de ferramentas e linha de tabela. */
  compacto?: boolean
}

/**
 * Botão.
 *
 * `acao` é tinta cheia e existe **uma por tela** — é o que a torna
 * encontrável. Todo o resto defere: `fantasma` tem filete, `texto` não tem
 * nada, e `portao` é contorno de bloqueio, raro por definição.
 *
 * O rótulo diz o que acontece — "Aprovar escopo", não "Enviar" — e mantém o
 * mesmo nome até o fim do fluxo.
 */
export function Botao({
  variante = 'fantasma',
  compacto = false,
  className = '',
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={`botao ${CLASSE[variante]} ${compacto ? 'px-2.5 py-1 text-[0.8125rem]' : ''} ${className}`}
      {...resto}
    />
  )
}
