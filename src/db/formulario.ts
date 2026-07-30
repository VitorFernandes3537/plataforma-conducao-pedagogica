import { asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { formularios, perguntasDoFormulario } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type PerguntaListada = {
  id: string
  ordem: number
  enunciado: string
  criterioDeAceite: string
}

/**
 * As perguntas de um formulário, em ordem.
 *
 * A quantidade vem do dado. O Doc 2 §4.3 descreve sete perguntas neste curso,
 * e nada aqui conta nem valida quantas existem — outro módulo instancia outro
 * formulário, com outra contagem.
 */
export async function perguntasDoFormularioEmOrdem(
  db: Db,
  formularioId: string,
): Promise<PerguntaListada[]> {
  return db
    .select({
      id: perguntasDoFormulario.id,
      ordem: perguntasDoFormulario.ordem,
      enunciado: perguntasDoFormulario.enunciado,
      criterioDeAceite: perguntasDoFormulario.criterioDeAceite,
    })
    .from(perguntasDoFormulario)
    .where(eq(perguntasDoFormulario.formularioId, formularioId))
    .orderBy(asc(perguntasDoFormulario.ordem))
}

/** O formulário de um curso. Nulo quando o instrutor ainda não cadastrou. */
export async function formularioDoCurso(db: Db, cursoId: string): Promise<{ id: string } | null> {
  const [encontrado] = await db
    .select({ id: formularios.id })
    .from(formularios)
    .where(eq(formularios.cursoId, cursoId))
    .limit(1)

  return encontrado ?? null
}
