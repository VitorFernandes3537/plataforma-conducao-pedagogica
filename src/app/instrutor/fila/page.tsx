import Link from 'next/link'

import { Ficha, type FichaDaFila } from '@/components/instrutor/ficha-da-fila'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, EstadoVazio, Linha } from '@/components/ui'
import { db } from '@/db'
import { turmasDoInstrutor } from '@/db/dia-corrente'
import { filaDoInstrutor } from '@/db/fila-de-aprovacao'

export const metadata = { title: 'Fila de aprovação — PCP' }

/**
 * A fila de aprovação — o outro lado do portão do D3.
 *
 * O marco é go/no-go duro: sem escopo aprovado ninguém escreve código (Doc 4
 * §4). Esta é a tela em que o instrutor gasta o bloco inteiro do dia, e o
 * orçamento é de 3 a 4 minutos por grupo (Doc 2 §4.5).
 *
 * Tudo fica aberto e numa página só. Não há tela de detalhe nem clique para
 * expandir: com 3 minutos por grupo, navegar custa mais que ler, e cada aba a
 * mais é um momento em que o instrutor para de olhar para a sala (ADR 0006 §2).
 *
 * Todas as fichas trazem a mesma ação, e isso é deliberado. A regra de "uma
 * ação por tela" existe para a ação ser encontrável entre ações diferentes —
 * aqui elas são a MESMA decisão repetida, e diferenciá-las sugeriria uma
 * hierarquia entre grupos que a plataforma não tem. A ordem já diz quem é o
 * próximo.
 *
 * A fila traz só quem está esperando. Reprovado no pré-filtro nunca chegou aqui,
 * e decidido saiu de `submetido` — a tela lê o estado, não repete a regra.
 */
export default async function FilaDeAprovacao({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string }>
}) {
  const { turma: turmaPedida } = await searchParams
  const banco = db()
  const turmas = await turmasDoInstrutor(banco)

  if (turmas.length === 0) {
    return (
      <Casca>
        <Cabecalho legenda="Aprovação" titulo="Nenhuma turma cadastrada" />
        <AusenciaDeclarada legenda="Turma">
          A fila é por turma. Enquanto não houver uma, não há escopo para
          aprovar.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  // Com uma turma só não há escolha a fazer, e obrigar a escolher seria um
  // clique inventado. Com mais de uma, a tela pergunta antes de mostrar fila
  // nenhuma — abrir a primeira por conta própria faria o instrutor decidir o
  // escopo da turma errada.
  const turmaId = turmaPedida ?? (turmas.length === 1 ? turmas[0]!.turmaId : null)

  if (!turmaId) {
    return (
      <Casca>
        <Cabecalho legenda="Aprovação" titulo="De qual turma?" />
        <Cartao legenda="Suas turmas">
          <ul>
            {turmas.map((t) => (
              <Linha key={t.turmaId}>
                <Link
                  href={`/instrutor/fila?turma=${t.turmaId}`}
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
  const fila = await filaDoInstrutor(banco, turmaId)

  const fichas: FichaDaFila[] = fila.map((item, indice) => ({
    respostaDeEscopoId: item.respostaDeEscopoId,
    integrantes: item.integrantes,
    tema: item.tema?.nome ?? null,
    posicao: indice + 1,
    respostas: item.respostas,
    julgamentos: item.julgamentos,
  }))

  return (
    <Casca>
      <Cabecalho
        legenda={turma ? turma.nome : 'Aprovação'}
        titulo={fila.length === 0 ? 'Ninguém esperando' : 'Escopos esperando decisão'}
      >
        Aprovar libera o grupo a construir, e a partir daí o formulário é o
        gabarito de correção. Devolver exige dizer o que corrigir.
      </Cabecalho>

      {fila.length === 0 ? (
        <EstadoVazio titulo="A fila está vazia.">
          Ela enche quando um grupo entrega. Quem não passou na conferência
          automática não chega aqui — o formulário volta para o grupo antes.
        </EstadoVazio>
      ) : (
        <div className="flex flex-col gap-5">
          {fichas.map((ficha) => (
            <Ficha key={ficha.respostaDeEscopoId} ficha={ficha} />
          ))}
        </div>
      )}
    </Casca>
  )
}
