import { redirect } from 'next/navigation'

import { RespostaDeReflexao } from '@/components/aluno/resposta-de-reflexao'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { situacaoDasReflexoes } from '@/db/reflexao'
import { agregacaoFinalizadaEm, notaVisivel } from '@/db/rubrica'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Percurso — PCP' }

/**
 * O percurso do aluno: a retrospectiva de fechamento e a nota, quando liberada.
 *
 * Duas coisas moram aqui, e a ordem é a do curso. Primeiro as **reflexões** — a
 * retrospectiva do D14 e do D15 (Doc 6 §5.1 e §7), que é o único instrumento que
 * captura o pensamento e por isso não pode sumir da tela por não ter sido
 * respondida. Depois a **nota**, que não existe para o aluno antes da agregação.
 *
 * A nota é filtro de visibilidade, e ele é de consulta, não de tela (CLAUDE §5.3):
 * `notaVisivel` recusa devolver a nota do aluno enquanto a agregação está aberta.
 * Por isso a tela lê antes se a agregação fechou — e mostra a ausência declarada
 * em vez de arrancar um erro de dentro da regra.
 */
export default async function Percurso() {
  const sessao = await auth()
  if (!sessao?.usuarioId) redirect('/entrar?callbackUrl=/percurso')

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)

  if (!matricula) {
    return (
      <Casca>
        <Cabecalho legenda="Percurso" titulo="Você ainda não está numa turma" />
        <AusenciaDeclarada legenda="Matrícula">
          O percurso é o seu — as reflexões que você escreve e a nota que fecha o
          curso. Ele aparece quando o instrutor te incluir numa turma.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const reflexoes = await situacaoDasReflexoes(banco, matricula.alunoId)
  const finalizadaEm = await agregacaoFinalizadaEm(banco, matricula.turmaId)

  const ator = { papel: 'aluno' as const, usuarioId: sessao.usuarioId, grupoId: matricula.grupoId }
  const nota = finalizadaEm ? await notaVisivel(banco, matricula.alunoId, ator) : null

  const pendentes = reflexoes.filter((r) => !r.respondida).length

  return (
    <Casca>
      <Cabecalho legenda="Percurso" titulo="O seu percurso">
        A retrospectiva do curso, e a nota quando ela fecha. Não há resposta
        certa nas reflexões — é o que você pensa que conta.
      </Cabecalho>

      {/* ── Reflexões ────────────────────────────────────────────────── */}
      <Cartao
        legenda="Reflexões de fechamento"
        acao={
          reflexoes.length > 0 && pendentes > 0 ? (
            <Etiqueta tracejada>
              <span className="dado">{pendentes}</span> sem resposta
            </Etiqueta>
          ) : undefined
        }
      >
        {reflexoes.length === 0 ? (
          <p className="max-w-[62ch] text-tinta-media">
            As reflexões de fechamento são configuração do curso, e ainda não
            foram cadastradas.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {reflexoes.map((reflexao) => (
              <section
                key={reflexao.reflexaoId}
                className="border-b border-linha pb-6 last:border-b-0 last:pb-0"
              >
                <h3 className="max-w-[52ch] font-prosa text-lg leading-snug text-tinta">
                  {reflexao.enunciado}
                </h3>
                <RespostaDeReflexao
                  reflexaoId={reflexao.reflexaoId}
                  respostaAtual={reflexao.texto}
                />
              </section>
            ))}
          </div>
        )}
      </Cartao>

      {/* ── Nota ─────────────────────────────────────────────────────── */}
      {!nota ? (
        <AusenciaDeclarada legenda="Nota" anotacao="fecha no D15">
          A nota aparece depois da agregação, no fim do curso — nem para você, nem
          para o instrutor, antes disso. Até lá o que existe é o percurso, não o
          número.
        </AusenciaDeclarada>
      ) : (
        <Cartao
          legenda="Nota"
          acao={
            nota.completa ? undefined : <Etiqueta tracejada>ainda incompleta</Etiqueta>
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="dado text-3xl font-medium tracking-tight text-tinta">
              {nota.proporcao === null ? '—' : `${Math.round(nota.proporcao * 100)}%`}
            </span>
            <span className="legenda">do máximo, ponderado pelos eixos</span>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            {nota.eixos.map((eixo) => (
              <li key={eixo.eixoId} className="border-t border-linha pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[0.9375rem] text-tinta">{eixo.nome}</span>
                  <span className="dado text-tinta-media">
                    {eixo.proporcao === null ? 'sem nota' : `${Math.round(eixo.proporcao * 100)}%`}
                  </span>
                </div>
                {eixo.proporcaoDaDefesa !== null && (
                  // A defesa ficou registrada mas NÃO é aplicada: o Doc 6 §6 não
                  // diz quanto ela ajusta, e inventar o número seria inventar fato.
                  <p className="legenda mt-1">
                    defesa registrada · não somada, porque a série não diz o quanto
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </Casca>
  )
}
