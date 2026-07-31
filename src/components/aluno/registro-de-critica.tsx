'use client'

import { useState, useTransition } from 'react'

import { Botao, CampoDeProsa, ErroDaAcao } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { registraCriticaAction } from '@/app/(aluno)/critica/[rodadaId]/acoes'

/**
 * O formulário de registro de uma crítica.
 *
 * Os dois campos são a regra inteira do Doc 5 §4.2, e a ordem deles é a ordem
 * da regra: **explicar o tema do colega antes de olhar o código**, e só então o
 * cenário que quebra. Um campo antes do outro não é acaso — é o que separa a
 * crítica entre iniciantes do elogio mútuo.
 *
 * A ajuda de cada campo carrega a fronteira que a plataforma não verifica:
 * "achei confuso" não é cenário. Distinguir opinião de cenário é leitura humana
 * (Doc 7 §6), então o texto ensina em vez de validar.
 *
 * Já registrado, continua editável: a crítica é escrita durante a sessão, e
 * travar a primeira versão transformaria um engano de digitação em registro.
 */
export function RegistroDeCritica({
  rodadaId,
  parId,
  registro,
}: {
  rodadaId: string
  parId: string
  registro: { explicacaoDoTema: string; cenarioQueQuebra: string } | null
}) {
  const [tema, setTema] = useState(registro?.explicacaoDoTema ?? '')
  const [cenario, setCenario] = useState(registro?.cenarioQueQuebra ?? '')
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [ok, setOk] = useState(false)
  const [pendente, iniciaTransicao] = useTransition()

  const vazio = tema.trim().length === 0 || cenario.trim().length === 0

  return (
    <div className="flex flex-col gap-4">
      <CampoDeProsa
        id={`tema-${parId}`}
        rotulo="O tema do colega, em uma frase"
        ajuda="Escreva antes de abrir o código. Se não dá para explicar o domínio, ainda não dá para criticá-lo."
        rows={3}
        value={tema}
        onChange={(e) => {
          setTema(e.target.value)
          setOk(false)
        }}
      />

      <CampoDeProsa
        id={`cenario-${parId}`}
        rotulo="Um cenário concreto que quebra"
        ajuda='Um caso, não uma opinião. "Achei confuso" não conta; "e se cancelarem depois de já ter começado?" conta.'
        rows={3}
        value={cenario}
        onChange={(e) => {
          setCenario(e.target.value)
          setOk(false)
        }}
      />

      <ErroDaAcao erro={erro} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Botao
          variante="acao"
          disabled={pendente || vazio}
          onClick={() => {
            setErro(null)
            setOk(false)
            iniciaTransicao(async () => {
              const resultado = await registraCriticaAction({
                rodadaId,
                parId,
                explicacaoDoTema: tema,
                cenarioQueQuebra: cenario,
              })
              if (resultado.ok) setOk(true)
              else setErro(resultado.erro)
            })
          }}
        >
          {pendente ? 'registrando…' : registro ? 'atualizar a crítica' : 'registrar a crítica'}
        </Botao>
        {ok && <span className="legenda">registrado</span>}
      </div>
    </div>
  )
}
