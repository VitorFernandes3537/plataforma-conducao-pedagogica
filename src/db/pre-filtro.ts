import { and, eq, isNotNull, isNull, ne } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { aprovadoNoPreFiltro, valida, type Regra, type Reprovacao } from '@/domain/validacao'

import * as schema from './schema'
import {
  grupos,
  perguntasDoFormulario,
  regrasDeValidacao,
  respostasDeEscopo,
  respostasDePergunta,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Reprovação que não vem de regra de pergunta, e sim do estado da turma. */
export const TEMA_JA_ALOCADO = 'tema_ja_alocado' as const

/**
 * Reprovação do pré-filtro.
 *
 * `perguntaId` nulo é a reprovação que não pertence a nenhuma pergunta: o tema
 * já alocado é estado da turma, não resposta errada.
 */
export type ReprovacaoDoPreFiltro =
  | Reprovacao
  | { perguntaId: null; tipo: typeof TEMA_JA_ALOCADO; mensagem: string }

export type ResultadoDoPreFiltro = {
  aprovado: boolean
  reprovacoes: readonly ReprovacaoDoPreFiltro[]
}

/**
 * Roda o pré-filtro sobre a resposta de escopo de um grupo.
 *
 * Junta duas famílias de verificação que o Doc 2 §4.6 lista lado a lado:
 *
 * 1. As regras declaradas nas perguntas, executadas pelo motor puro.
 * 2. A unicidade do tema na turma, que não é regra de pergunta — depende do
 *    estado da turma e por isso precisa do banco.
 *
 * Devolve tudo junto, porque para o aluno é um resultado só.
 */
export async function rodaPreFiltro(db: Db, respostaDeEscopoId: string): Promise<ResultadoDoPreFiltro> {
  const [escopo] = await db
    .select({
      id: respostasDeEscopo.id,
      grupoId: respostasDeEscopo.grupoId,
      formularioId: respostasDeEscopo.formularioId,
    })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
    .limit(1)

  if (!escopo) return { aprovado: false, reprovacoes: [] }

  const respostas = await db
    .select({
      perguntaId: respostasDePergunta.perguntaId,
      texto: respostasDePergunta.texto,
    })
    .from(respostasDePergunta)
    .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id))

  const regras: Regra[] = await db
    .select({
      perguntaId: regrasDeValidacao.perguntaId,
      tipo: regrasDeValidacao.tipo,
      minimo: regrasDeValidacao.minimo,
      maximo: regrasDeValidacao.maximo,
      perguntaDeReferenciaId: regrasDeValidacao.perguntaDeReferenciaId,
      termos: regrasDeValidacao.termos,
      mensagem: regrasDeValidacao.mensagem,
    })
    .from(regrasDeValidacao)
    .innerJoin(
      perguntasDoFormulario,
      eq(perguntasDoFormulario.id, regrasDeValidacao.perguntaId),
    )
    .where(eq(perguntasDoFormulario.formularioId, escopo.formularioId))

  const reprovacoes: ReprovacaoDoPreFiltro[] = [...valida(respostas, regras)]

  if (await temaJaAlocadoAOutroGrupo(db, escopo.grupoId)) {
    reprovacoes.push({
      perguntaId: null,
      tipo: TEMA_JA_ALOCADO,
      mensagem: 'Este tema já foi alocado a outro grupo da turma. Escolha outro.',
    })
  }

  return { aprovado: aprovadoNoPreFiltro(reprovacoes), reprovacoes }
}

/**
 * O tema do grupo já está com outro grupo da mesma turma?
 *
 * "Um `Tema` pertence a no máximo um `Grupo` por `Turma`" — Doc 7 §2.4. O
 * índice único parcial garante o estado; esta consulta existe para o aluno
 * receber a mensagem em vez de um erro de banco.
 */
async function temaJaAlocadoAOutroGrupo(db: Db, grupoId: string): Promise<boolean> {
  const [meu] = await db
    .select({ turmaId: grupos.turmaId, temaId: grupos.temaId })
    .from(grupos)
    .where(eq(grupos.id, grupoId))
    .limit(1)

  if (!meu?.temaId) return false

  const conflitantes = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(
      and(eq(grupos.turmaId, meu.turmaId), eq(grupos.temaId, meu.temaId), ne(grupos.id, grupoId)),
    )
    .limit(1)

  return conflitantes.length > 0
}

/**
 * Submete o escopo **somente se** passar no pré-filtro.
 *
 * É este portão que preserva o tempo humano: o formulário só chega ao
 * instrutor depois de passar (Doc 2 §4.6). Sem ele, os 95 minutos do D3 são
 * gastos apontando campo vazio em vez de julgando modelagem.
 *
 * A submissão é a mesma da issue 6 — `submetidoEm` — e não um estado novo.
 */
export async function submeteSePassar(
  db: Db,
  respostaDeEscopoId: string,
): Promise<ResultadoDoPreFiltro> {
  const resultado = await rodaPreFiltro(db, respostaDeEscopoId)
  if (!resultado.aprovado) return resultado

  await db
    .update(respostasDeEscopo)
    .set({ submetidoEm: new Date() })
    .where(and(eq(respostasDeEscopo.id, respostaDeEscopoId), isNull(respostasDeEscopo.submetidoEm)))

  return resultado
}

/**
 * A fila do instrutor: escopos submetidos de uma turma.
 *
 * Reprovado no pré-filtro não aparece aqui, porque nunca recebeu
 * `submetidoEm`. A fila lê o fato, não repete a validação — duas
 * implementações da mesma regra divergiriam.
 */
export async function filaDoInstrutor(
  db: Db,
  turmaId: string,
): Promise<{ respostaDeEscopoId: string; grupoId: string }[]> {
  return db
    .select({ respostaDeEscopoId: respostasDeEscopo.id, grupoId: respostasDeEscopo.grupoId })
    .from(respostasDeEscopo)
    .innerJoin(grupos, eq(grupos.id, respostasDeEscopo.grupoId))
    .where(and(eq(grupos.turmaId, turmaId), isNotNull(respostasDeEscopo.submetidoEm)))
}
