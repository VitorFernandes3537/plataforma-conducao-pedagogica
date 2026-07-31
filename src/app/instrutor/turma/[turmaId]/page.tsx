import { LancamentoDaTurma } from '@/components/instrutor/lancamento-da-turma'
import { MuralDoDia } from '@/components/instrutor/mural-do-dia'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { AusenciaDeclarada, Cabecalho, Cartao, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { blocosDoDia } from '@/db/calendario'
import { diaCorrenteDaTurma } from '@/db/dia-corrente'
import { muralEmAberto } from '@/db/mural'
import { painelDoDia } from '@/db/painel'
import { escalaDoCurso, lancamentoDoDia } from '@/db/registro-diario'
import { AvancarDia } from './avancar-dia'

/**
 * O dia de uma turma — a tela que o instrutor abre e volta para a sala.
 *
 * Concentra os momentos que o cronograma nomeia: a régua que mostra onde o dia
 * está, o painel que responde quantos superaram, o mural que é consultado na
 * abertura e riscado na demonstração, e o lançamento da avaliação que acontece
 * enquanto ele circula.
 *
 * A densidade é deliberada (ADR 0003 §1). Um instrutor com a turma inteira em
 * 180 minutos não navega entre telas — e cada aba a mais é um momento em que
 * ele para de olhar para a sala.
 */
export default async function DiaDaTurma({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params
  const banco = db()

  const dia = await diaCorrenteDaTurma(banco, turmaId)

  if (!dia) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-6 py-12">
        <Cabecalho legenda="Condução" titulo="A turma ainda não começou" />
        <AusenciaDeclarada legenda="Dia corrente">
          O curso começa quando você avança para o primeiro dia. Até lá não há o
          que conduzir, e a turma existe só como matrícula.
        </AusenciaDeclarada>
        <AvancarDia turmaId={turmaId} rotulo="Começar o primeiro dia" />
      </main>
    )
  }

  const [blocos, painel, escala, mural] = await Promise.all([
    blocosDoDia(banco, dia.diaId),
    painelDoDia(banco, turmaId, dia.diaId),
    escalaDoCurso(banco, dia.cursoId),
    muralEmAberto(banco, turmaId),
  ])

  const alunos = painel.obstaculoId
    ? await lancamentoDoDia(banco, turmaId, dia.diaId, painel.obstaculoId)
    : []

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 py-10">
      <Cabecalho
        legenda={`Dia ${dia.ordem} de ${dia.totalDeDias}`}
        titulo={painel.pergunta ?? 'Dia sem obstáculo'}
        acoes={<AvancarDia turmaId={turmaId} rotulo="Avançar o dia" />}
      >
        {dia.marco && (
          <Etiqueta tom={dia.marco.tipo === 'duro' ? 'portao' : 'destaque'} tracejada={dia.marco.tipo === 'triagem'}>
            {dia.marco.nome}
          </Etiqueta>
        )}
      </Cabecalho>

      {blocos.length > 0 && (
        // `blocoCorrente` é nulo porque a plataforma não tem relógio: ela sabe
        // a forma do dia, não o minuto em que a sala está. Fingir o marcador do
        // agora seria mostrar uma posição inventada.
        <ReguaDoDia
          blocos={blocos}
          blocoCorrente={null}
          marco={dia.marco ?? undefined}
          dia={dia.ordem}
          contexto={painel.pergunta ?? 'Dia sem obstáculo'}
        />
      )}

      <Cartao
        legenda="Superação do obstáculo"
        acao={
          painel.apuracao.limiarAtingido ? (
            <Etiqueta tom="destaque">limiar atingido</Etiqueta>
          ) : undefined
        }
      >
        {painel.obstaculoId === null ? (
          <p className="text-tinta-media">
            Este dia não trabalha obstáculo. Não há o que superar, e o limiar não
            se aplica.
          </p>
        ) : (
          <p className="text-tinta-media">
            <span className="dado text-tinta">
              {painel.apuracao.superadas} de {painel.apuracao.total}
            </span>{' '}
            {painel.politica.unidade === 'grupo' ? 'grupos superaram' : 'alunos superaram'}
            {painel.apuracao.pendentes > 0 && (
              <>
                {' · '}
                <span className="dado">{painel.apuracao.pendentes}</span> sem
                avaliação
              </>
            )}
            {'. O limiar deste curso é '}
            <span className="dado">{Math.round(painel.politica.limiar * 100)}%</span>.
          </p>
        )}
      </Cartao>

      {painel.obstaculoId && (
        <LancamentoDaTurma
          turmaId={turmaId}
          diaId={dia.diaId}
          obstaculoId={painel.obstaculoId}
          escala={escala}
          alunos={alunos}
        />
      )}

      <MuralDoDia turmaId={turmaId} grupos={mural} />
    </main>
  )
}
