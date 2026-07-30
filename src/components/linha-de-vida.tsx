export type PassoDaLinha = {
  ordem: number
  /** Avaliação 0–3 (`D6-ESCALA`), ou `null` se o momento ainda não chegou. */
  nota: 0 | 1 | 2 | 3 | null
}

type Props = {
  passos: readonly PassoDaLinha[]
}

/**
 * A linha de vida do aluno pelos obstáculos.
 *
 * Superado é >= 1 (Doc 6 §2). O que ainda não aconteceu tem forma própria —
 * filete tracejado — em vez de virar um zero que parece reprovação.
 */
export function LinhaDeVida({ passos }: Props) {
  const superados = passos.filter((p) => p.nota !== null && p.nota >= 1).length

  return (
    <section aria-label="Progresso pelos obstáculos">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="legenda">obstáculos</h3>
        <p className="dado text-[0.6875rem] text-tinta-fraca">
          <span className="text-tinta">{superados}</span>/{passos.length} superados
        </p>
      </div>

      <ol className="mt-2 flex gap-1">
        {passos.map((passo) => {
          const futuro = passo.nota === null
          return (
            <li
              key={passo.ordem}
              className="flex flex-1 flex-col items-center gap-1"
              title={
                futuro
                  ? `Obstáculo ${passo.ordem} — ainda não avaliado`
                  : `Obstáculo ${passo.ordem} — nota ${passo.nota}`
              }
            >
              <div
                className="flex h-8 w-full items-center justify-center"
                style={
                  futuro
                    ? { border: '1px dashed var(--color-filete-forte)' }
                    : { backgroundColor: `var(--color-escala-${passo.nota})` }
                }
              >
                <span
                  className={`dado text-[0.6875rem] ${
                    futuro ? 'text-tinta-fraca' : passo.nota! >= 2 ? 'text-painel' : 'text-tinta'
                  }`}
                >
                  {futuro ? '·' : passo.nota}
                </span>
              </div>
              <span className="dado text-[0.625rem] text-tinta-fraca">{passo.ordem}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
