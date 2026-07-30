export type BlocoDaRegua = {
  tipo: string
  duracaoMinutos: number
}

export type MarcoDaRegua = {
  nome: string
  tipo: 'duro' | 'triagem'
}

type Props = {
  blocos: readonly BlocoDaRegua[]
  /** Índice do bloco corrente, ou `null` fora do horário de aula. */
  blocoCorrente: number | null
  /** Minutos já decorridos dentro do bloco corrente. */
  decorridosNoBloco?: number | undefined
  marco?: MarcoDaRegua | undefined
  dia: number
  rotuloDoDia: string
  contexto: string
}

/**
 * A régua do dia — a peça de assinatura do sistema.
 *
 * Barra proporcional às durações reais (Doc 4 §2). `flex-basis: 0` é o que
 * torna a proporção verdadeira: com a base vinda do conteúdo, o rótulo
 * "demonstração" empurrava a caixa e 15 min ficavam do tamanho de 40.
 *
 * O marcador de decorrido é o que a faz instrumento e não legenda: sem ele a
 * barra diz quais blocos existem; com ele responde quanto falta.
 *
 * Marco `duro` e `triagem` se distinguem por FORMA — filete sólido contra
 * tracejado — e não por cores diferentes. Portão é uma cor só, e é rara.
 */
export function ReguaDoDia({
  blocos,
  blocoCorrente,
  decorridosNoBloco = 0,
  marco,
  dia,
  rotuloDoDia,
  contexto,
}: Props) {
  const corrente = blocoCorrente === null ? null : blocos[blocoCorrente]
  const restam = corrente ? Math.max(0, corrente.duracaoMinutos - decorridosNoBloco) : null
  const total = blocos.reduce((soma, b) => soma + b.duracaoMinutos, 0)
  const decorridoTotal =
    blocoCorrente === null
      ? 0
      : blocos.slice(0, blocoCorrente).reduce((s, b) => s + b.duracaoMinutos, 0) + decorridosNoBloco

  const bordaDoMarco = marco
    ? {
        borderTopWidth: '2px',
        borderTopColor: 'var(--color-portao)',
        borderTopStyle: marco.tipo === 'duro' ? ('solid' as const) : ('dashed' as const),
      }
    : undefined

  return (
    <header className="cartao overflow-hidden" style={bordaDoMarco}>
      <div className="flex items-baseline justify-between gap-6 border-b border-filete px-5 py-2.5">
        <div className="flex items-baseline gap-4">
          <span className="dado text-lg font-medium leading-none tracking-tight text-tinta">
            D{dia}
          </span>
          <span className="legenda">{rotuloDoDia}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="legenda">{contexto}</span>
          {marco && (
            <span
              className="etiqueta border"
              style={{
                borderColor: 'var(--color-portao)',
                color: 'var(--color-portao)',
                borderStyle: marco.tipo === 'duro' ? 'solid' : 'dashed',
              }}
            >
              {marco.nome} · {marco.tipo === 'duro' ? 'go/no-go' : 'triagem'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-1 items-stretch">
          {blocos.map((bloco, indice) => {
            const ehCorrente = indice === blocoCorrente
            const passado = blocoCorrente !== null && indice < blocoCorrente
            const fracao = ehCorrente
              ? Math.min(1, decorridosNoBloco / bloco.duracaoMinutos)
              : passado
                ? 1
                : 0

            return (
              <div
                key={`${bloco.tipo}-${indice}`}
                title={`${bloco.tipo} · ${bloco.duracaoMinutos} min`}
                style={{ flex: `${bloco.duracaoMinutos} 1 0%` }}
                className="relative flex min-w-0 items-baseline gap-2 border-l border-filete px-3 py-3 first:border-l-0"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-superficie-fraca"
                  style={{ width: `${fracao * 100}%` }}
                />
                <span
                  className={`legenda relative truncate ${ehCorrente ? 'text-tinta' : ''}`}
                >
                  {bloco.tipo}
                </span>
                <span
                  className={`dado relative shrink-0 text-[0.6875rem] ${
                    ehCorrente ? 'text-tinta' : 'text-tinta-fraca'
                  }`}
                >
                  {bloco.duracaoMinutos}
                </span>

                {ehCorrente && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-[2px] bg-tinta"
                    style={{ left: `${fracao * 100}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Contador onde o olho termina de ler a régua. */}
        <div className="flex w-28 shrink-0 flex-col items-end justify-center border-l border-filete px-4 py-2">
          {restam === null ? (
            <span className="legenda">fora de aula</span>
          ) : (
            <>
              <span className="dado text-2xl font-medium leading-none tracking-tight text-tinta">
                {restam}
              </span>
              <span className="legenda mt-1">min no bloco</span>
            </>
          )}
        </div>
      </div>

      {/* Duas escalas na mesma peça: o bloco acima, o dia inteiro aqui. */}
      <div className="h-[3px] w-full bg-superficie-fraca" aria-hidden="true">
        <div
          className="h-full bg-tinta-tenue"
          style={{ width: `${(decorridoTotal / total) * 100}%` }}
        />
      </div>
    </header>
  )
}
