import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

type Comum = {
  /** Rótulo visível. Nunca só `placeholder`: placeholder desaparece ao digitar. */
  rotulo: string
  /** Orientação curta, abaixo do campo. */
  ajuda?: string | undefined
  /** Mensagem de erro. Explica o que houve e como resolver, sem se desculpar. */
  erro?: string | undefined
}

const BASE =
  'w-full rounded-[var(--radius-controle)] border bg-superficie px-3 py-2 text-[0.9375rem] text-tinta placeholder:text-tinta-tenue'

function Moldura({
  rotulo,
  ajuda,
  erro,
  id,
  children,
}: Comum & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="legenda">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p className="text-[0.8125rem] leading-snug" style={{ color: 'var(--color-portao)' }}>
          {erro}
        </p>
      ) : (
        ajuda && <p className="text-[0.8125rem] leading-snug text-tinta-fraca">{ajuda}</p>
      )}
    </div>
  )
}

/**
 * Campo de uma linha.
 *
 * O rótulo é sempre visível, porque `placeholder` desaparece assim que a pessoa
 * digita — e num formulário de sete perguntas isso custa releitura.
 */
export function Campo({
  rotulo,
  ajuda,
  erro,
  id,
  className = '',
  ...resto
}: Comum & InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <Moldura rotulo={rotulo} ajuda={ajuda} erro={erro} id={id}>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        className={`${BASE} ${className}`}
        style={{ borderColor: erro ? 'var(--color-portao)' : 'var(--color-linha-forte)' }}
        {...resto}
      />
    </Moldura>
  )
}

/**
 * Campo de prosa.
 *
 * Serifada, porque aqui mora texto humano — log de obstáculo, reflexão,
 * resposta do formulário de escopo. Medida contida para a leitura não cansar.
 */
export function CampoDeProsa({
  rotulo,
  ajuda,
  erro,
  id,
  className = '',
  rows = 5,
  ...resto
}: Comum & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <Moldura rotulo={rotulo} ajuda={ajuda} erro={erro} id={id}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        className={`${BASE} font-prosa leading-relaxed ${className}`}
        style={{ borderColor: erro ? 'var(--color-portao)' : 'var(--color-linha-forte)' }}
        {...resto}
      />
    </Moldura>
  )
}
