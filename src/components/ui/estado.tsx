import { MarcaBilhete } from '@/components/marcas'

import { Anotacao } from './anotacao'

/**
 * Ausência declarada.
 *
 * O que ainda não existe recebe forma própria — filete tracejado — e uma frase
 * dizendo **quando** aparece e **por quê**. Cartão vazio dizendo "sem dados"
 * parece defeito; ausência declarada parece regra.
 *
 * É o padrão para "aluno não vê nota antes da agregação" (Doc 7 §3) e para
 * material com liberação temporizada.
 */
export function AusenciaDeclarada({
  legenda,
  children,
  anotacao,
  className = '',
}: {
  legenda: string
  children: React.ReactNode
  /** Comentário de margem, opcional. */
  anotacao?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Medida própria: ausência declarada é prosa, e prosa não atravessa um
          monitor. A casca não a segura mais — quem tem medida é o conteúdo. */}
      <section className="max-w-[62ch] rounded-[var(--radius-cartao)] border border-dashed border-linha-forte px-5 py-4">
        <h3 className="legenda">{legenda}</h3>
        <p className="mt-2 font-prosa text-[0.875rem] leading-snug text-tinta-fraca">{children}</p>
      </section>
      {anotacao && (
        <Anotacao tom="tenue" inclinacao="direita" className="absolute -right-2 -top-5">
          {anotacao}
        </Anotacao>
      )}
    </div>
  )
}

/**
 * Estado vazio.
 *
 * Convite à ação, não aviso de erro. A marca à mão entra aqui porque é um dos
 * poucos lugares em que a interface fala com uma pessoa em vez de exibir dado.
 */
export function EstadoVazio({
  titulo,
  children,
  acao,
  className = '',
}: {
  titulo: string
  children?: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex max-w-[62ch] flex-col items-center gap-3 rounded-[var(--radius-cartao)] border border-dashed border-linha-forte px-6 py-10 text-center ${className}`}
    >
      <MarcaBilhete className="h-12 w-auto text-tinta-tenue" />
      <p className="font-prosa text-base text-tinta">{titulo}</p>
      {children && (
        <p className="max-w-[46ch] text-[0.875rem] leading-snug text-tinta-fraca">{children}</p>
      )}
      {acao}
    </div>
  )
}

/**
 * Aviso.
 *
 * Orientação em linha, ancorada por filete lateral. Sem ícone: em superfície
 * de decisão, rótulo escrito é mais preciso que pictograma.
 *
 * `portao` é para bloqueio — o que impede prosseguir. Nunca para ênfase geral.
 */
export function Aviso({
  tom = 'destaque',
  children,
  className = '',
}: {
  tom?: 'destaque' | 'portao'
  children: React.ReactNode
  className?: string
}) {
  const cor = tom === 'portao' ? 'var(--color-portao)' : 'var(--color-destaque)'
  const fundo = tom === 'portao' ? 'var(--color-portao-tenue)' : 'var(--color-destaque-tenue)'

  // O detector marca filete lateral grosso como tique de interface gerada. Aqui
  // fica, e por dois motivos: 3px é a espessura reservada do sistema — `Cartao`
  // usa a mesma para marcar bloqueio —, e o resto da interface é 1px de
  // `--color-linha`. Afinar só este ponto quebraria a consistência sem ganho.
  // impeccable-disable-next-line side-tab
  const filete = `3px solid ${cor}`

  return (
    <div
      className={`rounded-[var(--radius-controle)] px-4 py-3 text-[0.875rem] leading-snug ${className}`}
      style={{ backgroundColor: fundo, borderLeft: filete, color: 'var(--color-tinta)' }}
    >
      {children}
    </div>
  )
}
