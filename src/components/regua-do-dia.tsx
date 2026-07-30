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
  /** Dia e rótulo entram na própria barra: é uma peça só, não duas. */
  dia: number
  rotuloDoDia: string
  contexto: string
}

/**
 * A barra de instrumento: identidade, dia, marco e a régua do tempo.
 *
 * É a camada CHROME — escura de propósito. É onde o produto parece ferramenta,
 * e é a única superfície escura da interface, o que a torna o foco natural sem
 * precisar de tamanho.
 *
 * A régua é proporcional às durações reais (Doc 4 §2). `flex-basis: 0` é o que
 * torna a proporção verdadeira: com a base vinda do conteúdo, o rótulo
 * "demonstração" empurrava a caixa e 15 min ficavam do tamanho de 40.
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
  const corDoMarco =
    marco?.tipo === 'duro'
      ? 'var(--color-portao-duro-luz)'
      : marco?.tipo === 'triagem'
        ? 'var(--color-portao-triagem-luz)'
        : undefined

  const corrente = blocoCorrente === null ? null : blocos[blocoCorrente]
  const restam = corrente ? Math.max(0, corrente.duracaoMinutos - decorridosNoBloco) : null
  const total = blocos.reduce((soma, b) => soma + b.duracaoMinutos, 0)
  const decorridoTotal =
    blocoCorrente === null
      ? 0
      : blocos.slice(0, blocoCorrente).reduce((s, b) => s + b.duracaoMinutos, 0) + decorridosNoBloco

  return (
    <header className="bg-chrome text-luz">
      {/* Linha 1 — identidade e situação. Fina: não é o assunto. */}
      <div className="flex items-baseline justify-between gap-6 px-6 py-2">
        <div className="flex items-baseline gap-4">
          <span className="dado text-[0.8125rem] font-semibold tracking-[0.2em] text-luz">PCP</span>
          <span className="dado text-[0.6875rem] uppercase tracking-[0.12em] text-luz-fraca">
            {contexto}
          </span>
        </div>
        {marco && (
          <span
            className="dado border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em]"
            style={{ borderColor: corDoMarco, color: corDoMarco }}
          >
            {marco.nome} · {marco.tipo === 'duro' ? 'go/no-go' : 'triagem'}
          </span>
        )}
      </div>

      {/* Linha 2 — o instrumento. */}
      <div className="flex items-stretch border-t border-chrome-alto">
        <div className="flex shrink-0 items-baseline gap-3 px-6 py-3">
          <span className="dado text-[1.75rem] font-medium leading-none tracking-tight text-luz">
            D{dia}
          </span>
          <span className="dado text-[0.6875rem] uppercase tracking-[0.12em] text-luz-fraca">
            {rotuloDoDia}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch border-l border-chrome-alto">
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
                className="relative flex min-w-0 items-baseline gap-2 border-l border-chrome-alto px-3 py-3 first:border-l-0"
              >
                {/* Decorrido tinge o próprio fundo. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-chrome-alto"
                  style={{ width: `${fracao * 100}%` }}
                />
                <span
                  className={`dado relative truncate text-[0.625rem] uppercase tracking-[0.12em] ${
                    ehCorrente ? 'text-luz' : 'text-luz-fraca'
                  }`}
                >
                  {bloco.tipo}
                </span>
                <span
                  className={`dado relative shrink-0 text-[0.6875rem] ${
                    ehCorrente ? 'text-luz' : 'text-luz-fraca'
                  }`}
                >
                  {bloco.duracaoMinutos}
                </span>

                {/* Marcador do agora. */}
                {ehCorrente && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-[2px]"
                    style={{
                      left: `${fracao * 100}%`,
                      backgroundColor: corDoMarco ?? 'var(--color-luz)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Contador à direita: é o número que importa, e fica onde o olho
            termina de ler a régua. */}
        <div
          className="flex w-28 shrink-0 flex-col items-end justify-center border-l px-5 py-2"
          style={{ borderColor: corDoMarco ?? 'var(--color-chrome-alto)' }}
        >
          {restam === null ? (
            <span className="dado text-[0.625rem] uppercase tracking-[0.12em] text-luz-fraca">
              fora de aula
            </span>
          ) : (
            <>
              <span className="dado text-[1.75rem] font-medium leading-none tracking-tight text-luz">
                {restam}
              </span>
              <span className="dado mt-1 text-[0.5625rem] uppercase tracking-[0.12em] text-luz-fraca">
                min no bloco
              </span>
            </>
          )}
        </div>
      </div>

      {/* Fio de progresso do dia inteiro. Duas escalas, uma peça: o bloco
          acima, o dia aqui. */}
      <div className="h-[3px] w-full bg-chrome-baixo" aria-hidden="true">
        <div
          className="h-full"
          style={{
            width: `${(decorridoTotal / total) * 100}%`,
            backgroundColor: corDoMarco ?? 'var(--color-luz-fraca)',
          }}
        />
      </div>
    </header>
  )
}
