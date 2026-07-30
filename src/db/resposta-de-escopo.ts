import { asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { perguntasDoFormulario, respostasDeEscopo, respostasDePergunta } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra da resposta de escopo, distinto de falha de banco. */
export class EscopoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'EscopoInvalido'
  }
}

export type RespostaDoGrupo = {
  id: string
  grupoId: string
  formularioId: string
  submetidoEm: Date | null
  respostas: readonly { perguntaId: string; ordem: number; texto: string }[]
}

/**
 * Abre o rascunho de escopo de um grupo.
 *
 * A resposta é **do grupo**, não do aluno: o contrato é preenchido e entregue
 * uma vez por grupo (Doc 2 §4.2), e a unidade vem do Doc 6 §1.1. Por isso a
 * unicidade está em `grupo_id` — dois alunos do mesmo grupo abrem o mesmo
 * rascunho, nunca dois.
 *
 * Idempotente: chamar de novo devolve o que já existe. Duas pessoas do mesmo
 * grupo entrando ao mesmo tempo é o caso normal, não a exceção.
 */
export async function abreRascunho(
  db: Db,
  grupoId: string,
  formularioId: string,
): Promise<{ id: string }> {
  const [existente] = await db
    .select({ id: respostasDeEscopo.id })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (existente) return existente

  const [criada] = await db
    .insert(respostasDeEscopo)
    .values({ grupoId, formularioId })
    .onConflictDoNothing({ target: respostasDeEscopo.grupoId })
    .returning({ id: respostasDeEscopo.id })

  if (criada) return criada

  // Perdeu a corrida para o parceiro de grupo: quem venceu já gravou.
  const [doParceiro] = await db
    .select({ id: respostasDeEscopo.id })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!doParceiro) throw new EscopoInvalido('não foi possível abrir o rascunho do grupo')
  return doParceiro
}

/** A resposta de escopo de um grupo, com o que já foi respondido. */
export async function respostaDoGrupo(db: Db, grupoId: string): Promise<RespostaDoGrupo | null> {
  const [escopo] = await db
    .select()
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!escopo) return null

  const respostas = await db
    .select({
      perguntaId: respostasDePergunta.perguntaId,
      ordem: perguntasDoFormulario.ordem,
      texto: respostasDePergunta.texto,
    })
    .from(respostasDePergunta)
    .innerJoin(
      perguntasDoFormulario,
      eq(perguntasDoFormulario.id, respostasDePergunta.perguntaId),
    )
    .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id))
    .orderBy(asc(perguntasDoFormulario.ordem))

  return {
    id: escopo.id,
    grupoId: escopo.grupoId,
    formularioId: escopo.formularioId,
    submetidoEm: escopo.submetidoEm,
    respostas,
  }
}
