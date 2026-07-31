'use client'

import { useState, useTransition } from 'react'

import { Botao, ErroDaAcao, Etiqueta } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { registraDefesaAction } from '@/app/instrutor/grupo/[grupoId]/acoes'

type Pergunta = { id: string; enunciado: string }

/**
 * O registro da defesa oral de um grupo (Doc 6 §6).
 *
 * O instrutor marca **quais perguntas** do banco fez a este grupo. É a única
 * coisa que a defesa grava, e é o que a torna auditável — a nota por eixo não
 * entra, porque a série não diz quanto a defesa ajusta (CLAUDE §10).
 *
 * O banco de perguntas fica à vista, como marca. Duas por grupo é o de praxe,
 * mas o número não é travado: quem conta é o instrutor, e travar em dois seria a
 * quantidade pedagógica virando constante.
 *
 * Já registrada, a defesa mostra o que foi perguntado e não reabre o formulário
 * por acidente — registrar de novo é escolha, com o histórico à vista.
 */
export function RegistroDeDefesa({
  grupoId,
  banco,
  jaRegistradas,
}: {
  grupoId: string
  banco: readonly Pergunta[]
  jaRegistradas: readonly string[]
}) {
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set())
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [ok, setOk] = useState(false)
  const [pendente, iniciaTransicao] = useTransition()

  function alterna(id: string) {
    setOk(false)
    setMarcadas((atual) => {
      const proxima = new Set(atual)
      if (proxima.has(id)) proxima.delete(id)
      else proxima.add(id)
      return proxima
    })
  }

  if (jaRegistradas.length > 0) {
    return (
      <div>
        <p className="legenda">o que foi perguntado</p>
        <ul className="mt-2 flex flex-col gap-2">
          {jaRegistradas.map((enunciado, i) => (
            <li key={`${enunciado}-${i}`} className="flex items-start gap-3">
              <span className="dado mt-[0.15rem] shrink-0 text-[0.75rem] text-tinta-fraca">
                {i + 1}
              </span>
              <span className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta">
                {enunciado}
              </span>
            </li>
          ))}
        </ul>
        <Etiqueta className="mt-4" tom="destaque">
          defesa registrada
        </Etiqueta>
      </div>
    )
  }

  if (banco.length === 0) {
    return (
      <p className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta-media">
        O banco de perguntas da defesa é configuração do curso, e ainda não foi
        cadastrado. Sem ele não há o que registrar.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta-media">
        Marque as perguntas que você fez a este grupo. É o registro que explica,
        depois, por que a nota mudou — a defesa ajusta os eixos, mas o quanto é
        decisão da série, não da plataforma.
      </p>

      <ul className="flex flex-col gap-1">
        {banco.map((pergunta) => {
          const marcada = marcadas.has(pergunta.id)
          return (
            <li key={pergunta.id}>
              <button
                type="button"
                aria-pressed={marcada}
                onClick={() => alterna(pergunta.id)}
                className={`flex w-full items-start gap-3 rounded-[var(--radius-controle)] border px-3 py-2 text-left transition-colors ${
                  marcada
                    ? 'border-tinta bg-recuo'
                    : 'border-linha hover:border-linha-forte'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-[0.1rem] grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border text-[0.625rem] ${
                    marcada ? 'border-tinta bg-acao text-superficie' : 'border-linha-forte'
                  }`}
                >
                  {marcada ? '✓' : ''}
                </span>
                <span className="text-[0.9375rem] leading-snug text-tinta">
                  {pergunta.enunciado}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <ErroDaAcao erro={erro} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Botao
          variante="acao"
          disabled={pendente || marcadas.size === 0}
          onClick={() => {
            setErro(null)
            setOk(false)
            iniciaTransicao(async () => {
              const resultado = await registraDefesaAction({
                grupoId,
                perguntasIds: [...marcadas],
              })
              if (resultado.ok) setOk(true)
              else setErro(resultado.erro)
            })
          }}
        >
          {pendente ? 'registrando…' : 'Registrar a defesa'}
        </Botao>
        <span className="legenda">
          <span className="dado text-tinta">{marcadas.size}</span>{' '}
          {marcadas.size === 1 ? 'pergunta marcada' : 'perguntas marcadas'}
        </span>
        {ok && <span className="legenda">registrado</span>}
      </div>
    </div>
  )
}
