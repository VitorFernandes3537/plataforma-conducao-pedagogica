type Props = {
  /** Sobrancelha em monoespaçada. Diz onde a pessoa está. */
  legenda: string
  /** Título em serifada: é voz, não rótulo. */
  titulo: React.ReactNode
  children?: React.ReactNode
  /** Ações da tela, alinhadas à direita. Uma delas, no máximo, é `acao`. */
  acoes?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho de tela.
 *
 * O título vai em serifada porque é a voz da tela. A sobrancelha em
 * monoespaçada responde "onde estou" antes de o olho chegar ao título.
 */
export function Cabecalho({ legenda, titulo, children, acoes, className = '' }: Props) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <p className="legenda">{legenda}</p>
        <h1 className="mt-1.5 max-w-[30ch] font-prosa text-2xl leading-tight tracking-tight text-tinta">
          {titulo}
        </h1>
        {children && (
          <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-tinta-media">
            {children}
          </p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}

/**
 * Pílula atrás de uma palavra — o device tipográfico da casa.
 *
 * Envolve UMA palavra do título para dar peso, como marca-texto. Duas pílulas
 * no mesmo título anulam o efeito.
 */
export function Destaque({ children }: { children: React.ReactNode }) {
  return <span className="pilula">{children}</span>
}
