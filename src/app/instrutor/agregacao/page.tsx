import Link from 'next/link'
import { redirect } from 'next/navigation'

import { FecharAgregacao } from '@/components/instrutor/fechar-agregacao'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta, Linha } from '@/components/ui'
import { db } from '@/db'
import { turmasDoInstrutor } from '@/db/dia-corrente'
import { alunosDaTurma } from '@/db/grupo'
import { agregacaoFinalizadaEm, notaDoAluno, pendenciasDeInstrumentos } from '@/db/rubrica'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Agregação — PCP' }

/** Rótulos dos instrumentos de presença, para a pendência ser legível. */
const ROTULO_DO_INSTRUMENTO: Record<string, string> = {
  confirmacao_de_push: 'push',
  log_de_obstaculo: 'log de obstáculo',
  contrato_diario: 'contrato diário',
  registro_de_critica: 'crítica',
  reflexao_de_fechamento: 'reflexão',
}

/**
 * A agregação do fechamento (Doc 6 §0.3 · D15).
 *
 * É a última tela do curso, e faz duas coisas: mostra o que falta a cada aluno
 * antes de fechar, e **fecha** — o ato que torna a nota visível para a turma.
 *
 * A pendência é o que o instrutor age em cima: a reflexão da retrospectiva é o
 * único instrumento que captura o pensamento (Doc 6 §5.1), e se a pendência dela
 * não aparecer aqui a tese central deixa de ser avaliada e ninguém percebe a
 * tempo. Por isso a lista mostra quem ainda deve, antes de o número fechar.
 *
 * A nota aparece ao lado — o instrutor vê tudo (Doc 7 §3), inclusive antes do
 * fechamento. O que o fechamento muda é o aluno passar a ver a dele.
 */
export default async function Agregacao({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string }>
}) {
  const { turma: turmaPedida } = await searchParams

  const sessao = await auth()
  if (!sessao?.usuarioId) redirect('/entrar?callbackUrl=/instrutor/agregacao')

  const banco = db()
  const turmas = await turmasDoInstrutor(banco, sessao.usuarioId)

  if (turmas.length === 0) {
    return (
      <Casca>
        <Cabecalho legenda="Fechamento" titulo="Nenhuma turma cadastrada" />
        <AusenciaDeclarada legenda="Turma">
          A agregação é por turma. Enquanto não houver uma, não há nota a fechar.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const turmaId = turmaPedida ?? (turmas.length === 1 ? turmas[0]!.turmaId : null)

  if (!turmaId) {
    return (
      <Casca>
        <Cabecalho legenda="Fechamento" titulo="De qual turma?" />
        <Cartao legenda="Suas turmas">
          <ul>
            {turmas.map((t) => (
              <Linha key={t.turmaId}>
                <Link
                  href={`/instrutor/agregacao?turma=${t.turmaId}`}
                  className="font-medium text-tinta underline-offset-4 hover:underline"
                >
                  {t.nome}
                </Link>
              </Linha>
            ))}
          </ul>
        </Cartao>
      </Casca>
    )
  }

  const turma = turmas.find((t) => t.turmaId === turmaId)
  const [alunos, finalizadaEm] = await Promise.all([
    alunosDaTurma(banco, turmaId),
    agregacaoFinalizadaEm(banco, turmaId),
  ])

  // Por aluno: a nota computada e o que falta. É o D15, aberto uma vez — o custo
  // de calcular por aluno é aceito pelo que a leitura vale antes de fechar.
  const linhas = await Promise.all(
    alunos.map(async (aluno) => ({
      ...aluno,
      nota: await notaDoAluno(banco, aluno.alunoId),
      pendencias: await pendenciasDeInstrumentos(banco, aluno.alunoId),
    })),
  )

  const comPendencia = linhas.filter((l) => l.pendencias.length > 0).length

  return (
    <Casca>
      <Cabecalho
        legenda={turma ? turma.nome : 'Fechamento'}
        titulo={finalizadaEm ? 'Agregação fechada' : 'Fechar o curso'}
        acoes={finalizadaEm ? undefined : <FecharAgregacao turmaId={turmaId} />}
      >
        {finalizadaEm ? (
          <p className="text-tinta-media">
            A nota está visível para a turma. O que falta a um aluno continua à
            vista, mas o número não muda mais.
          </p>
        ) : (
          <p className="text-tinta-media">
            Antes de fechar, veja o que falta a cada aluno. Fechar revela a nota
            para a turma e não tem volta.
          </p>
        )}
      </Cabecalho>

      {finalizadaEm && (
        <Etiqueta tom="destaque">
          fechada
        </Etiqueta>
      )}

      {linhas.length === 0 ? (
        <AusenciaDeclarada legenda="Alunos">
          A turma ainda não tem alunos matriculados. Não há o que agregar.
        </AusenciaDeclarada>
      ) : (
        <>
          {!finalizadaEm && (
            <p className="legenda">
              <span className="dado text-tinta">{comPendencia}</span> de{' '}
              <span className="dado text-tinta">{linhas.length}</span> ainda com pendência
            </p>
          )}

          <Cartao className="max-w-[76ch]">
            <ul>
              {linhas.map((linha) => (
                <Linha
                  key={linha.alunoId}
                  fim={
                    <span className="dado text-tinta-media">
                      {linha.nota.proporcao === null
                        ? '—'
                        : `${Math.round(linha.nota.proporcao * 100)}%`}
                      {!linha.nota.completa && (
                        <span className="legenda ml-2 font-normal">incompleta</span>
                      )}
                    </span>
                  }
                >
                  <span className="flex flex-col gap-1">
                    <span className="flex items-baseline gap-2">
                      <Link
                        href={linha.grupoId ? `/instrutor/grupo/${linha.grupoId}` : '#'}
                        className="text-tinta underline-offset-4 hover:underline"
                      >
                        {linha.nome}
                      </Link>
                      {linha.copiloto && <span className="legenda">copiloto</span>}
                    </span>
                    {linha.pendencias.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {linha.pendencias.map((p) => (
                          <Etiqueta key={p.tipo} tracejada>
                            {ROTULO_DO_INSTRUMENTO[p.tipo] ?? p.tipo}{' '}
                            <span className="dado">
                              {p.entregues}/{p.esperados}
                            </span>
                          </Etiqueta>
                        ))}
                      </span>
                    )}
                  </span>
                </Linha>
              ))}
            </ul>
          </Cartao>
        </>
      )}
    </Casca>
  )
}
