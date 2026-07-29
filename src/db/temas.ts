import { and, asc, eq, exists, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { grupos, temas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type TemaListado = {
  id: string
  nome: string
  dificuldade: string
  trilha: 'padrao' | 'desafio'
  briefing: string | null
  disponivel: boolean
}

/**
 * Todos os temas do banco, com disponibilidade calculada para uma turma.
 *
 * Duas decisões que o critério de aceite exige:
 *
 * 1. Nada é filtrado. Tema indisponível continua na lista — o aluno precisa
 *    ver que ele existe e já foi tomado, senão a escolha parece menor do que é.
 * 2. Disponibilidade é POR TURMA (Doc 7 §2.4: "um `Tema` pertence a no máximo
 *    um `Grupo` por `Turma`"). O mesmo banco serve várias turmas, e um tema
 *    tomado numa não é tomado na outra.
 */
export async function temasComDisponibilidade(
  db: Db,
  bancoDeTemasId: string,
  turmaId: string,
): Promise<TemaListado[]> {
  const tomadoNaTurma = exists(
    db
      .select({ um: grupos.id })
      .from(grupos)
      .where(and(eq(grupos.turmaId, turmaId), eq(grupos.temaId, temas.id))),
  )

  return db
    .select({
      id: temas.id,
      nome: temas.nome,
      dificuldade: temas.dificuldade,
      trilha: temas.trilha,
      briefing: temas.briefing,
      disponivel: sql<boolean>`not ${tomadoNaTurma}`,
    })
    .from(temas)
    .where(eq(temas.bancoDeTemasId, bancoDeTemasId))
    .orderBy(asc(temas.criadoEm), asc(temas.nome))
}
