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
 * Barra proporcional às durações reais (Doc 4 §2). `flex-basis: 0` é o que
 * torna a proporção verdadeira — com a base vinda do conteúdo, o rótulo
 * "demonstração" empurrava a caixa e um bloco de 15 min ficava do tamanho de
 * um de 40.
 *
 * Ocupa a largura inteira da tela de propósito: é em largura real que a
 * proporção fica legível, e o rótulo do bloco curto cabe.
 *
 * O marcador de decorrido é o que faz dela instrumento e não legenda.
 */
export function ReguaDoDia({ blocos, blocoCorrente, decorridosNoBloco = 0, marco }: Props) {
  const corDoMarco =
    marco?.tipo === 'duro'
      ? 'var(--color-portao-duro)'
      : marco?.tipo === 'triagem'
        ? 'var(--color-portao-triagem)'
        : undefined

  const corrente = blocoCorrente === null ? null : blocos[blocoCorrente]
  const restam = corrente ? Math.max(0, corrente.duracaoMinutos - decorridosNoBloco) : null

  return (
    <section
      aria-label="Régua do dia"
      className="flex items-stretch border-y border-filete bg-papel-alto"
      style={corDoMarco ? { borderColor: corDoMarco } : undefined}
    >
      {/* Contador. É o número que importa, então é o maior da tela. */}
      <div className="flex w-32 shrink-0 flex-col justify-center border-r border-filete px-4 py-2.5">
        {restam === null ? (
          <span className="legenda">fora de aula</span>
        ) : (
          <>
            <span className="dado text-[2rem] font-medium leading-none tracking-tight text-tinta">
              {restam}
            </span>
            <span className="legenda mt-1">min restantes</span>
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
              title={`${bloco.tipo} · ${bloco.duracaoMinutos} min`}
              style={{ flex: `${bloco.duracaoMinutos} 1 0%` }}
              className="relative flex min-w-0 flex-col justify-center border-l border-filete px-3 py-2.5 first:border-l-0"
            >
              {/* Decorrido tinge o próprio fundo. Nada de barra separada. */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-papel-fundo"
                style={{ width: `${fracao * 100}%` }}
              />

              <div className="relative min-w-0">
                <span
                  className={`legenda block truncate ${ehCorrente ? 'text-tinta' : ''}`}
                >
                  {bloco.tipo}
                </span>
                <span
                  className={`dado mt-0.5 block text-sm ${
                    ehCorrente ? 'text-tinta' : 'text-tinta-media'
                  }`}
                >
                  {bloco.duracaoMinutos}
                </span>
              </div>

              {/* Marcador do agora: fio de tinta na posição real. */}
              {ehCorrente && (
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-tinta"
                  style={{ left: `${fracao * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
