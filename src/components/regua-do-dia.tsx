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
}

/**
 * A régua do dia.
 *
 * Barra proporcional às durações reais (Doc 4 §2). As larguras SÃO as
 * proporções: 75 minutos ocupam cinco vezes o espaço de 15, sem largura
 * mínima, porque um bloco curto deve parecer curto.
 *
 * O marcador de decorrido é o que faz dela instrumento e não legenda. Sem
 * ele a barra diz quais blocos existem; com ele responde a pergunta que o
 * instrutor faz o tempo todo — quanto falta.
 *
 * Em dia de marco, o portão tinge régua e divisórias. Nunca a tarja, nunca
 * o texto.
 */
export function ReguaDoDia({
  blocos,
  blocoCorrente,
  decorridosNoBloco = 0,
  marco,
}: Props) {
  const corDoPortao =
    marco?.tipo === 'duro'
      ? 'var(--color-portao-duro)'
      : marco?.tipo === 'triagem'
        ? 'var(--color-portao-triagem)'
        : 'var(--color-regua-fraca)'

  const corrente = blocoCorrente === null ? null : blocos[blocoCorrente]
  const restam = corrente ? Math.max(0, corrente.duracaoMinutos - decorridosNoBloco) : null

  return (
    <section aria-label="Régua do dia">
      <div className="flex items-stretch">
        {/* Contador. É o número que importa, então é o maior da tela. */}
        <div
          className="flex w-28 shrink-0 flex-col justify-center border-r px-3 py-2"
          style={{ borderColor: corDoPortao }}
        >
          {restam === null ? (
            <span className="text-[0.625rem] uppercase tracking-[0.14em] text-clara-fraca">
              fora de aula
            </span>
          ) : (
            <>
              <span className="dado text-3xl leading-none text-clara">{restam}</span>
              <span className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-clara-fraca">
                min restantes
              </span>
            </>
          )}
        </div>

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
                // `flex-basis: 0` é o que torna a proporção verdadeira. Com a
                // base vinda do conteúdo, o rótulo "demonstração" empurrava a
                // caixa e um bloco de 15 min ficava do tamanho de um de 40.
                style={{ flex: `${bloco.duracaoMinutos} 1 0%`, borderColor: corDoPortao }}
                className={[
                  'relative flex min-w-0 flex-col justify-end border-l first:border-l-0',
                  ehCorrente ? 'pb-2 pt-2' : 'pb-2 pt-4',
                ].join(' ')}
              >
                {/* Decorrido pinta o próprio fundo — não é barra separada. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-regua-fraca"
                  style={{ width: `${fracao * 100}%` }}
                />

                <div className="relative px-2">
                  <span
                    className={[
                      'block truncate text-[0.625rem] uppercase tracking-[0.14em]',
                      ehCorrente ? 'text-clara' : 'text-clara-fraca',
                    ].join(' ')}
                  >
                    {bloco.tipo}
                  </span>
                  <span
                    className={[
                      'dado block text-xs',
                      ehCorrente ? 'text-clara' : 'text-clara-fraca',
                    ].join(' ')}
                  >
                    {bloco.duracaoMinutos}
                  </span>
                </div>

                {/* Marcador do agora: fio vertical na posição real. */}
                {ehCorrente && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-clara"
                    style={{ left: `${fracao * 100}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
