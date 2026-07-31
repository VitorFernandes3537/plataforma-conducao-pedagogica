type Props = {
  children: React.ReactNode
  /** Sobrancelha em monoespaçada. É rótulo de seção, não título. */
  legenda?: string
  /** Contagem exibida ao lado da legenda, em tabular. */
  contagem?: number
  /** Ação alinhada à direita da legenda. */
  acao?: React.ReactNode
  /** Filete de bloqueio na borda esquerda. Nunca fundo colorido. */
  bloqueado?: boolean
  /** Sem preenchimento interno — para quando o filho controla o espaçamento. */
  cru?: boolean
  className?: string
}

/**
 * Cartão.
 *
 * A superfície sólida onde todo conteúdo legível vive. Filete e raio, nunca
 * sombra: a profundidade vem do contraste com o papel, não de elevação.
 */
export function Cartao({
  children,
  legenda,
  contagem,
  acao,
  bloqueado = false,
  cru = false,
  className = '',
}: Props) {
  return (
    <section
      className={`cartao ${cru ? 'overflow-hidden' : 'px-5 py-4'} ${className}`}
      style={
        bloqueado
          ? { borderLeftWidth: '3px', borderLeftColor: 'var(--color-portao)' }
          : undefined
      }
    >
      {(legenda || acao) && (
        <header
          className={`flex items-baseline justify-between gap-3 ${cru ? 'border-b border-linha px-5 py-3' : 'mb-3'}`}
        >
          {legenda && (
            <h3 className="legenda flex items-baseline gap-2">
              {legenda}
              {contagem !== undefined && (
                <span className="dado normal-case tracking-normal text-tinta">{contagem}</span>
              )}
            </h3>
          )}
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

/**
 * Linha de lista dentro de cartão.
 *
 * Filete entre itens, nunca no último. É o padrão de toda lista do sistema —
 * material do dia, obrigações, temas — para que elas não divirjam em detalhe.
 */
export function Linha({
  children,
  fim,
  className = '',
}: {
  children: React.ReactNode
  /** Conteúdo alinhado à direita: estado, duração, meta. */
  fim?: React.ReactNode
  className?: string
}) {
  return (
    <li
      // `break-inside-avoid` para a linha não ser partida ao meio quando a lista
      // está em duas colunas — metade do nome numa coluna e o alvo na outra.
      className={`flex break-inside-avoid items-baseline justify-between gap-4 border-b border-linha py-2.5 last:border-b-0 ${className}`}
    >
      <span className="min-w-0">{children}</span>
      {fim && <span className="shrink-0">{fim}</span>}
    </li>
  )
}
