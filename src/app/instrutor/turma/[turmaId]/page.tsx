import { LancamentoDaTurma } from '@/components/instrutor/lancamento-da-turma'
import { MuralDoDia } from '@/components/instrutor/mural-do-dia'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta } from '@/components/ui'
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
      <Casca medida="cheia">
        <Cabecalho legenda="Condução" titulo="A turma ainda não começou" />
        <AusenciaDeclarada legenda="Dia corrente">
          O curso começa quando você avança para o primeiro dia. Até lá não há o
          que conduzir, e a turma existe só como matrícula.
        </AusenciaDeclarada>
        <AvancarDia turmaId={turmaId} rotulo="Começar o primeiro dia" />
      </Casca>
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
    <Casca
      medida="cheia"
      regua={
        blocos.length > 0 ? (
          // `blocoCorrente` é nulo porque a plataforma não tem relógio: ela sabe
          // a forma do dia, não o minuto em que a sala está. Fingir o marcador
          // do agora seria mostrar uma posição inventada.
          <ReguaDoDia
            blocos={blocos}
            blocoCorrente={null}
            marco={dia.marco ?? undefined}
            dia={dia.ordem}
            contexto={painel.pergunta ?? 'Dia sem obstáculo'}
          />
        ) : undefined
      }
    >
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

      <Cartao
        className="max-w-[72ch]"
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

      {/* Duas colunas a partir de xl, e é aqui que a largura vira ganho em vez
          de esticamento: o lançamento e o mural são consultados dentro dos
          mesmos 180 minutos, e lado a lado o instrutor deixa de rolar a tela
          entre um e outro. Abaixo de xl eles empilham com medida própria, para
          a linha "nome … alvo" não abrir os dois extremos. */}
      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        {painel.obstaculoId && (
          <div className="max-w-[72ch] xl:max-w-none">
            <LancamentoDaTurma
              turmaId={turmaId}
              diaId={dia.diaId}
              obstaculoId={painel.obstaculoId}
              escala={escala}
              alunos={alunos}
            />
          </div>
        )}

        <div className="max-w-[72ch] xl:max-w-none">
          <MuralDoDia turmaId={turmaId} grupos={mural} />
        </div>
      </div>
    </Casca>
  )
}
