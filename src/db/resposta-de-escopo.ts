import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import {
  estruturas,
  linhasDeTraducao,
  papeisDaEstrutura,
  perguntasDoFormulario,
  respostasDeEscopo,
  respostasDePergunta,
} from './schema'

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

export type EstadoDaTraducao = {
  /** Papéis obrigatórios da estrutura que ainda não têm linha. */
  faltando: readonly { papelId: string; nome: string }[]
  completa: boolean
}

/**
 * Verifica se a tabela de tradução cobre todos os papéis obrigatórios.
 *
 * O critério é "uma linha por papel **obrigatório** da `Estrutura`". Papel
 * opcional pode ficar de fora sem invalidar o escopo — e é por isso que
 * `obrigatorio` é coluna e não convenção.
 *
 * A comparação é feita contra a estrutura do curso a que o grupo pertence, não
 * contra uma lista fixa: quantos papéis existem é configuração.
 */
export async function estadoDaTraducao(
  db: Db,
  respostaDeEscopoId: string,
  cursoId: string,
): Promise<EstadoDaTraducao> {
  const obrigatorios = await db
    .select({ papelId: papeisDaEstrutura.id, nome: papeisDaEstrutura.nome })
    .from(papeisDaEstrutura)
    .innerJoin(estruturas, eq(estruturas.id, papeisDaEstrutura.estruturaId))
    .where(and(eq(estruturas.cursoId, cursoId), eq(papeisDaEstrutura.obrigatorio, true)))
    .orderBy(asc(papeisDaEstrutura.ordem))

  const preenchidos = await db
    .select({ papelId: linhasDeTraducao.papelId })
    .from(linhasDeTraducao)
    .where(eq(linhasDeTraducao.respostaDeEscopoId, respostaDeEscopoId))

  const cobertos = new Set(preenchidos.map((l) => l.papelId))
  const faltando = obrigatorios.filter((p) => !cobertos.has(p.papelId))

  return { faltando, completa: faltando.length === 0 }
}

/**
 * Grava a resposta de uma pergunta no rascunho do grupo.
 *
 * Só enquanto é rascunho. Depois da submissão a resposta deixa de ser editável
 * pelo aluno — o Doc 7 §2.4 declara a imutabilidade a partir da aprovação, e
 * deixar o aluno reescrever depois de entregar tornaria a fila do instrutor um
 * alvo móvel. A reabertura de um escopo devolvido é da issue 9.
 *
 * A verificação é atômica: o `where` inclui `submetidoEm is null`, então duas
 * abas do mesmo grupo não conseguem gravar depois que uma submeteu.
 */
export async function gravaResposta(
  db: Db,
  respostaDeEscopoId: string,
  perguntaId: string,
  texto: string,
): Promise<void> {
  const gravadas = await db
    .insert(respostasDePergunta)
    .values({ respostaDeEscopoId, perguntaId, texto })
    .onConflictDoUpdate({
      target: [respostasDePergunta.respostaDeEscopoId, respostasDePergunta.perguntaId],
      set: { texto, atualizadoEm: new Date() },
      setWhere: sql`exists (
        select 1 from ${respostasDeEscopo}
         where ${respostasDeEscopo.id} = ${respostaDeEscopoId}
           and ${respostasDeEscopo.submetidoEm} is null
      )`,
    })
    .returning({ id: respostasDePergunta.id })

  if (gravadas.length === 0) {
    throw new EscopoInvalido('escopo já submetido: o aluno não edita depois de entregar')
  }
}

/**
 * Submete o escopo do grupo.
 *
 * Marca o instante e fecha a edição. Submeter duas vezes é recusado: o segundo
 * clique não pode mover a data e reabrir a janela de edição.
 */
export async function submete(db: Db, respostaDeEscopoId: string): Promise<{ submetidoEm: Date }> {
  const [atualizada] = await db
    .update(respostasDeEscopo)
    .set({ submetidoEm: new Date() })
    .where(and(eq(respostasDeEscopo.id, respostaDeEscopoId), isNull(respostasDeEscopo.submetidoEm)))
    .returning({ submetidoEm: respostasDeEscopo.submetidoEm })

  if (!atualizada?.submetidoEm) {
    throw new EscopoInvalido('escopo já foi submetido')
  }
  return { submetidoEm: atualizada.submetidoEm }
}
