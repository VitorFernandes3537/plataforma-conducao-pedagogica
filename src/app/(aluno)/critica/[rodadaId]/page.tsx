import { redirect } from 'next/navigation'

import { RegistroDeCritica } from '@/components/aluno/registro-de-critica'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { criticaDoGrupoNaRodada, roteiroDaRodada, type GrupoDaCritica } from '@/db/critica'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Crítica — PCP' }

/**
 * A crítica entre pares, do lado do aluno (Doc 5 §4).
 *
 * O grupo faz duas coisas na sessão, e a tela tem uma seção para cada: **escreve
 * sobre o colega** que sorteou para revisar, e **recebe** a crítica de quem o
 * revisa. As duas direções acontecem na mesma sessão, "25 minutos por direção".
 *
 * A ordem é a da regra do §4.2: primeiro explicar o tema do colega, depois o
 * cenário que quebra. E o roteiro fica à vista, porque as perguntas são
 * conduzidas em voz alta — não são respondidas por escrito, o que se registra
 * são as duas frases.
 *
 * O que o aluno vê é filtrado pela consulta, não pela tela: só os dois pares em
 * que o grupo dele entra. A crítica de um terceiro grupo sobre um quarto não é
 * buscada.
 */
export default async function Critica({ params }: { params: Promise<{ rodadaId: string }> }) {
  const { rodadaId } = await params

  const sessao = await auth()
  if (!sessao?.usuarioId) redirect(`/entrar?callbackUrl=/critica/${rodadaId}`)

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)

  if (!matricula) {
    return (
      <Casca>
        <Cabecalho legenda="Crítica" titulo="Você ainda não está numa turma" />
        <AusenciaDeclarada legenda="Matrícula">
          A crítica é entre grupos de uma turma. Quando o instrutor te incluir,
          a rodada aparece aqui.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  if (!matricula.grupoId) {
    return (
      <Casca>
        <Cabecalho legenda="Crítica" titulo="A crítica é do grupo" />
        <AusenciaDeclarada legenda="Grupo">
          Quem critica e quem é criticado é o grupo. Enquanto você não estiver
          num, não há rodada para conduzir.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const [visao, roteiro] = await Promise.all([
    criticaDoGrupoNaRodada(banco, rodadaId, matricula.grupoId),
    roteiroDaRodada(banco, rodadaId),
  ])

  if (!visao) {
    return (
      <Casca>
        <Cabecalho legenda="Crítica" titulo="Rodada não encontrada" />
        <AusenciaDeclarada legenda="Rodada">
          Esta rodada de crítica não existe, ou é de outro curso.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const naoSorteado = !visao.escrevo && !visao.recebo

  return (
    <Casca>
      <Cabecalho legenda={`Crítica · rodada ${visao.rodada.ordem}`} titulo={visao.rodada.nome}>
        Antes de comentar qualquer linha, explique o domínio do colega em uma
        frase — e entregue um cenário concreto que quebra, não uma opinião.
      </Cabecalho>

      {roteiro.length > 0 && (
        <Cartao legenda="O roteiro, conduzido em voz alta">
          <ol className="flex flex-col gap-2.5">
            {roteiro.map((pergunta) => (
              <li key={pergunta.ordem} className="flex items-start gap-3">
                <span className="dado mt-[0.15rem] shrink-0 text-[0.75rem] text-tinta-fraca">
                  {pergunta.ordem}
                </span>
                <span className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta-media">
                  {pergunta.enunciado}
                </span>
              </li>
            ))}
          </ol>
        </Cartao>
      )}

      {naoSorteado ? (
        <AusenciaDeclarada legenda="Pareamento">
          O sorteio desta rodada ainda não foi feito. Quando o instrutor sortear,
          aparece aqui o grupo que vocês revisam e o que revisa vocês.
        </AusenciaDeclarada>
      ) : (
        <>
          {visao.escrevo && (
            <Cartao legenda="Vocês revisam">
              <IdentidadeDoGrupo grupo={visao.escrevo.revisado} />
              <div className="mt-5 border-t border-linha pt-5">
                <RegistroDeCritica
                  rodadaId={rodadaId}
                  parId={visao.escrevo.parId}
                  registro={visao.escrevo.registro}
                />
              </div>
            </Cartao>
          )}

          {visao.recebo && (
            <Cartao
              legenda="Vocês são revisados por"
              acao={
                visao.recebo.registro ? undefined : <Etiqueta tracejada>ainda não escreveram</Etiqueta>
              }
            >
              <IdentidadeDoGrupo grupo={visao.recebo.revisor} semRepositorio />
              {visao.recebo.registro ? (
                <div className="mt-5 flex flex-col gap-4 border-t border-linha pt-5">
                  <div>
                    <p className="legenda">como eles explicaram o tema de vocês</p>
                    <p className="mt-1.5 max-w-[62ch] whitespace-pre-line font-prosa leading-relaxed text-tinta">
                      {visao.recebo.registro.explicacaoDoTema}
                    </p>
                  </div>
                  <div>
                    <p className="legenda">o cenário que eles apontaram</p>
                    <p className="mt-1.5 max-w-[62ch] whitespace-pre-line font-prosa leading-relaxed text-tinta">
                      {visao.recebo.registro.cenarioQueQuebra}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="legenda mt-4">
                  A crítica que vocês receberem aparece aqui quando o grupo
                  escrever.
                </p>
              )}
            </Cartao>
          )}
        </>
      )}
    </Casca>
  )
}

/**
 * Identifica um grupo pelo tema e pelos repositórios.
 *
 * O revisor lê o README e o contrato no repositório do colega para se orientar
 * (Doc 5 §4.1) — por isso os links aparecem no lado que se revisa, e não no lado
 * que revisa a gente, onde não há o que ler.
 */
function IdentidadeDoGrupo({
  grupo,
  semRepositorio = false,
}: {
  grupo: GrupoDaCritica
  semRepositorio?: boolean
}) {
  return (
    <div>
      <p className="font-prosa text-lg leading-snug text-tinta">
        {grupo.tema ?? <span className="text-tinta-fraca">grupo sem tema alocado</span>}
      </p>
      {!semRepositorio && grupo.repositorios.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {grupo.repositorios.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[0.875rem] text-tinta underline underline-offset-4"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
