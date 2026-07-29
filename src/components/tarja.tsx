export type EstadoDaTarja = 'rascunho' | 'submetido' | 'aprovado' | 'devolvido'

type Props = {
  /** Nomes dos integrantes. Um só é caso válido, não exceção (Doc 2 §2.4.1). */
  integrantes: readonly string[]
  tema: string | null
  trilha?: 'padrao' | 'desafio' | undefined
  estado: EstadoDaTarja
  /** Linha curta com o que exige ação. Vazio quando não há nada pendente. */
  pendencia?: string | undefined
  bloqueado?: boolean | undefined
}

const ROTULO: Record<EstadoDaTarja, string> = {
  rascunho: 'rascunho',
  submetido: 'submetido',
  aprovado: 'aprovado',
  devolvido: 'devolvido',
}

/**
 * Uma ficha do quadro. Cada `Grupo` é uma tarja que atravessa portões.
 *
 * A tarja é sempre clara sobre o quadro escuro: é a superfície de trabalho, e
 * o portão não a tinge. O bloqueio aparece como uma barra na borda esquerda,
 * não como fundo colorido — texto sobre vermelho é ilegível e grita.
 */
export function Tarja({ integrantes, tema, trilha, estado, pendencia, bloqueado }: Props) {
  return (
    <article
      className="relative flex flex-col gap-2 bg-tarja px-4 py-3 text-tinta shadow-[2px_2px_0_0_var(--color-tarja-sombra)]"
      style={bloqueado ? { borderLeft: '4px solid var(--color-portao-duro)' } : undefined}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-sm font-semibold tracking-tight">
          {integrantes.join(' · ')}
          {integrantes.length === 1 && (
            <span className="ml-2 text-[0.6875rem] font-normal uppercase tracking-[0.14em] text-tinta-fraca">
              sozinho
            </span>
          )}
        </h3>
        <span className="dado shrink-0 text-[0.6875rem] uppercase tracking-[0.1em] text-tinta-fraca">
          {ROTULO[estado]}
        </span>
      </header>

      <p className="text-sm">
        {tema ?? <span className="text-tinta-fraca">sem tema alocado</span>}
        {trilha === 'desafio' && (
          <span className="ml-2 border border-tinta-fraca px-1 text-[0.625rem] uppercase tracking-[0.14em]">
            desafio
          </span>
        )}
      </p>

      {pendencia && (
        <p className="dado text-[0.75rem] text-tinta-fraca">
          <span aria-hidden="true">▸ </span>
          {pendencia}
        </p>
      )}
    </article>
  )
}
