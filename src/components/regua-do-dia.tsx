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
  marco?: MarcoDaRegua | undefined
}

/**
 * A régua do dia.
 *
 * Barra proporcional às durações reais dos blocos. As larguras SÃO as
 * proporções — 75 minutos ocupam cinco vezes o espaço de 15. Responde a
 * única pergunta que o instrutor faz o tempo todo: estou no tempo?
 *
 * Quando o dia tem marco, o portão tinge a régua e as divisórias — nunca a
 * tarja nem o texto. É o limite que separa ambiente de semáforo piscando.
 */
export function ReguaDoDia({ blocos, blocoCorrente, marco }: Props) {
  const total = blocos.reduce((soma, b) => soma + b.duracaoMinutos, 0)

  const corDoPortao =
    marco?.tipo === 'duro'
      ? 'var(--color-portao-duro)'
      : marco?.tipo === 'triagem'
        ? 'var(--color-portao-triagem)'
        : 'var(--color-regua)'

  return (
    <section aria-label="Régua do dia" className="border-y" style={{ borderColor: corDoPortao }}>
      <div className="flex h-14 bg-quadro">
        {blocos.map((bloco, indice) => {
          const corrente = indice === blocoCorrente
          return (
            <div
              key={`${bloco.tipo}-${indice}`}
              // A largura é a duração. Nenhum mínimo, nenhum arredondamento:
              // um bloco curto DEVE parecer curto.
              style={{ flexGrow: bloco.duracaoMinutos, borderColor: corDoPortao }}
              className={[
                'flex min-w-0 flex-col justify-center gap-0.5 border-l px-3 first:border-l-0',
                corrente ? 'bg-regua-fraca' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'truncate text-[0.6875rem] uppercase tracking-[0.14em]',
                  corrente ? 'text-clara' : 'text-clara-fraca',
                ].join(' ')}
              >
                {bloco.tipo}
              </span>
              <span
                className={[
                  'dado text-sm',
                  corrente ? 'text-clara' : 'text-clara-fraca',
                ].join(' ')}
              >
                {bloco.duracaoMinutos}
                <span className="text-clara-fraca"> min</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-baseline justify-between bg-quadro-fundo px-3 py-1.5">
        <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-clara-fraca">
          {blocoCorrente === null
            ? 'fora do horário de aula'
            : `agora · ${blocos[blocoCorrente]?.tipo ?? ''}`}
        </span>
        <span className="dado text-[0.6875rem] text-clara-fraca">
          {total} min no dia
        </span>
      </div>
    </section>
  )
}
