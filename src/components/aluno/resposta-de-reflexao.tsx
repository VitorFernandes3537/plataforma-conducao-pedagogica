'use client'

import { useState, useTransition } from 'react'

import { Botao, CampoDeProsa, ErroDaAcao } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { respondeReflexaoAction } from '@/app/(aluno)/percurso/acoes'

/**
 * A resposta a uma reflexão de fechamento.
 *
 * "Não há resposta certa" (Doc 6 §5.1), então não há momento em que o texto se
 * feche: reescrever é o caminho normal, e a retrospectiva acontece em minutos
 * com o aluno voltando para completar. Por isso o campo continua editável mesmo
 * depois de gravado.
 *
 * É prosa, e é o único instrumento do curso que captura o pensamento — por isso
 * a serifada e a medida de leitura, e não um campo de formulário qualquer.
 */
export function RespostaDeReflexao({
  reflexaoId,
  respostaAtual,
}: {
  reflexaoId: string
  respostaAtual: string | null
}) {
  const [texto, setTexto] = useState(respostaAtual ?? '')
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [ok, setOk] = useState(false)
  const [pendente, iniciaTransicao] = useTransition()

  const inalterado = texto.trim() === (respostaAtual ?? '').trim()

  return (
    <div className="mt-3 flex flex-col gap-3">
      <CampoDeProsa
        id={`reflexao-${reflexaoId}`}
        rotulo="A sua resposta"
        ajuda="Não há resposta certa. Escreva o que você pensa agora, e volte quando quiser."
        rows={4}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setOk(false)
        }}
      />

      <ErroDaAcao erro={erro} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Botao
          variante="acao"
          disabled={pendente || texto.trim().length === 0 || inalterado}
          onClick={() => {
            setErro(null)
            setOk(false)
            iniciaTransicao(async () => {
              const resultado = await respondeReflexaoAction({ reflexaoId, texto })
              if (resultado.ok) setOk(true)
              else setErro(resultado.erro)
            })
          }}
        >
          {pendente ? 'gravando…' : respostaAtual ? 'atualizar' : 'gravar'}
        </Botao>
        {ok && <span className="legenda">gravado</span>}
      </div>
    </div>
  )
}
