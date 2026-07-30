type Tom = 'neutro' | 'destaque' | 'portao' | 'tinta'

type Props = {
  children: React.ReactNode
  tom?: Tom
  /** Contorno tracejado. Usado por marco de triagem, que não é bloqueio duro. */
  tracejada?: boolean
  className?: string
}

/**
 * Etiqueta de estado.
 *
 * Sempre em monoespaçada caixa-alta: é rótulo de máquina, não prosa. O tom
 * carrega a função — `portao` só aparece em bloqueio, e `destaque` nunca é
 * usado para "importante genérico", senão perde o significado.
 */
export function Etiqueta({ children, tom = 'neutro', tracejada = false, className = '' }: Props) {
  const estilo =
    tom === 'portao'
      ? { borderColor: 'var(--color-portao)', color: 'var(--color-portao)' }
      : tom === 'destaque'
        ? { borderColor: 'var(--color-destaque)', color: 'var(--color-destaque)' }
        : tom === 'tinta'
          ? { borderColor: 'var(--color-tinta)', color: 'var(--color-tinta)' }
          : { borderColor: 'var(--color-linha-forte)', color: 'var(--color-tinta-media)' }

  return (
    <span
      className={`etiqueta border ${tracejada ? 'border-dashed' : ''} ${className}`}
      style={estilo}
    >
      {children}
    </span>
  )
}

/**
 * Etiqueta preenchida, para quando o estado precisa de mais peso que contorno.
 * Reservada ao destaque: preencher com portão colocaria texto sobre vermelho.
 */
export function EtiquetaCheia({ children, className = '' }: Omit<Props, 'tom' | 'tracejada'>) {
  return (
    <span className={`etiqueta bg-destaque-tenue text-destaque ${className}`}>{children}</span>
  )
}
