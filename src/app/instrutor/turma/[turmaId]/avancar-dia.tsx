'use client'

import { useState, useTransition } from 'react'

import { Botao } from '@/components/ui'

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
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  if (!confirmando) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Botao variante="fantasma" onClick={() => setConfirmando(true)}>
          {rotulo}
        </Botao>
        {erro && <p className="legenda text-portao">{erro}</p>}
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
              try {
                await avancaDiaAction(turmaId)
                setConfirmando(false)
              } catch (e) {
                setErro(e instanceof Error ? e.message : 'não foi possível avançar')
              }
            })
          }}
        >
          {pendente ? 'avançando…' : 'confirmar'}
        </Botao>
      </div>
      {erro && <p className="legenda text-portao">{erro}</p>}
    </div>
  )
}
