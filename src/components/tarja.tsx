export type EstadoDaTarja = 'rascunho' | 'submetido' | 'aprovado' | 'devolvido'

export type DadosDaTarja = {
  /** Um integrante só é caso válido, não exceção (Doc 2 §2.4.1). */
  integrantes: readonly string[]
  tema: string | null
  trilha?: 'padrao' | 'desafio' | undefined
  estado: EstadoDaTarja
  /**
   * O que o instrutor precisa ler para decidir. Doc 3 §2: "10 duplas, 3h: o
   * diagnóstico precisa levar 30 segundos".
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
 * Ficha em forma de ação: exige leitura e decisão agora.
 *
 * Cresce e mostra o sintoma. Hierarquia por TAMANHO, não por rótulo. Bloqueio
 * é filete de marcador na borda, não fundo colorido: texto sobre vermelho é
 * ilegível e grita.
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
      className="cartao flex flex-col gap-2.5 px-4 py-3.5"
      style={
        bloqueado
          ? { borderLeftWidth: '3px', borderLeftColor: 'var(--color-portao)' }
          : undefined
      }
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[0.9375rem] font-semibold leading-tight text-tinta">
          {integrantes.join(' · ')}
          {integrantes.length === 1 && (
            <span className="legenda ml-2 font-normal">sozinho</span>
          )}
        </h3>
        <span className="legenda shrink-0">{ROTULO[estado]}</span>
      </header>

      <p className="flex items-center gap-2 text-[0.8125rem] leading-tight text-tinta-media">
        {tema ?? <span className="text-tinta-fraca">sem tema alocado</span>}
        {trilha === 'desafio' && (
          <span className="dado border border-linha-forte px-1 text-[0.5625rem] uppercase tracking-[0.12em]">
            desafio
          </span>
        )}
      </p>

      {sintoma && (
        <p className="border-t border-linha pt-2.5 text-[0.8125rem] leading-snug text-tinta">
          {sintoma}
        </p>
      )}
    </article>
  )
}

/**
 * Ficha resolvida: encolhe para uma linha.
 *
 * Continua visível — o instrutor precisa saber que existe e está fechado — mas
 * não disputa atenção.
 */
export function TarjaResolvida({ integrantes, tema, estado }: DadosDaTarja) {
  return (
    <article className="flex items-baseline justify-between gap-3 border-b border-linha py-2">
      <h3 className="truncate text-[0.8125rem] text-tinta-media">
        {integrantes.join(' · ')}
        <span className="ml-2 text-tinta-fraca">{tema}</span>
      </h3>
      <span className="legenda shrink-0">{ROTULO[estado]}</span>
    </article>
  )
}
