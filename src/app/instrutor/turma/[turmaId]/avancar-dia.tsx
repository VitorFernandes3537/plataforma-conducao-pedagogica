'use client'

import { useState, useTransition } from 'react'

import { Botao, ErroDaAcao } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { avancaDiaAction } from '../../acoes'

/**
 * O botão que faz a turma andar.
 *
 * Pede confirmação porque avançar não tem volta: um dia que aconteceu não
 * desacontece, e o ponteiro não retrocede. A confirmação é uma frase e um
 * segundo clique — não um diálogo, que numa sala em pé é pior que o erro.
 */
export function AvancarDia({ turmaId, rotulo }: { turmaId: string; rotulo: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  if (!confirmando) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Botao variante="fantasma" onClick={() => setConfirmando(true)}>
          {rotulo}
        </Botao>
        <ErroDaAcao erro={erro} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="legenda">avançar não tem volta</p>
      <div className="flex gap-2">
        <Botao variante="texto" onClick={() => setConfirmando(false)} disabled={pendente}>
          cancelar
        </Botao>
        <Botao
          variante="acao"
          disabled={pendente}
          onClick={() => {
            setErro(null)
            iniciaTransicao(async () => {
              const resultado = await avancaDiaAction(turmaId)
              if (resultado.ok) setConfirmando(false)
              else setErro(resultado.erro)
            })
          }}
        >
          {pendente ? 'avançando…' : 'confirmar'}
        </Botao>
      </div>
      <ErroDaAcao erro={erro} />
    </div>
  )
}
