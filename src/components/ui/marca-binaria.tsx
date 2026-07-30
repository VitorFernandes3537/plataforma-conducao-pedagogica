type Props = {
  cumprido: boolean
  /** Aumenta a área de toque quando a marca é interativa. */
  tamanho?: 'normal' | 'grande'
}

/**
 * Marca binária.
 *
 * O critério de superação é "comportamento verificável, binário" (Doc 3 §2),
 * então a marca é binária: cheia ou vazia. Nunca porcentagem, nunca
 * meio-preenchimento — isso sugeriria progresso parcial onde a regra não
 * admite.
 */
export function MarcaBinaria({ cumprido, tamanho = 'normal' }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-[3px] border ${tamanho === 'grande' ? 'size-4' : 'size-[0.875rem]'}`}
      style={{
        borderColor: cumprido ? 'var(--color-destaque)' : 'var(--color-linha-forte)',
        backgroundColor: cumprido ? 'var(--color-destaque)' : 'transparent',
      }}
    />
  )
}

export type ItemDeVerificacao = {
  texto: string
  cumprido: boolean
  /** Meta alinhada à direita: prazo, formato, contagem. */
  detalhe?: string
}

/**
 * Lista de verificação.
 *
 * Item cumprido fica em tinta média, **sem risco**: risco significa
 * "desconsidere", que é o oposto de vencido. O risco é reservado ao que está
 * fora de escopo.
 */
export function ListaDeVerificacao({
  itens,
  className = '',
}: {
  itens: readonly ItemDeVerificacao[]
  className?: string
}) {
  return (
    <ul className={`flex flex-col ${className}`}>
      {itens.map((item) => (
        <li
          key={item.texto}
          className="flex items-start justify-between gap-4 border-b border-linha py-2.5 last:border-b-0"
        >
          <span className="flex min-w-0 items-start gap-3">
            <span className="mt-[0.3rem]">
              <MarcaBinaria cumprido={item.cumprido} />
            </span>
            <span
              className={`text-[0.9375rem] leading-snug ${
                item.cumprido ? 'text-tinta-media' : 'text-tinta'
              }`}
            >
              {item.texto}
            </span>
          </span>
          {item.detalhe && (
            <span className="dado shrink-0 text-[0.6875rem] text-tinta-fraca">{item.detalhe}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * Lista do que está fora de escopo.
 *
 * Traço no lugar de marca, e o texto em tinta fraca. Dizer o que **não** fazer
 * é incomum em produto, e aqui é carga pedagógica: o campo existe para impedir
 * que a aula cresça no calor do momento (Doc 3 §2).
 */
export function ListaForaDeEscopo({
  itens,
  className = '',
}: {
  itens: readonly string[]
  className?: string
}) {
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {itens.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-[0.9375rem] leading-snug text-tinta-fraca"
        >
          <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-linha-forte" />
          {item}
        </li>
      ))}
    </ul>
  )
}
