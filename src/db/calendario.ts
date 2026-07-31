import { asc, eq, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { blocos, dias, marcos } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type DuracaoDoDia = {
  diaId: string
  ordem: number
  totalMinutos: number
}

/**
 * Soma das durações dos blocos, por dia do curso.
 *
 * `leftJoin` de propósito: um dia sem bloco tem soma zero e continua na
 * lista. Sair do resultado esconderia justamente o dia que o instrutor
 * esqueceu de preencher — que é o que ele precisa ver.
 */
export async function duracaoTotalPorDia(db: Db, cursoId: string): Promise<DuracaoDoDia[]> {
  return db
    .select({
      diaId: dias.id,
      ordem: dias.ordem,
      totalMinutos: sql<number>`coalesce(sum(${blocos.duracaoMinutos}), 0)::int`,
    })
    .from(dias)
    .leftJoin(blocos, eq(blocos.diaId, dias.id))
    .where(eq(dias.cursoId, cursoId))
    .groupBy(dias.id, dias.ordem)
    .orderBy(asc(dias.ordem))
}

export type DiaDoCurso = {
  id: string
  ordem: number
  cursoId: string
  marco: { nome: string; tipo: 'duro' | 'triagem' } | null
}

/**
 * Um dia pelo identificador dele.
 *
 * Existe porque a apresentação é endereçada por dia — `/instrutor/apresentacao/
 * [diaId]` — e nenhuma consulta traduzia um `diaId` de volta para a ordem dele.
 * `diaCorrenteDaTurma` faz isso pela turma, e a apresentação não tem turma: o
 * material é do CURSO, e o mesmo dia serve todas as turmas que o rodam.
 *
 * A ordem é o que a régua precisa, e o marco vem junto porque um dia de marco
 * muda a moldura da tela inteira.
 */
export async function diaPorId(db: Db, diaId: string): Promise<DiaDoCurso | null> {
  const [linha] = await db
    .select({
      id: dias.id,
      ordem: dias.ordem,
      cursoId: dias.cursoId,
      marcoNome: marcos.nome,
      marcoTipo: marcos.tipo,
    })
    .from(dias)
    .leftJoin(marcos, eq(marcos.diaId, dias.id))
    .where(eq(dias.id, diaId))
    .limit(1)

  if (!linha) return null

  return {
    id: linha.id,
    ordem: linha.ordem,
    cursoId: linha.cursoId,
    marco: linha.marcoNome && linha.marcoTipo ? { nome: linha.marcoNome, tipo: linha.marcoTipo } : null,
  }
}

/**
 * Os blocos de um dia, na ordem.
 *
 * É o que a régua do dia desenha: as larguras SÃO as durações (ADR 0003 §7), e
 * por isso a consulta devolve os minutos, não uma proporção já calculada — o
 * cálculo é de apresentação e a régua é quem sabe fazê-lo.
 */
export async function blocosDoDia(
  db: Db,
  diaId: string,
): Promise<{ tipo: string; duracaoMinutos: number }[]> {
  return db
    .select({ tipo: blocos.tipo, duracaoMinutos: blocos.duracaoMinutos })
    .from(blocos)
    .where(eq(blocos.diaId, diaId))
    .orderBy(asc(blocos.ordem))
}
