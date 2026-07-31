import { eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, cursos, turmas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * O curso a que a turma pertence.
 *
 * Existe porque `diaCorrenteDaTurma` também devolve `cursoId` e não serve aqui:
 * ela é nula enquanto o instrutor não avançou para o primeiro dia, e há tela do
 * aluno que precisa da configuração do curso — formulário, estrutura, banco de
 * temas — sem depender do ponteiro ter sido movido.
 */
export async function cursoDaTurma(db: Db, turmaId: string): Promise<{ id: string } | null> {
  const [linha] = await db
    .select({ id: turmas.cursoId })
    .from(turmas)
    .where(eq(turmas.id, turmaId))
    .limit(1)

  return linha ?? null
}

/**
 * A pergunta condutora do curso a que a turma pertence (`D1-PERGUNTA`).
 *
 * Recebe o banco por parâmetro para poder ser testada contra PGlite sem
 * depender de sessão nem de rede.
 */
export async function perguntaCondutoraDaTurma(
  db: Db,
  turmaId: string,
): Promise<string | null> {
  const [linha] = await db
    .select({ pergunta: cursos.perguntaCondutora })
    .from(turmas)
    .innerJoin(cursos, eq(cursos.id, turmas.cursoId))
    .where(eq(turmas.id, turmaId))
    .limit(1)

  return linha?.pergunta ?? null
}

/**
 * A pergunta condutora vista por um usuário, pela matrícula dele.
 *
 * É esta que o layout do aluno usa: a casca não sabe de turma, sabe de sessão.
 * Devolve `null` quando a pessoa não está matriculada em turma nenhuma — caso
 * real no primeiro login, antes do instrutor alocar.
 */
export async function perguntaCondutoraDoUsuario(
  db: Db,
  usuarioId: string,
): Promise<string | null> {
  const [linha] = await db
    .select({ pergunta: cursos.perguntaCondutora })
    .from(alunos)
    .innerJoin(turmas, eq(turmas.id, alunos.turmaId))
    .innerJoin(cursos, eq(cursos.id, turmas.cursoId))
    .where(eq(alunos.usuarioId, usuarioId))
    .limit(1)

  return linha?.pergunta ?? null
}
