'use client'

import { useState, useTransition } from 'react'

import { Botao, Cartao, ErroDaAcao, Etiqueta, Linha } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import { escolheTemaAction } from '@/app/(aluno)/escopo/acoes'

type Tema = {
  id: string
  nome: string
  dificuldade: string
  trilha: 'padrao' | 'desafio'
  briefing: string | null
  disponivel: boolean
}

/**
 * A escolha do tema do grupo.
 *
 * A plataforma **registra** o resultado da negociação; ela não conduz a
 * negociação. O desempate acontece em sala, e é por isso que aqui não há fila,
 * reserva nem sorteio — há um botão que grava o que a turma já combinou.
 *
 * Tema já tomado continua na lista, marcado. Sumir com ele esconderia do grupo o
 * tamanho real da escolha, e ainda faria a lista mudar de tamanho entre dois
 * carregamentos enquanto a sala negocia.
 *
 * O briefing aparece junto do tema de trilha desafio porque é ele que substitui
 * a pesquisa prévia que o curso não tem (Doc 2 §3.4): sem o briefing na tela, a
 * trilha desafio é uma etiqueta sem conteúdo.
 */
export function EscolhaDeTema({
  temas,
  temaEscolhido,
}: {
  temas: readonly Tema[]
  temaEscolhido: { id: string; nome: string; briefing: string | null } | null
}) {
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
  const [emCurso, setEmCurso] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  if (temaEscolhido) {
    return (
      <Cartao legenda="O tema do grupo">
        <p className="font-prosa text-lg leading-snug text-tinta">{temaEscolhido.nome}</p>
        {temaEscolhido.briefing && (
          <p className="mt-2 max-w-[66ch] text-[0.9375rem] leading-relaxed text-tinta-media">
            {temaEscolhido.briefing}
          </p>
        )}
        <p className="legenda mt-3">
          trocar de tema é realocação, e quem realoca é o instrutor
        </p>
      </Cartao>
    )
  }

  return (
    <Cartao legenda="O tema do grupo" contagem={temas.filter((t) => t.disponivel).length}>
      <ErroDaAcao erro={erro} className="mb-3" />

      <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-tinta-media">
        Escolha o que o grupo combinou em sala. A partir daqui o tema é do grupo,
        e trocá-lo passa a ser decisão do instrutor.
      </p>

      <ul className="mt-4">
        {temas.map((tema) => (
          <Linha
            key={tema.id}
            fim={
              tema.disponivel ? (
                <Botao
                  compacto
                  disabled={pendente}
                  onClick={() => {
                    setErro(null)
                    setEmCurso(tema.id)
                    iniciaTransicao(async () => {
                      const resultado = await escolheTemaAction({ temaId: tema.id })
                      if (!resultado.ok) setErro(resultado.erro)
                      setEmCurso(null)
                    })
                  }}
                >
                  {pendente && emCurso === tema.id ? 'escolhendo…' : 'é o nosso'}
                </Botao>
              ) : (
                <Etiqueta>de outro grupo</Etiqueta>
              )
            }
          >
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={tema.disponivel ? 'text-tinta' : 'text-tinta-fraca'}>
                {tema.nome}
              </span>
              <span className="legenda">{tema.dificuldade}</span>
              {tema.trilha === 'desafio' && <Etiqueta tom="destaque">desafio</Etiqueta>}
            </span>
          </Linha>
        ))}
      </ul>
    </Cartao>
  )
}
