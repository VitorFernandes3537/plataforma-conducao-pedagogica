export type CriterioDeSuperacao = {
  texto: string
  cumprido: boolean
}

type Props = {
  /**
   * O obstáculo enunciado como pergunta do aluno.
   *
   * Doc 3 §2: "a parede enunciada como problema dele, não como aula numerada.
   * É o que vai no mural e na plataforma. Separa PBL de currículo."
   *
   * Por isso o herói da tela é esta frase, e não um rótulo tipo "Obstáculo 4".
   */
  perguntaDoAluno: string
  /** Doc 3 §2: comportamento verificável e binário. Vira checklist aqui. */
  criterios: readonly CriterioDeSuperacao[]
  /** Doc 3 §2: "impede que a aula cresça no calor do momento". */
  escopoFora: readonly string[]
  /** Ordinal apenas para referência — nunca é o título. */
  ordem: number
}

/**
 * O que o aluno tem que vencer agora.
 *
 * Fica no topo porque é a resposta à única pergunta que ele faz ao abrir a
 * plataforma no meio da aula. A ordem interna é deliberada: a pergunta, o
 * que conta como vencer, e só então o que está fora.
 */
export function DesafioAtual({ perguntaDoAluno, criterios, escopoFora, ordem }: Props) {
  const cumpridos = criterios.filter((c) => c.cumprido).length
  const superado = cumpridos === criterios.length && criterios.length > 0

  return (
    <section
      aria-label="Desafio atual"
      className="border-l-2 bg-quadro px-5 py-4"
      style={{ borderColor: superado ? 'var(--color-escala-3)' : 'var(--color-portao-triagem)' }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
          o que vencer agora
        </span>
        <span className="dado text-[0.625rem] text-clara-fraca">obstáculo {ordem}</span>
      </div>

      {/* A pergunta é prosa e é tese: serifada, grande, medida curta. */}
      <h2 className="mt-2 max-w-[38ch] font-prosa text-2xl leading-[1.25] text-clara">
        {perguntaDoAluno}
      </h2>

      <div className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
            vencer é
            <span className="dado ml-2 normal-case tracking-normal">
              {cumpridos}/{criterios.length}
            </span>
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {criterios.map((criterio) => (
              <li key={criterio.texto} className="flex items-start gap-2.5">
                {/* Binário, então a marca é binária: preenchida ou vazia. */}
                <span
                  aria-hidden="true"
                  className="mt-[0.3rem] size-3 shrink-0 border"
                  style={{
                    borderColor: criterio.cumprido
                      ? 'var(--color-escala-3)'
                      : 'var(--color-regua)',
                    backgroundColor: criterio.cumprido
                      ? 'var(--color-escala-3)'
                      : 'transparent',
                  }}
                />
                <span
                  className={[
                    'text-sm leading-snug',
                    criterio.cumprido ? 'text-clara-fraca' : 'text-clara',
                  ].join(' ')}
                >
                  {criterio.texto}
                  <span className="sr-only">{criterio.cumprido ? ' — cumprido' : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dizer o que NÃO fazer é raro em produto e aqui é carga pedagógica. */}
        <div>
          <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
            fora de escopo hoje
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {escopoFora.map((item) => (
              <li key={item} className="text-sm leading-snug text-clara-fraca line-through">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
