import { and, eq, inArray, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type EntradaDeMatricula = {
  githubUserId: number
  githubLogin: string
  nome: string
}

/**
 * Cria acesso de aluno em lote.
 *
 * Não há e-mail a confirmar nem senha a distribuir: a identidade é a conta
 * do GitHub que o aluno já usa para o repositório exigido pelo Doc 5 §6
 * (ADR 0002 §1). O instrutor cola a lista de usuários antes do D1 e o
 * primeiro login apenas vincula.
 *
 * Idempotente por `githubUserId`: rodar de novo com a mesma lista atualiza
 * login e nome em vez de duplicar pessoa. O instrutor vai colar essa lista
 * mais de uma vez, e o login do GitHub muda.
 */
export async function matriculaEmLote(
  db: Db,
  turmaId: string,
  entradas: readonly EntradaDeMatricula[],
): Promise<{ matriculados: number }> {
  if (entradas.length === 0) return { matriculados: 0 }

  const ids = entradas.map((e) => e.githubUserId)
  if (new Set(ids).size !== ids.length) {
    throw new Error('matrícula em lote: githubUserId repetido na mesma lista')
  }

  await db
    .insert(usuarios)
    .values(entradas.map((e) => ({ ...e, papel: 'aluno' as const })))
    .onConflictDoUpdate({
      target: usuarios.githubUserId,
      // `excluded` é a linha que colidiu. O papel fica de fora de propósito:
      // rematricular alguém não pode rebaixar um instrutor a aluno.
      set: {
        githubLogin: sql`excluded.github_login`,
        nome: sql`excluded.nome`,
      },
    })

  const pessoas = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(inArray(usuarios.githubUserId, ids))

  const usuarioIds = pessoas.map((p) => p.id)

  await db
    .insert(alunos)
    .values(usuarioIds.map((usuarioId) => ({ usuarioId, turmaId })))
    .onConflictDoNothing({ target: [alunos.usuarioId, alunos.turmaId] })

  const naTurma = await db
    .select({ id: alunos.id })
    .from(alunos)
    .where(and(eq(alunos.turmaId, turmaId), inArray(alunos.usuarioId, usuarioIds)))

  return { matriculados: naTurma.length }
}
