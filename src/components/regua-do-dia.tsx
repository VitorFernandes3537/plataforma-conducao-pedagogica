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
  contexto: string
}

/**
 * A régua do dia — a peça de assinatura.
 *
 * Uma faixa só, ~40px. A versão anterior tinha o dobro da altura e ocupava
 * muito mais espaço do que a informação pedia.
 *
 * O decorrido NÃO preenche caixa. Antes era um bloco bege sobre fundo bege —
 * mancha suja e invisível. Agora é fio de tinta na base, com o marcador do
 * agora na posição real: contraste de verdade, e um sexto da altura.
 *
 * As larguras SÃO as durações (Doc 4 §2). `flex-basis: 0` é o que torna a
 * proporção verdadeira — com base vinda do conteúdo, o rótulo empurrava a
 * caixa e 15 min ficavam do tamanho de 40.
 *
 * Marco `duro` e `triagem` se separam por FORMA, não por cor nova.
 */
export function ReguaDoDia({
  blocos,
  blocoCorrente,
  decorridosNoBloco = 0,
  marco,
  dia,
  contexto,
}: Props) {
  const corrente = blocoCorrente === null ? null : blocos[blocoCorrente]
  const restam = corrente ? Math.max(0, corrente.duracaoMinutos - decorridosNoBloco) : null
  const total = blocos.reduce((soma, b) => soma + b.duracaoMinutos, 0)
  const decorridoTotal =
    blocoCorrente === null
      ? 0
      : blocos.slice(0, blocoCorrente).reduce((s, b) => s + b.duracaoMinutos, 0) + decorridosNoBloco
  const fracaoDoDia = total > 0 ? decorridoTotal / total : 0

  return (
    <section
      aria-label="Régua do dia"
      className="relative flex items-stretch border-y border-linha bg-superficie"
      style={
        marco
          ? {
              borderTopWidth: '2px',
              borderTopColor: 'var(--color-portao)',
              borderTopStyle: marco.tipo === 'duro' ? 'solid' : 'dashed',
            }
          : undefined
      }
    >
      <div className="flex shrink-0 items-baseline gap-2.5 px-4 py-2">
        <span className="dado text-base font-medium leading-none tracking-tight text-tinta">
          D{dia}
        </span>
        <span className="legenda hidden sm:inline">{contexto}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-baseline">
        {blocos.map((bloco, indice) => {
          const ehCorrente = indice === blocoCorrente
          // Bloco estreito perde o rótulo em vez de exibi-lo cortado:
          // "FECHAME…" não informa nada e suja a faixa. A duração fica, e o
          // nome continua acessível pelo `title`.
          const fatia = total > 0 ? bloco.duracaoMinutos / total : 0
          const cabeRotulo = fatia >= 0.12

          return (
            <div
              key={`${bloco.tipo}-${indice}`}
              title={`${bloco.tipo} · ${bloco.duracaoMinutos} min`}
              style={{ flex: `${bloco.duracaoMinutos} 1 0%` }}
              className="flex min-w-0 items-baseline gap-1.5 border-l border-linha px-2.5 py-2"
            >
              {cabeRotulo && (
                <span className={`legenda truncate ${ehCorrente ? 'text-tinta' : ''}`}>
                  {bloco.tipo}
                </span>
              )}
              {/* `fraca` e nao `tenue` no dia que nao e o corrente: sao dez
                  pixels de numero, e tenue os deixava em 2.31:1. A hierarquia
                  entre corrente e resto continua, so nao custa a leitura. */}
              <span
                className={`dado shrink-0 text-[0.625rem] ${
                  ehCorrente ? 'text-tinta' : 'text-tinta-fraca'
                }`}
              >
                {bloco.duracaoMinutos}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex shrink-0 items-baseline gap-1.5 border-l border-linha px-4 py-2">
        {restam === null ? (
          <span className="legenda">fora de aula</span>
        ) : (
          <>
            <span className="dado text-base font-medium leading-none tracking-tight text-tinta">
              {restam}
            </span>
            <span className="legenda">min</span>
          </>
        )}
        {marco && (
          <span
            className="etiqueta ml-2 border"
            style={{
              borderColor: 'var(--color-portao)',
              color: 'var(--color-portao)',
              borderStyle: marco.tipo === 'duro' ? 'solid' : 'dashed',
            }}
          >
            {marco.tipo === 'duro' ? 'go/no-go' : 'triagem'}
          </span>
        )}
      </div>

      {/* Progresso do dia: fio de tinta na base, e o marcador do agora na
          posição real. Contraste de verdade em 2px de altura. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-recuo"
      >
        <div
          className="h-full"
          style={{
            width: `${fracaoDoDia * 100}%`,
            backgroundColor: marco ? 'var(--color-portao)' : 'var(--color-tinta)',
          }}
        />
      </div>
    </section>
  )
}
