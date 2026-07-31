'use client'

import { useState, useTransition } from 'react'

import { Cartao, Etiqueta, Linha } from '@/components/ui'

import { lancaAvaliacaoAction } from '@/app/instrutor/acoes'

type Nivel = {
  id: string
  valor: number
  descritor: string
  contaComoSuperacao: boolean
}

type AlunoNoLancamento = {
  alunoId: string
  nome: string
  grupoId: string | null
  valor: number | null
  descritor: string | null
  superado: boolean | null
}

type Props = {
  turmaId: string
  diaId: string
  obstaculoId: string
  escala: readonly Nivel[]
  alunos: readonly AlunoNoLancamento[]
}

/**
 * O lançamento da avaliação do dia, turma inteira numa tela.
 *
 * Um clique por aluno, sem navegação e sem salvar em lote. O instrutor lança
 * enquanto circula pela implementação, e qualquer passo a mais faz a captura
 * contínua desabar de volta para o fim de semana de correção que o Doc 6 §0.3
 * existe para evitar.
 *
 * Os botões mostram o VALOR e carregam o descritor no `title`. O descritor é o
 * que faz o instrutor lançar amanhã a mesma nota que lançou hoje, mas ele não
 * cabe na linha — e uma linha por aluno é o que permite ver a turma inteira sem
 * rolar.
 *
 * Quem ainda não tem nota fica visualmente distinto de quem tirou zero. As duas
 * situações pedem ações opostas: uma é conversa com o aluno, a outra é um
 * lançamento que ficou para trás.
 */
export function LancamentoDaTurma({ turmaId, diaId, obstaculoId, escala, alunos }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [emCurso, setEmCurso] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  const semNota = alunos.filter((a) => a.valor === null).length

  return (
    <Cartao
      legenda="Avaliação do dia"
      contagem={alunos.length}
      acao={
        semNota > 0 ? (
          <Etiqueta tracejada>
            <span className="dado">{semNota}</span> sem nota
          </Etiqueta>
        ) : undefined
      }
    >
      {erro && <p className="legenda mb-3 text-portao">{erro}</p>}

      <ul>
        {alunos.map((aluno) => (
          <Linha
            key={aluno.alunoId}
            fim={
              <span className="flex gap-1">
                {escala.map((nivel) => {
                  const escolhido = aluno.valor === nivel.valor
                  const ocupado = pendente && emCurso === aluno.alunoId
                  return (
                    <button
                      key={nivel.id}
                      type="button"
                      title={nivel.descritor}
                      disabled={ocupado}
                      aria-pressed={escolhido}
                      className={`dado h-7 w-7 rounded-controle border text-xs transition-colors ${
                        escolhido
                          ? 'border-tinta bg-acao text-superficie'
                          : 'border-linha-forte text-tinta-fraca hover:border-tinta hover:text-tinta'
                      } ${ocupado ? 'opacity-40' : ''}`}
                      onClick={() => {
                        setErro(null)
                        setEmCurso(aluno.alunoId)
                        iniciaTransicao(async () => {
                          try {
                            await lancaAvaliacaoAction({
                              alunoId: aluno.alunoId,
                              diaId,
                              obstaculoId,
                              valor: nivel.valor,
                              turmaId,
                            })
                          } catch (e) {
                            setErro(e instanceof Error ? e.message : 'não foi possível lançar')
                          } finally {
                            setEmCurso(null)
                          }
                        })
                      }}
                    >
                      {nivel.valor}
                    </button>
                  )
                })}
              </span>
            }
          >
            <span className={aluno.valor === null ? 'text-tinta-fraca' : 'text-tinta'}>
              {aluno.nome}
            </span>
          </Linha>
        ))}
      </ul>
    </Cartao>
  )
}
