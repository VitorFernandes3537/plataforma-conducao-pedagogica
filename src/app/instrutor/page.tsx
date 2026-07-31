import Link from 'next/link'

import { Cabecalho, Cartao, Casca, EstadoVazio, Etiqueta, Linha } from '@/components/ui'
import { db } from '@/db'
import { turmasDoInstrutor } from '@/db/dia-corrente'

/**
 * A entrada do instrutor: em que dia cada turma está.
 *
 * É a única tela de navegação da área dele, e existe só porque uma pessoa pode
 * conduzir mais de uma turma. Com uma turma só, ela é uma linha e um clique —
 * e é assim que deve ser: o instrutor não navega, ele abre o dia e volta para a
 * sala (ADR 0003 §1).
 */
export default async function EntradaDoInstrutor() {
  const turmas = await turmasDoInstrutor(db())

  return (
    <Casca>
      <Cabecalho legenda="Condução" titulo="Suas turmas" />

      {turmas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma turma cadastrada ainda.">
          A turma entra antes do primeiro dia, com os alunos matriculados por
          usuário do GitHub.
        </EstadoVazio>
      ) : (
        <Cartao>
          <ul>
            {turmas.map((turma) => (
              <Linha
                key={turma.turmaId}
                fim={
                  turma.ordem === null ? (
                    <Etiqueta tracejada>não começou</Etiqueta>
                  ) : (
                    <span className="dado text-tinta-media">
                      dia {turma.ordem} de {turma.totalDeDias}
                    </span>
                  )
                }
              >
                <Link
                  href={`/instrutor/turma/${turma.turmaId}`}
                  className="font-medium text-tinta underline-offset-4 hover:underline"
                >
                  {turma.nome}
                </Link>
              </Linha>
            ))}
          </ul>
        </Cartao>
      )}
    </Casca>
  )
}
