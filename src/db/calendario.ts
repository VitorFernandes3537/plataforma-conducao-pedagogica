import { asc, eq, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { blocos, dias } from './schema'

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
