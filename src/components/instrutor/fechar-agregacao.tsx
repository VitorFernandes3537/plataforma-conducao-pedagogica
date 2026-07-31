'use client'

import { useState, useTransition } from 'react'

import { Botao, ErroDaAcao } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { fechaAgregacaoAction } from '@/app/instrutor/agregacao/acoes'

/**
 * Fechar a agregação — o último ato do curso.
 *
 * Pede confirmação porque é o que revela a nota para a turma inteira, e porque
 * não se desfaz pela tela: `finalizaAgregacao` recusa fechar o que já foi
 * fechado. É a mesma cautela do avançar-dia — o que não tem volta se confirma.
 */
export function FecharAgregacao({ turmaId }: { turmaId: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  if (!confirmando) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Botao variante="acao" onClick={() => setConfirmando(true)}>
          Fechar a agregação
        </Botao>
        <ErroDaAcao erro={erro} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="legenda">fechar revela a nota para a turma, e não tem volta</p>
      <div className="flex gap-2">
        <Botao variante="texto" disabled={pendente} onClick={() => setConfirmando(false)}>
          cancelar
        </Botao>
        <Botao
          variante="acao"
          disabled={pendente}
          onClick={() => {
            setErro(null)
            iniciaTransicao(async () => {
              const resultado = await fechaAgregacaoAction({ turmaId })
              if (!resultado.ok) {
                setErro(resultado.erro)
                setConfirmando(false)
              }
            })
          }}
        >
          {pendente ? 'fechando…' : 'confirmar o fechamento'}
        </Botao>
      </div>
      <ErroDaAcao erro={erro} />
    </div>
  )
}
