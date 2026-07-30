import { and, asc, count, eq, isNotNull } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeProducaoPropria } from './ator'
import { garanteRegistroDiario } from './registro-diario'
import * as schema from './schema'
import {
  alunos,
  confirmacoesDePush,
  contratosDiarios,
  dias,
  grupos,
  logsDeObstaculo,
  obstaculos,
  paresDeCritica,
  reflexoesDeFechamento,
  registrosDeCritica,
  registrosDiarios,
  respostasDeReflexao,
  tipoDeInstrumentoEnum,
  turmas,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** O tipo de instrumento cuja presença o eixo de prática confere. */
export type TipoDeInstrumento = (typeof tipoDeInstrumentoEnum.enumValues)[number]

/**
 * Uma contagem, já como número.
 *
 * O modo estrito trata o primeiro elemento de um `select` como possivelmente
 * ausente, e `count()` sempre devolve uma linha — o `?? 0` existe para o
 * compilador, não para o banco.
 */
async function conta(consulta: Promise<{ total: number }[]>): Promise<number> {
  return (await consulta)[0]?.total ?? 0
}

/** Erro de regra da reflexão, distinto de falha de banco. */
export class ReflexaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'ReflexaoInvalida'
  }
}

/** As reflexões que o curso declara, na ordem. */
export async function reflexoesDoCurso(
  db: Db,
  cursoId: string,
): Promise<{ id: string; ordem: number; enunciado: string; diaId: string }[]> {
  return db
    .select({
      id: reflexoesDeFechamento.id,
      ordem: reflexoesDeFechamento.ordem,
      enunciado: reflexoesDeFechamento.enunciado,
      diaId: reflexoesDeFechamento.diaId,
    })
    .from(reflexoesDeFechamento)
    .where(eq(reflexoesDeFechamento.cursoId, cursoId))
    .orderBy(asc(reflexoesDeFechamento.ordem))
}

/**
 * Grava a resposta de um aluno a uma reflexão.
 *
 * Produção própria: quem reflete é quem escreve. O instrutor também pode, pela
 * linha "Instrutor — tudo" do Doc 7 §3, e é ele que registra a reflexão de quem
 * respondeu no papel.
 *
 * Reescrever é o caminho normal. A retrospectiva acontece em minutos e o aluno
 * volta para completar — e "não há resposta certa" (Doc 6 §5.1), então não há
 * momento em que o texto passe a estar fechado.
 */
export async function respondeReflexao(
  db: Db,
  alunoId: string,
  reflexaoId: string,
  texto: string,
  autorId: string,
): Promise<{ id: string }> {
  await exigeProducaoPropria(db, autorId, alunoId)

  const limpo = texto.trim()
  if (limpo.length === 0) {
    throw new ReflexaoInvalida('a reflexão exige uma resposta escrita')
  }

  const [reflexao] = await db
    .select({ diaId: reflexoesDeFechamento.diaId })
    .from(reflexoesDeFechamento)
    .where(eq(reflexoesDeFechamento.id, reflexaoId))
    .limit(1)

  if (!reflexao) throw new ReflexaoInvalida('reflexão não encontrada')

  // O dia vem da reflexão, não de quem chama: a retrospectiva é respondida no
  // dia em que o curso a declara, e deixar o chamador escolher abriria a porta
  // para respondê-la antes de haver o que retrospectar.
  const registro = await garanteRegistroDiario(db, alunoId, reflexao.diaId)

  const [gravada] = await db
    .insert(respostasDeReflexao)
    .values({ registroDiarioId: registro.id, reflexaoId, texto: limpo })
    .onConflictDoUpdate({
      target: [respostasDeReflexao.registroDiarioId, respostasDeReflexao.reflexaoId],
      set: { texto: limpo, atualizadoEm: new Date() },
    })
    .returning({ id: respostasDeReflexao.id })

  if (!gravada) throw new ReflexaoInvalida('não foi possível gravar a reflexão')
  return gravada
}

export type SituacaoDaReflexao = {
  reflexaoId: string
  ordem: number
  enunciado: string
  diaId: string
  respondida: boolean
  texto: string | null
}

/**
 * As reflexões de um aluno, respondidas e pendentes.
 *
 * A pendente vem junto de propósito. É o que o instrutor vê na agregação, e a
 * reflexão da retrospectiva é o único instrumento que captura o pensamento
 * (Doc 6 §5.1) — se ela sumir da lista por não ter sido respondida, a tese
 * central do curso deixa de ser avaliada e ninguém percebe.
 */
export async function situacaoDasReflexoes(
  db: Db,
  alunoId: string,
): Promise<SituacaoDaReflexao[]> {
  const [contexto] = await db
    .select({ cursoId: turmas.cursoId })
    .from(alunos)
    .innerJoin(turmas, eq(turmas.id, alunos.turmaId))
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!contexto) throw new ReflexaoInvalida('aluno não encontrado')

  return db
    .select({
      reflexaoId: reflexoesDeFechamento.id,
      ordem: reflexoesDeFechamento.ordem,
      enunciado: reflexoesDeFechamento.enunciado,
      diaId: reflexoesDeFechamento.diaId,
      texto: respostasDeReflexao.texto,
    })
    .from(reflexoesDeFechamento)
    .leftJoin(
      registrosDiarios,
      and(
        eq(registrosDiarios.diaId, reflexoesDeFechamento.diaId),
        eq(registrosDiarios.alunoId, alunoId),
      ),
    )
    .leftJoin(
      respostasDeReflexao,
      and(
        eq(respostasDeReflexao.registroDiarioId, registrosDiarios.id),
        eq(respostasDeReflexao.reflexaoId, reflexoesDeFechamento.id),
      ),
    )
    .where(eq(reflexoesDeFechamento.cursoId, contexto.cursoId))
    .orderBy(asc(reflexoesDeFechamento.ordem))
    .then((linhas) =>
      linhas.map((l) => ({ ...l, respondida: l.texto !== null })),
    )
}

export type PresencaDeInstrumento = {
  tipo: TipoDeInstrumento
  peso: number
  /** Quantos existem, de quantos se esperava. */
  entregues: number
  esperados: number
  proporcao: number | null
}

/**
 * Confere a presença de um instrumento para um aluno.
 *
 * O eixo de prática não pontua qualidade — pontua entrega. "Existência do push,
 * não granularidade" (Doc 6 §5), e o §5.1 repete sobre commits: o que conta é a
 * existência do registro.
 *
 * `esperados` vem do calendário e da configuração, nunca de um número: quantos
 * dias o curso tem, quantos obstáculos existem, quantas reflexões foram
 * declaradas e em quantas rodadas o grupo é revisor. Um denominador embutido
 * daria a mesma proporção a turmas de tamanhos diferentes.
 */
export async function presencaDoInstrumento(
  db: Db,
  alunoId: string,
  tipo: TipoDeInstrumento,
): Promise<{ entregues: number; esperados: number }> {
  const [contexto] = await db
    .select({ cursoId: turmas.cursoId, grupoId: alunos.grupoId })
    .from(alunos)
    .innerJoin(turmas, eq(turmas.id, alunos.turmaId))
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!contexto) throw new ReflexaoInvalida('aluno não encontrado')

  const diasDoCurso = await conta(
    db.select({ total: count() }).from(dias).where(eq(dias.cursoId, contexto.cursoId)),
  )

  if (tipo === 'confirmacao_de_push') {
    const total = await conta(
      db
        .select({ total: count() })
        .from(confirmacoesDePush)
        .innerJoin(registrosDiarios, eq(registrosDiarios.id, confirmacoesDePush.registroDiarioId))
        .where(eq(registrosDiarios.alunoId, alunoId)),
    )
    return { entregues: total, esperados: diasDoCurso }
  }

  if (tipo === 'contrato_diario') {
    // Fechado, não só aberto: o item avaliado é "participação no fechamento"
    // (Doc 6 §5), e contrato aberto e nunca fechado não é participação.
    const total = await conta(
      db
        .select({ total: count() })
        .from(contratosDiarios)
        .innerJoin(registrosDiarios, eq(registrosDiarios.id, contratosDiarios.registroDiarioId))
        .where(and(eq(registrosDiarios.alunoId, alunoId), isNotNull(contratosDiarios.cumprido))),
    )
    return { entregues: total, esperados: diasDoCurso }
  }

  if (tipo === 'log_de_obstaculo') {
    const obstaculosDoCurso = await conta(
      db.select({ total: count() }).from(obstaculos).where(eq(obstaculos.cursoId, contexto.cursoId)),
    )
    const total = await conta(
      db
        .select({ total: count() })
        .from(logsDeObstaculo)
        .innerJoin(registrosDiarios, eq(registrosDiarios.id, logsDeObstaculo.registroDiarioId))
        .where(eq(registrosDiarios.alunoId, alunoId)),
    )
    return { entregues: total, esperados: obstaculosDoCurso }
  }

  if (tipo === 'registro_de_critica') {
    if (!contexto.grupoId) return { entregues: 0, esperados: 0 }
    // Conta onde o grupo é REVISOR: é o que o aluno controla. Receber crítica
    // depende do colega, e cobrar disso puniria quem cumpriu.
    const devidas = await conta(
      db
        .select({ total: count() })
        .from(paresDeCritica)
        .where(eq(paresDeCritica.revisorId, contexto.grupoId)),
    )
    const total = await conta(
      db
        .select({ total: count() })
        .from(registrosDeCritica)
        .innerJoin(paresDeCritica, eq(paresDeCritica.id, registrosDeCritica.parId))
        .where(eq(paresDeCritica.revisorId, contexto.grupoId)),
    )
    return { entregues: total, esperados: devidas }
  }

  const situacao = await situacaoDasReflexoes(db, alunoId)
  return {
    entregues: situacao.filter((r) => r.respondida).length,
    esperados: situacao.length,
  }
}

/** Quantos grupos existem numa turma. Usado só para leitura de contexto. */
export async function gruposDaTurma(db: Db, turmaId: string): Promise<number> {
  return conta(db.select({ total: count() }).from(grupos).where(eq(grupos.turmaId, turmaId)))
}
