import { redirect } from 'next/navigation'

import { ContratoDeHoje } from '@/components/aluno/contrato-de-hoje'
import { FechamentoDoDia } from '@/components/aluno/fechamento-do-dia'
import { MuralDoAluno } from '@/components/aluno/mural-do-aluno'
import { DesafioAtual } from '@/components/desafio-atual'
import { MarcaProduto } from '@/components/marcas'
import { AusenciaDeclarada, Cabecalho, Cartao, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { contratoDoDia } from '@/db/contrato-diario'
import { diaCorrenteDaTurma } from '@/db/dia-corrente'
import { matriculaDoUsuario, obstaculoDoDia } from '@/db/dia-do-aluno'
import { muralEmAberto } from '@/db/mural'
import { registroDoDia } from '@/db/registro-diario'
import { auth } from '@/lib/auth'

/**
 * O dia do aluno.
 *
 * A ordem da tela é a ordem do dia: o que vencer agora, o que prometi, o que a
 * turma não sabe, e o que fecho no fim. Não é uma lista de funcionalidades — é
 * a sequência em que os cinco blocos do cronograma acontecem.
 *
 * A pergunta do obstáculo é o herói (ADR 0003 §5). O ordinal fica pequeno ao
 * lado, como referência: "obstáculo 4" é endereço, não título, e tratá-lo como
 * título transformaria o método num currículo numerado.
 */
export default async function Hoje() {
  const sessao = await auth()
  if (!sessao?.usuarioId) redirect('/entrar?callbackUrl=/hoje')

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)

  if (!matricula) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <Cabecalho legenda="Hoje" titulo="Você ainda não está numa turma" />
        <AusenciaDeclarada legenda="Matrícula">
          O instrutor cadastra a turma por usuário do GitHub. Quando ele te
          incluir, esta tela passa a mostrar o dia.
        </AusenciaDeclarada>
      </main>
    )
  }

  const dia = await diaCorrenteDaTurma(banco, matricula.turmaId)

  if (!dia) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <Cabecalho legenda="Hoje" titulo="O curso ainda não começou" />
        <AusenciaDeclarada legenda="Primeiro dia">
          A turma está cadastrada e o primeiro dia ainda não foi aberto.
        </AusenciaDeclarada>
      </main>
    )
  }

  const [obstaculo, contrato, registro, mural] = await Promise.all([
    obstaculoDoDia(banco, dia.diaId),
    contratoDoDia(banco, matricula.alunoId, dia.diaId),
    registroDoDia(banco, matricula.alunoId, dia.diaId),
    muralEmAberto(banco, matricula.turmaId),
  ])

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <Cabecalho
        legenda={`Dia ${dia.ordem} de ${dia.totalDeDias}`}
        titulo={obstaculo ? 'Hoje' : 'Hoje não há obstáculo'}
      >
        {dia.marco && (
          <Etiqueta tom={dia.marco.tipo === 'duro' ? 'portao' : 'destaque'} tracejada={dia.marco.tipo === 'triagem'}>
            {dia.marco.nome}
          </Etiqueta>
        )}
      </Cabecalho>

      {obstaculo && (
        <Cartao cru>
          <DesafioAtual
            perguntaDoAluno={obstaculo.pergunta}
            ordem={obstaculo.ordem}
            // Os critérios são binários e a plataforma não os verifica: quem diz
            // se passou é o Doc 3, lido pelo instrutor. A marca reflete a
            // avaliação lançada, e antes dela ninguém está cumprido.
            criterios={obstaculo.criterios.map((texto) => ({
              texto,
              cumprido: registro?.avaliacoes.some((a) => a.obstaculoId === obstaculo.id && a.superado) ?? false,
            }))}
            escopoFora={obstaculo.escopoFora}
          />
        </Cartao>
      )}

      <ContratoDeHoje
        alunoId={matricula.alunoId}
        diaId={dia.diaId}
        contrato={contrato}
      />

      <MuralDoAluno
        grupoId={matricula.grupoId}
        obstaculoId={obstaculo?.id ?? null}
        grupos={mural}
      />

      {obstaculo && (
        <FechamentoDoDia
          alunoId={matricula.alunoId}
          diaId={dia.diaId}
          obstaculoId={obstaculo.id}
          logAtual={registro?.logs.find((l) => l.obstaculoId === obstaculo.id)?.texto ?? null}
          pushConfirmado={registro?.pushConfirmado ?? false}
        />
      )}

      <div className="relative">
        <MarcaProduto className="pointer-events-none absolute -left-10 top-1 hidden lg:block" />
        <Cartao legenda="Seu repositório">
          {matricula.repositorio ? (
            <>
              <a
                href={matricula.repositorio}
                target="_blank"
                rel="noreferrer"
                className="text-tinta underline underline-offset-4"
              >
                {matricula.repositorio}
              </a>
              <p className="legenda mt-2">
                é público, é o produto do curso, e continua no ar depois dele
              </p>
            </>
          ) : (
            <p className="text-tinta-media">
              Seu repositório ainda não foi registrado. Ele é público e é o
              produto deste curso — não só a entrega.
            </p>
          )}
        </Cartao>
      </div>
    </main>
  )
}
