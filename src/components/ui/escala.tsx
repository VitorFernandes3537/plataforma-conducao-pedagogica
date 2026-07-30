export type NotaDaEscala = 0 | 1 | 2 | 3

const NOTAS: readonly NotaDaEscala[] = [0, 1, 2, 3]

/**
 * Controle da escala de obstáculo (`D6-ESCALA`).
 *
 * Quatro valores, e só quatro — o número de degraus vem do documento, não da
 * interface. Superado é >= 1 (Doc 6 §2), e o zero **não é vermelho**: é o
 * estado antes da tentativa, não reprovação. Vermelho ali ensinaria a coisa
 * errada.
 *
 * `null` é estado válido e distinto de zero: significa "ainda não avaliado".
 */
export function Escala({
  nome,
  valor,
  onEscolha,
  rotulo,
  className = '',
}: {
  nome: string
  valor: NotaDaEscala | null
  onEscolha?: (nota: NotaDaEscala) => void
  rotulo: string
  className?: string
}) {
  const somenteLeitura = !onEscolha

  return (
    <fieldset className={className}>
      <legend className="legenda">{rotulo}</legend>
      <div className="mt-2 flex gap-1.5" role={somenteLeitura ? 'img' : undefined}>
        {NOTAS.map((nota) => {
          const escolhida = valor === nota
          const conteudo = (
            <span
              className={`dado text-[0.8125rem] ${nota >= 2 && escolhida ? 'text-superficie' : escolhida ? 'text-tinta' : 'text-tinta-fraca'}`}
            >
              {nota}
            </span>
          )
          const estilo = {
            backgroundColor: escolhida ? `var(--color-escala-${nota})` : 'transparent',
            borderColor: escolhida ? `var(--color-escala-${nota})` : 'var(--color-linha-forte)',
          }

          if (somenteLeitura) {
            return (
              <span
                key={nota}
                className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] border"
                style={estilo}
              >
                {conteudo}
              </span>
            )
          }

          return (
            <label
              key={nota}
              className="flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-controle)] border transition-colors"
              style={estilo}
            >
              <input
                type="radio"
                name={nome}
                value={nota}
                checked={escolhida}
                onChange={() => onEscolha(nota)}
                className="sr-only"
              />
              {conteudo}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
