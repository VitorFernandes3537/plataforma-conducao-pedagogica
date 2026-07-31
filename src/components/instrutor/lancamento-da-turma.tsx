'use client'

import { useState, useTransition } from 'react'

import { Cartao, ErroDaAcao, Etiqueta, Linha } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

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
  const [erro, setErro] = useState<AvisoDeErro | null>(null)
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
      <ErroDaAcao erro={erro} className="mb-3" />

      {/* Duas colunas quando o cartão é largo, e é isso que resolve a tensão
          entre "preencher a largura" e "não abrir os dois extremos": a linha
          `nome … alvo` continua curta porque a coluna é curta, e a turma inteira
          cabe sem rolar — que é o que o instrutor precisa circulando pela sala.

          `columns` e não `grid` porque a lista é uma coluna que transborda para
          a seguinte: com grid, ordem alfabética viraria leitura em zigue-zague. */}
      <ul className="gap-x-10 [column-fill:balance] lg:columns-2">
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
                          const resultado = await lancaAvaliacaoAction({
                            alunoId: aluno.alunoId,
                            diaId,
                            obstaculoId,
                            valor: nivel.valor,
                            turmaId,
                          })
                          if (!resultado.ok) setErro(resultado.erro)
                          setEmCurso(null)
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
