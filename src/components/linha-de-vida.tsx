export type PassoDaLinha = {
  /** Ordinal do obstáculo. */
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
 * Substitui um gráfico de barras que não comunicava nada: alturas de 8 a 38px
 * em tons quase idênticos ao fundo eram invisíveis na tela.
 *
 * Agora cada passo é um bloco cheio, do tamanho do toque, com a nota escrita.
 * Superado é >= 1 (Doc 6 §2), e o que ainda não aconteceu tem forma própria —
 * tracejado — em vez de virar um zero que parece reprovação.
 */
export function LinhaDeVida({ passos }: Props) {
  const superados = passos.filter((p) => p.nota !== null && p.nota >= 1).length
  const avaliados = passos.filter((p) => p.nota !== null).length

  return (
    <section aria-label="Progresso pelos obstáculos">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
          obstáculos
        </h3>
        <p className="dado text-[0.6875rem] text-clara-fraca">
          <span className="text-clara">{superados}</span> superados de {avaliados}
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
                className="flex h-9 w-full items-center justify-center"
                style={
                  futuro
                    ? { border: '1px dashed var(--color-regua)' }
                    : { backgroundColor: `var(--color-escala-${passo.nota})` }
                }
              >
                <span
                  className={[
                    'dado text-xs',
                    futuro
                      ? 'text-clara-fraca'
                      : passo.nota! >= 2
                        ? 'text-tinta'
                        : 'text-clara',
                  ].join(' ')}
                >
                  {futuro ? '·' : passo.nota}
                </span>
              </div>
              <span className="dado text-[0.625rem] text-clara-fraca">{passo.ordem}</span>
            </li>
          )
        })}
      </ol>

      <p className="mt-2 text-[0.6875rem] leading-snug text-clara-fraca">
        Superado é 1 ou mais. Zero é o estado antes da tentativa, não reprovação.
      </p>
    </section>
  )
}
