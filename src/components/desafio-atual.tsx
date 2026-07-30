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
   */
  perguntaDoAluno: string
  /** Doc 3 §2: comportamento verificável e binário. Vira checklist aqui. */
  criterios: readonly CriterioDeSuperacao[]
  /** Doc 3 §2: "impede que a aula cresça no calor do momento". */
  escopoFora: readonly string[]
  ordem: number
}

/** Marca binária, porque o critério é binário. Sem porcentagem, sem meio-termo. */
function Marca({ cumprido }: { cumprido: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="mt-[0.35rem] size-[0.875rem] shrink-0 border"
      style={{
        borderColor: cumprido ? 'var(--color-escala-3)' : 'var(--color-filete-forte)',
        backgroundColor: cumprido ? 'var(--color-escala-3)' : 'transparent',
      }}
    />
  )
}

/**
 * O que o aluno tem que vencer agora.
 *
 * Fica no topo porque é a resposta à única pergunta que ele faz ao abrir a
 * plataforma no meio da aula. A ordem interna é deliberada: a pergunta, o que
 * conta como vencer, e só então o que está fora.
 */
export function DesafioAtual({ perguntaDoAluno, criterios, escopoFora, ordem }: Props) {
  const cumpridos = criterios.filter((c) => c.cumprido).length

  return (
    <section aria-label="Desafio atual" className="px-8 py-7">
      <div className="flex items-baseline gap-4">
        <span className="legenda text-tinta">o que vencer agora</span>
        <span className="dado text-[0.6875rem] text-tinta-fraca">obstáculo {ordem}</span>
      </div>

      {/* A pergunta é prosa e é tese: serifada, grande, medida curta. Filete
          à esquerda em vez de caixa — margem de prancha, não card. */}
      <h2 className="mt-3 max-w-[34ch] border-l-2 border-tinta pl-5 font-prosa text-[1.75rem] leading-[1.3] text-tinta">
        {perguntaDoAluno}
      </h2>

      <div className="mt-7 grid max-w-5xl gap-x-14 gap-y-6 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h3 className="legenda flex items-baseline gap-2">
            vencer é
            <span className="dado normal-case tracking-normal text-tinta">
              {cumpridos}/{criterios.length}
            </span>
          </h3>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {criterios.map((criterio) => (
              <li key={criterio.texto} className="flex items-start gap-3">
                <Marca cumprido={criterio.cumprido} />
                {/* Sem risco no cumprido. Risco significa "desconsidere", e é
                    o oposto de vencido — o risco fica só no fora de escopo. */}
                <span
                  className={`text-[0.9375rem] leading-snug ${
                    criterio.cumprido ? 'text-tinta-media' : 'text-tinta'
                  }`}
                >
                  {criterio.texto}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dizer o que NÃO fazer é raro em produto e aqui é carga pedagógica. */}
        <div>
          <h3 className="legenda">fora de escopo hoje</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {escopoFora.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[0.9375rem] leading-snug text-tinta-fraca"
              >
                <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-filete-forte" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
