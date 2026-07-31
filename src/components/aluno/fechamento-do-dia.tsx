'use client'

import { useState, useTransition } from 'react'

import { Botao, Campo, Cartao, Etiqueta } from '@/components/ui'

import { confirmaPushAction, registraLogAction } from '@/app/(aluno)/acoes'

/**
 * O fechamento: o log do obstáculo e a confirmação do push.
 *
 * Os dois cabem nos 15 minutos do último bloco, e o push acontece DENTRO dele —
 * não é ritual à parte e não consome tempo extra (Doc 4 §2).
 *
 * A confirmação é um botão e nada mais. "O que se verifica é a existência do
 * push do dia" (Doc 5 §6.1): pedir hash, contagem ou mensagem seria verificar
 * granularidade, que o documento recusa de propósito — iniciante trava tentando
 * fazer o commit certo e para de codar.
 */
export function FechamentoDoDia({
  alunoId,
  diaId,
  obstaculoId,
  logAtual,
  pushConfirmado,
}: {
  alunoId: string
  diaId: string
  obstaculoId: string
  logAtual: string | null
  pushConfirmado: boolean
}) {
  const [texto, setTexto] = useState(logAtual ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  function executa(acao: () => Promise<void>) {
    setErro(null)
    iniciaTransicao(async () => {
      try {
        await acao()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'não foi possível gravar')
      }
    })
  }

  return (
    <Cartao
      legenda="Fechamento"
      acao={pushConfirmado ? <Etiqueta tom="destaque">push confirmado</Etiqueta> : undefined}
    >
      {erro && <p className="legenda mb-3 text-portao">{erro}</p>}

      <Campo
        id="log-do-obstaculo"
        rotulo="Log do obstáculo"
        ajuda="Onde travou, o que tentou, o que destravou."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={pendente}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Botao
          variante="acao"
          disabled={pendente}
          onClick={() => executa(() => registraLogAction({ alunoId, diaId, obstaculoId, texto }))}
        >
          {logAtual ? 'atualizar log' : 'gravar log'}
        </Botao>

        {!pushConfirmado && (
          <Botao
            variante="fantasma"
            disabled={pendente}
            onClick={() => executa(() => confirmaPushAction({ alunoId, diaId }))}
          >
            confirmar o push de hoje
          </Botao>
        )}
      </div>
    </Cartao>
  )
}
