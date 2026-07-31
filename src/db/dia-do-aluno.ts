import { eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, dias, obstaculos, repositorios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type ObstaculoDoDia = {
  id: string
  ordem: number
  pergunta: string
  criterios: readonly string[]
  escopoFora: readonly string[]
}

/**
 * Quebra um campo de linhas em itens.
 *
 * Uma linha, um item — a mesma convenção do motor de validação. Linha vazia não
 * conta, para espaçamento não virar item fantasma na lista.
 */
function linhas(texto: string | null): string[] {
  if (!texto) return []
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/**
 * O obstáculo que o dia trabalha, com o que a tela do aluno precisa dele.
 *
 * A PERGUNTA é o herói (Doc 3 §2 · ADR 0003 §5): ela é o que separa o método de
 * um currículo, e o ordinal é referência, nunca título.
 *
 * Devolve nulo em dia sem obstáculo — abertura, marco, fechamento. Nulo é
 * resposta: existem dias em que não há o que superar.
 */
export async function obstaculoDoDia(db: Db, diaId: string): Promise<ObstaculoDoDia | null> {
  const [linha] = await db
    .select({
      id: obstaculos.id,
      ordem: obstaculos.ordem,
      pergunta: obstaculos.pergunta,
      criterios: obstaculos.criteriosDeSuperacao,
      escopoFora: obstaculos.escopoFora,
    })
    .from(dias)
    .innerJoin(obstaculos, eq(obstaculos.id, dias.obstaculoId))
    .where(eq(dias.id, diaId))
    .limit(1)

  if (!linha) return null

  return {
    id: linha.id,
    ordem: linha.ordem,
    pergunta: linha.pergunta,
    criterios: linhas(linha.criterios),
    escopoFora: linhas(linha.escopoFora),
  }
}

/**
 * A matrícula de um usuário, com o repositório dele.
 *
 * O repositório vem junto porque ele é o **produto público** do curso, não um
 * link de apoio (Doc 5 §6.2 · ADR 0003 §6) — e a tela do aluno mostrava só
 * cobrança até ele ter lugar próprio.
 */
export async function matriculaDoUsuario(
  db: Db,
  usuarioId: string,
): Promise<{ alunoId: string; turmaId: string; grupoId: string | null; repositorio: string | null } | null> {
  const [linha] = await db
    .select({
      alunoId: alunos.id,
      turmaId: alunos.turmaId,
      grupoId: alunos.grupoId,
      repositorio: repositorios.url,
    })
    .from(alunos)
    .leftJoin(repositorios, eq(repositorios.alunoId, alunos.id))
    .where(eq(alunos.usuarioId, usuarioId))
    .limit(1)

  return linha ?? null
}
