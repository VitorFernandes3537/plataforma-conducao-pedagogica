import { ListaForaDeEscopo, MarcaBinaria } from '@/components/ui'

export type CriterioDeSuperacao = {
  texto: string
  cumprido: boolean
}

type Props = {
  /**
   * O obstáculo enunciado como pergunta do aluno.
   *
   * Doc 3 §2 descreve o campo como o obstáculo enunciado como problema do
   * aluno, não como aula numerada — é o que vai ao mural e à plataforma, e é o
   * que separa o método de um currículo. (O termo do curso está traduzido aqui,
   * pela fronteira do CLAUDE.md §2.3.)
   */
  perguntaDoAluno: string
  /** Doc 3 §2: comportamento verificável e binário. Vira checklist aqui. */
  criterios: readonly CriterioDeSuperacao[]
  /** Doc 3 §2: "impede que a aula cresça no calor do momento". */
  escopoFora: readonly string[]
  ordem: number
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
    <section aria-label="Desafio atual" className="px-6 py-6">
      <div className="flex items-baseline gap-4">
        <span className="legenda text-tinta">o que vencer agora</span>
        <span className="dado text-[0.6875rem] text-tinta-fraca">obstáculo {ordem}</span>
      </div>

      {/* A pergunta é prosa e é tese. Filete à esquerda em vez de caixa —
          margem de papel, não cartão dentro de cartão. */}
      <h2 className="mt-3 max-w-[34ch] border-l-2 border-tinta pl-5 font-prosa text-[1.625rem] leading-[1.3] text-tinta">
        {perguntaDoAluno}
      </h2>

      {/* Havia um `max-w-5xl` aqui, inerte: 1024px dentro de um main de 896.
          Não segurava nada e voltaria a morder no dia em que a casca passasse
          de 1024 — cap adormecido é pior que cap nenhum, porque ninguém o
          procura. Quem decide a largura desta grade é a casca (ADR 0009). */}
      <div className="mt-7 grid gap-x-14 gap-y-6 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                <span className="mt-[0.3rem]">
                  <MarcaBinaria cumprido={criterio.cumprido} />
                </span>
                {/* Sem risco no cumprido: risco significa "desconsidere", e é o
                    oposto de vencido. O risco fica só no fora de escopo. */}
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

        <div>
          <h3 className="legenda">fora de escopo hoje</h3>
          <ListaForaDeEscopo itens={escopoFora} className="mt-2.5" />
        </div>
      </div>
    </section>
  )
}
