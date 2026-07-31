'use client'

import { useState, useTransition } from 'react'

import { Botao, CampoDeProsa, Cartao, ErroDaAcao } from '@/components/ui'
import type { AvisoDeErro, Resultado } from '@/lib/erros'

import { aprovaEscopoAction, devolveEscopoAction } from '@/app/instrutor/fila/acoes'

export type FichaDaFila = {
  respostaDeEscopoId: string
  integrantes: readonly string[]
  tema: string | null
  /**
   * Posição na fila, a partir de 1.
   *
   * É a posição, e não "esperando há N minutos", porque a plataforma não tem
   * relógio: ela sabe a forma do dia, não o minuto em que a sala está. A ordem
   * já carrega a informação que o instrutor precisa — quem entregou primeiro é
   * atendido primeiro —, e minutos decorridos seriam um "agora" inventado,
   * pelo mesmo motivo que a régua não mostra o marcador do agora.
   */
  posicao: number
  respostas: readonly { perguntaId: string; ordem: number; enunciado: string; texto: string }[]
  julgamentos: readonly { id: string; ordem: number; enunciado: string; perguntaId: string | null }[]
}

/**
 * Uma ficha da fila de aprovação.
 *
 * O orçamento é de 3 a 4 minutos por grupo (Doc 2 §4.5), e é ele que decide o
 * layout: tudo o que a decisão exige está aberto na ficha, sem clique para
 * expandir e sem tela de detalhe. Navegação aqui custaria mais que a leitura.
 *
 * **Só o que exige leitura humana aparece.** O que era mecânico já passou no
 * pré-filtro, e repetir a conferência gastaria exatamente os minutos que o
 * pré-filtro existe para poupar (Doc 2 §4.6).
 *
 * Os julgamentos não são caixas de marcar. Nada os registra, e não deveria: a
 * plataforma não guarda o raciocínio da decisão, guarda a decisão. Eles são a
 * lista do que ler antes de escolher.
 *
 * Devolver abre o campo do motivo antes de gravar. O motivo é obrigatório nos
 * três níveis — tela, consulta e CHECK do banco —, porque devolver sem dizer o
 * que corrigir devolve o grupo à fila com o mesmo defeito.
 */
export function Ficha({ ficha }: { ficha: FichaDaFila }) {
  const [devolvendo, setDevolvendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  function executa(acao: () => Promise<Resultado>) {
    setErro(null)
    iniciaTransicao(async () => {
      const resultado = await acao()
      if (!resultado.ok) setErro(resultado.erro)
    })
  }

  return (
    <Cartao className="max-w-[76ch]">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-base font-semibold tracking-tight text-tinta">
          {ficha.integrantes.length > 0 ? ficha.integrantes.join(' · ') : 'Grupo sem integrante'}
          {ficha.integrantes.length === 1 && (
            <span className="legenda ml-2 font-normal">sozinho</span>
          )}
        </h2>
        <p className="legenda">
          <span className="dado text-tinta">{ficha.posicao}</span>
          {ficha.posicao === 1 ? ' · próximo' : ' na fila'}
        </p>
      </header>

      <p className="mt-1 text-[0.9375rem] text-tinta-media">
        {ficha.tema ?? <span className="text-tinta-fraca">sem tema alocado</span>}
      </p>

      <div className="mt-5 flex flex-col gap-4 border-t border-linha pt-4">
        {ficha.respostas.map((resposta) => (
          <div key={resposta.perguntaId}>
            <div className="flex items-baseline gap-3">
              <span className="dado text-[0.6875rem] text-tinta-fraca">{resposta.ordem}</span>
              <h3 className="legenda">{resposta.enunciado}</h3>
            </div>
            <p className="mt-1 max-w-[62ch] whitespace-pre-line font-prosa leading-relaxed text-tinta">
              {resposta.texto}
            </p>
          </div>
        ))}
      </div>

      {ficha.julgamentos.length > 0 && (
        <div className="mt-5 border-t border-linha pt-4">
          <h3 className="legenda">só um humano decide</h3>
          <ul className="mt-2 flex max-w-[62ch] flex-col gap-1.5">
            {ficha.julgamentos.map((julgamento) => (
              <li key={julgamento.id} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-[0.6rem] h-px w-3 shrink-0 bg-linha-forte" />
                <span className="text-[0.9375rem] leading-snug text-tinta-media">
                  {julgamento.enunciado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ErroDaAcao erro={erro} className="mt-4" />

      {devolvendo ? (
        <div className="mt-5 border-t border-linha pt-4">
          <CampoDeProsa
            id={`motivo-${ficha.respostaDeEscopoId}`}
            rotulo="O que precisa ser corrigido"
            ajuda="É o que o grupo vai ler para saber o que refazer. Sem isto, ele volta com o mesmo defeito."
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao
              variante="portao"
              disabled={pendente || motivo.trim().length === 0}
              onClick={() =>
                executa(() =>
                  devolveEscopoAction({
                    respostaDeEscopoId: ficha.respostaDeEscopoId,
                    motivo,
                  }),
                )
              }
            >
              {pendente ? 'devolvendo…' : 'Devolver para correção'}
            </Botao>
            <Botao variante="texto" disabled={pendente} onClick={() => setDevolvendo(false)}>
              cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-linha pt-4">
          <Botao
            variante="acao"
            disabled={pendente}
            onClick={() =>
              executa(() =>
                aprovaEscopoAction({ respostaDeEscopoId: ficha.respostaDeEscopoId }),
              )
            }
          >
            {pendente ? 'aprovando…' : 'Aprovar escopo'}
          </Botao>
          <Botao variante="portao" disabled={pendente} onClick={() => setDevolvendo(true)}>
            Devolver
          </Botao>
        </div>
      )}
    </Cartao>
  )
}
