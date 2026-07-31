'use client'

import { useState, useTransition } from 'react'

import { Botao, Campo, Cartao, ErroDaAcao, Etiqueta } from '@/components/ui'
import type { AvisoDeErro, Resultado } from '@/lib/erros'

import { abreContratoAction, fechaContratoAction } from '@/app/(aluno)/acoes'

type Contrato = {
  faremos: string
  naoFaremos: string
  cumprido: boolean | null
  motivoDoFechamento: string | null
} | null

/**
 * O contrato diário: duas linhas na abertura, uma no fechamento.
 *
 * A segunda linha é a que importa — é a vacina contra o crescimento de escopo
 * no dia, e cumpre no dia a mesma função que o "fora de escopo" cumpre no
 * projeto inteiro (Doc 5 §7.1). Por isso ela tem o mesmo peso visual da
 * primeira, e não é um campo opcional embaixo.
 *
 * O orçamento é de 2 minutos na abertura e 1 no fechamento. Dois campos e um
 * botão cabem nisso; qualquer coisa a mais não cabe, e o instrumento inteiro
 * custa 45 minutos no curso todo.
 */
export function ContratoDeHoje({
  alunoId,
  diaId,
  contrato,
}: {
  alunoId: string
  diaId: string
  contrato: Contrato
}) {
  const [faremos, setFaremos] = useState(contrato?.faremos ?? '')
  const [naoFaremos, setNaoFaremos] = useState(contrato?.naoFaremos ?? '')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  const fechado = contrato?.cumprido !== null && contrato?.cumprido !== undefined

  function executa(acao: () => Promise<Resultado>) {
    setErro(null)
    iniciaTransicao(async () => {
      const resultado = await acao()
      if (!resultado.ok) setErro(resultado.erro)
    })
  }

  if (fechado) {
    return (
      <Cartao
        legenda="Contrato de hoje"
        acao={
          <Etiqueta tom={contrato!.cumprido ? 'destaque' : 'neutro'}>
            {contrato!.cumprido ? 'cumprido' : 'não cumprido'}
          </Etiqueta>
        }
      >
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="legenda">hoje faremos</dt>
            <dd className="text-tinta">{contrato!.faremos}</dd>
          </div>
          <div>
            <dt className="legenda">hoje NÃO faremos</dt>
            <dd className="text-tinta">{contrato!.naoFaremos}</dd>
          </div>
          <div>
            <dt className="legenda">por quê</dt>
            <dd className="text-tinta-media">{contrato!.motivoDoFechamento}</dd>
          </div>
        </dl>
      </Cartao>
    )
  }

  return (
    <Cartao legenda="Contrato de hoje">
      <ErroDaAcao erro={erro} className="mb-3" />

      <div className="flex flex-col gap-4">
        <Campo
          id="faremos"
          rotulo="Hoje faremos"
          value={faremos}
          onChange={(e) => setFaremos(e.target.value)}
          disabled={pendente}
        />
        <Campo
          id="nao-faremos"
          rotulo="Hoje NÃO faremos"
          ajuda="É esta linha que impede o dia de crescer."
          value={naoFaremos}
          onChange={(e) => setNaoFaremos(e.target.value)}
          disabled={pendente}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Botao
            variante="acao"
            disabled={pendente}
            onClick={() =>
              executa(() => abreContratoAction({ alunoId, diaId, faremos, naoFaremos }))
            }
          >
            {contrato ? 'corrigir' : 'registrar'}
          </Botao>
          {contrato && <span className="legenda">registrado — dá para corrigir até fechar</span>}
        </div>
      </div>

      {contrato && (
        <div className="mt-6 border-t border-linha pt-5">
          <p className="legenda">no fechamento</p>
          <Campo
            id="motivo-do-fechamento"
            rotulo="Cumpriu? Por quê?"
            className="mt-2"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={pendente}
          />
          <div className="mt-3 flex gap-2">
            <Botao
              variante="acao"
              disabled={pendente}
              onClick={() =>
                executa(() => fechaContratoAction({ alunoId, diaId, cumprido: true, motivo }))
              }
            >
              cumprimos
            </Botao>
            <Botao
              variante="fantasma"
              disabled={pendente}
              onClick={() =>
                executa(() => fechaContratoAction({ alunoId, diaId, cumprido: false, motivo }))
              }
            >
              não cumprimos
            </Botao>
          </div>
        </div>
      )}
    </Cartao>
  )
}
