/**
 * Marcas de rascunho.
 *
 * Traço de lápis desenhado em SVG, não ícone de biblioteca. As curvas têm
 * irregularidade proposital — assimetria, linha que passa do encontro, laço
 * que não fecha — porque traço perfeito lê como ícone e traço torto lê como
 * mão.
 *
 * Regra de uso (ADR 0003): marca vive na MARGEM e só onde espelha algo
 * físico. Nunca em superfície de decisão sob pressão, nunca no meio de
 * conteúdo, nunca carregando informação que só exista ali.
 */

type Props = {
  className?: string
  /** Cor do traço. Padrão: a tinta tênue, para ficar atrás do conteúdo. */
  cor?: string
}

const comum = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.6,
}

/** Obstáculo: um muro tosco, fiada desalinhada de propósito. */
export function MarcaObstaculo({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 84 62" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M4 56c11-1.5 23-2 35-1.5 13 .5 27 .3 41-1" />
      <path d="M6 43c12-1 25-1.4 38-1 12 .4 26 .2 38-1.2" />
      <path d="M5 30.5c13-1.2 26-1.6 39-1.2 12 .4 25 .1 37-1.3" />
      <path d="M8 18c11-1 23-1.3 35-.9 11 .3 24 .1 35-1.1" />
      <path d="M22 56.2 21 43.4M50 55.6l1.2-12.6M13 43.2 14 30.6M40 42.6l-.6-12.4M66 42.2l-.8-12" />
      <path d="M31 30 30 17.8M58 29.6l.6-12" />
    </svg>
  )
}

/** Mural: bilhete pregado, com a ponta enrolando. Espelha a parede física. */
export function MarcaBilhete({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 64 68" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M11 15.5c13-2.2 27-3 41-2.2 1.6 12.5 2.4 26 2 40.5-13.5 1.8-27 2.4-40.5 1.6-1.8-13-2.6-26.6-2.5-39.9Z" />
      <path d="M11.5 55.5c4.6.2 7.8-2.6 8-7.4-2.9 2.9-5.6 5.4-8 7.4Z" />
      <circle cx="32" cy="9" r="3.4" />
      <path d="M32 12.4v3.2" />
      <path d="M19 27.5c8-1 16.4-1.4 24.6-1M19.4 35c6.4-.8 13-1.2 19.6-1" />
    </svg>
  )
}

/** Seta curva de anotação: aponta para o que importa ao lado. */
export function MarcaSeta({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 72 46" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M5 9c14.5 1.5 28 7.5 38.5 17.5 5 4.8 9.5 8.5 14.5 10" />
      <path d="M58 36.5c-3-3.2-4.8-7-5.4-11.2M58 36.5c-4.4.6-8.4 2.2-11.8 4.6" />
    </svg>
  )
}

/** Faísca de quatro pontas. Marca de "isto é novo" ou "isto liberou". */
export function MarcaFaisca({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M17 3.5c.8 4.6 1.4 8.4 3.2 10.4 1.9 2 5.6 2.6 10.3 3.3-4.7.7-8.4 1.3-10.3 3.2-1.8 2-2.4 5.7-3.2 10.4-.7-4.7-1.3-8.4-3.2-10.4-1.9-1.9-5.6-2.5-10.3-3.2 4.7-.7 8.4-1.3 10.3-3.3 1.9-2 2.5-5.8 3.2-10.4Z" />
    </svg>
  )
}

/** Laço à mão em volta de algo. Não fecha, e é assim que se sabe que é mão. */
export function MarcaLaco({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 120 54" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M96 8.5C79 3 55.5 2 36 6.5 16.5 11 5 20 7.5 30.5c2.5 10.5 19 18 40.5 19.5 21.5 1.5 45-3 57-11 8.5-5.6 8.8-12.6 1-18.5-3.4-2.6-8-4.8-13.6-6.6" />
    </svg>
  )
}

/** Repositório como produto público: caixa aberta com algo saindo. */
export function MarcaProduto({ className, cor = 'currentColor' }: Props) {
  return (
    <svg viewBox="0 0 66 60" aria-hidden="true" className={className} stroke={cor} {...comum}>
      <path d="M9 27.5c7.8-1.6 16-2.2 24.5-1.8 8 .4 16 .1 23.5-1.2.8 8.6 1 17.4.4 26.2-8 1.4-16.4 2-25 1.6-7.8-.4-15.6-.1-22.8 1-.8-8.6-1-17.4-.6-25.8Z" />
      <path d="M9.5 27.5 20 15.5M56.5 24.5 46 13M33 26v27" />
      <path d="M20 15.5c8.4-1.4 17.4-1.8 26-1.4" />
    </svg>
  )
}
