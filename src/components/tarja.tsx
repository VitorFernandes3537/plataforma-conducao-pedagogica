export type EstadoDaTarja = 'rascunho' | 'submetido' | 'aprovado' | 'devolvido'

export type DadosDaTarja = {
  /** Um integrante só é caso válido, não exceção (Doc 2 §2.4.1). */
  integrantes: readonly string[]
  tema: string | null
  trilha?: 'padrao' | 'desafio' | undefined
  estado: EstadoDaTarja
  /**
   * O que o instrutor precisa ler para decidir. Em dia de parede é o sintoma
   * observável do obstáculo — Doc 3 §2: "10 duplas, 3h: o diagnóstico precisa
   * levar 30 segundos".
   */
  sintoma?: string | undefined
  bloqueado?: boolean | undefined
}

const ROTULO: Record<EstadoDaTarja, string> = {
  rascunho: 'rascunho',
  submetido: 'submetido',
  aprovado: 'aprovado',
  devolvido: 'devolvido',
}

/**
 * Tarja em forma de ação: exige leitura e decisão agora.
 *
 * Cresce e mostra o sintoma. Hierarquia por TAMANHO, não por rótulo — a
 * versão anterior dava peso idêntico a seis fichas e por isso não ajudava a
 * triar nada.
 */
export function TarjaEmAcao({
  integrantes,
  tema,
  trilha,
  estado,
  sintoma,
  bloqueado,
}: DadosDaTarja) {
  return (
    <article
      className="flex flex-col gap-2 bg-tarja px-4 py-3 text-tinta"
      style={
        bloqueado
          ? { borderLeft: '3px solid var(--color-portao-duro)' }
          : { borderLeft: '3px solid transparent' }
      }
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[0.9375rem] font-semibold leading-tight">
          {integrantes.join(' · ')}
          {integrantes.length === 1 && (
            <span className="ml-2 text-[0.625rem] font-normal uppercase tracking-[0.14em] text-tinta-fraca">
              sozinho
            </span>
          )}
        </h3>
        <span className="dado shrink-0 text-[0.625rem] uppercase tracking-[0.1em] text-tinta-fraca">
          {ROTULO[estado]}
        </span>
      </header>

      <p className="flex items-center gap-2 text-[0.8125rem] leading-tight">
        {tema ?? <span className="text-tinta-fraca">sem tema alocado</span>}
        {trilha === 'desafio' && (
          <span className="border border-tinta-fraca px-1 text-[0.5625rem] uppercase tracking-[0.14em]">
            desafio
          </span>
        )}
      </p>

      {sintoma && (
        <p className="border-t border-tarja-sombra pt-2 text-[0.8125rem] leading-snug">{sintoma}</p>
      )}
    </article>
  )
}

/**
 * Tarja resolvida: encolhe para uma linha.
 *
 * Quem já está resolvido sai do caminho. Continua visível — o instrutor
 * precisa saber que existe e está fechado — mas não disputa atenção.
 */
export function TarjaResolvida({ integrantes, tema, estado }: DadosDaTarja) {
  return (
    <article className="flex items-baseline justify-between gap-3 border-b border-regua-fraca px-1 py-1.5">
      <h3 className="truncate text-[0.8125rem] text-clara-fraca">
        {integrantes.join(' · ')}
        <span className="ml-2 text-clara-fraca/70">{tema}</span>
      </h3>
      <span className="dado shrink-0 text-[0.625rem] uppercase tracking-[0.1em] text-clara-fraca">
        {ROTULO[estado]}
      </span>
    </article>
  )
}
