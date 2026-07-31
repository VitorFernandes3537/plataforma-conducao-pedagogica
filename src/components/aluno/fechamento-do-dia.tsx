'use client'

import { useState, useTransition } from 'react'

import { Botao, CampoDeProsa, Cartao, ErroDaAcao, Etiqueta } from '@/components/ui'
import type { AvisoDeErro, Resultado } from '@/lib/erros'

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
    <Cartao
      legenda="Fechamento"
      acao={pushConfirmado ? <Etiqueta tom="destaque">push confirmado</Etiqueta> : undefined}
    >
      <ErroDaAcao erro={erro} className="mb-3" />

      {/* Estava num `Campo`, que renderiza `<input>` de uma linha. O log é
          prosa de várias linhas e é item avaliado (Doc 6 §5) — um campo de uma
          linha pede uma frase, e o que se pede aqui não é uma frase. A altura
          não é enfeite: ela é a única coisa na tela que diz o tamanho da
          resposta esperada. */}
      <CampoDeProsa
        id="log-do-obstaculo"
        rotulo="Log do obstáculo"
        ajuda="Onde travou, o que tentou, o que destravou. O log entra na avaliação — o código não é corrigido aqui."
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
