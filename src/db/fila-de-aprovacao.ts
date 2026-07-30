import { and, asc, eq, inArray } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import {
  estadosQueLevamA,
  motivoDaRecusa,
  type EstadoDoEscopo,
} from '@/domain/escopo'

import * as schema from './schema'
import {
  grupos,
  julgamentosHumanos,
  perguntasDoFormulario,
  respostasDeEscopo,
  respostasDePergunta,
  temas,
  usuarios,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * Transição de estado recusada.
 *
 * Separada de `EscopoInvalido` porque a causa é outra: o conteúdo está certo, o
 * momento é que não é. Quem monta a resposta HTTP precisa distinguir "corrija a
 * resposta" de "esse escopo já foi decidido".
 */
export class TransicaoIlegal extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'TransicaoIlegal'
  }
}

/** Aprovar e devolver são atos do instrutor. */
export class NaoAutorizado extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'NaoAutorizado'
  }
}

/**
 * Confere o papel de quem decide.
 *
 * Exportada porque a atribuição de escopo pré-aprovado também é decisão de
 * instrutor, e duas cópias desta checagem divergiriam.
 */
export async function exigeInstrutor(db: Db, usuarioId: string): Promise<void> {
  const [quem] = await db
    .select({ papel: usuarios.papel })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  // Defesa em profundidade: a matriz de permissões já barra a rota, mas a
  // decisão que libera um grupo a construir não pode depender de o adaptador
  // ter chamado o guarda certo.
  if (quem?.papel !== 'instrutor') {
    throw new NaoAutorizado('somente o instrutor aprova ou devolve escopo')
  }
}

/**
 * Move o escopo para `destino`, se a transição for legal a partir do estado
 * vigente.
 *
 * O filtro do UPDATE vem de `estadosQueLevamA`, então a legalidade é verificada
 * DENTRO da escrita. Ler antes e gravar depois perderia a corrida entre o
 * instrutor aprovando e o grupo reenviando — no D3 os dois estão com a tela
 * aberta ao mesmo tempo (Doc 2 §4.5).
 *
 * Zero linhas afetadas significa que o estado não era origem legal. Só então se
 * paga a leitura, e apenas para escrever a mensagem.
 */
async function transiciona(
  db: Db,
  respostaDeEscopoId: string,
  destino: EstadoDoEscopo,
  campos: Partial<typeof respostasDeEscopo.$inferInsert>,
): Promise<void> {
  const mudadas = await db
    .update(respostasDeEscopo)
    .set({ estado: destino, ...campos })
    .where(
      and(
        eq(respostasDeEscopo.id, respostaDeEscopoId),
        inArray(respostasDeEscopo.estado, [...estadosQueLevamA(destino)]),
      ),
    )
    .returning({ id: respostasDeEscopo.id })

  if (mudadas.length > 0) return

  const [atual] = await db
    .select({ estado: respostasDeEscopo.estado })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
    .limit(1)

  if (!atual) throw new TransicaoIlegal('escopo não encontrado')
  throw new TransicaoIlegal(motivoDaRecusa(atual.estado, destino))
}

/**
 * Aprova o escopo do grupo.
 *
 * A aprovação é o que autoriza o grupo a construir, e a partir dela o
 * formulário é o gabarito de correção (Doc 2 §4.5.1). O motivo de devolução
 * anterior é apagado: motivo pendurado em escopo aprovado apareceria na tela do
 * grupo como correção pendente.
 */
export async function aprova(
  db: Db,
  respostaDeEscopoId: string,
  instrutorId: string,
): Promise<void> {
  await exigeInstrutor(db, instrutorId)
  await transiciona(db, respostaDeEscopoId, 'aprovado', {
    decididoEm: new Date(),
    decididoPorId: instrutorId,
    motivoDaDevolucao: null,
  })
}

/**
 * Devolve o escopo ao grupo, com o que precisa ser corrigido.
 *
 * O motivo é obrigatório e verificado aqui **e** por CHECK no banco. Aqui para
 * o instrutor receber uma frase em vez de erro de constraint; no banco porque
 * devolver sem dizer o que corrigir gastaria de novo os 3 a 4 minutos que a
 * fila tem por grupo (Doc 2 §4.5).
 */
export async function devolve(
  db: Db,
  respostaDeEscopoId: string,
  instrutorId: string,
  motivo: string,
): Promise<void> {
  await exigeInstrutor(db, instrutorId)

  if (motivo.trim().length === 0) {
    throw new TransicaoIlegal('devolução exige motivo escrito')
  }

  await transiciona(db, respostaDeEscopoId, 'devolvido', {
    decididoEm: new Date(),
    decididoPorId: instrutorId,
    motivoDaDevolucao: motivo.trim(),
  })
}

export type JulgamentoDaFila = {
  id: string
  ordem: number
  enunciado: string
  perguntaId: string | null
}

export type ItemDaFila = {
  respostaDeEscopoId: string
  grupoId: string
  /** Instante da entrega vigente. É por ele que a fila ordena. */
  submetidoEm: Date
  tema: { id: string; nome: string } | null
  respostas: readonly { perguntaId: string; ordem: number; enunciado: string; texto: string }[]
  /** Só o que exige leitura humana. O que é mecânico já passou no pré-filtro. */
  julgamentos: readonly JulgamentoDaFila[]
}

/**
 * A fila de aprovação de uma turma.
 *
 * Traz **apenas** o que exige julgamento humano (Doc 2 §4.6). As verificações
 * mecânicas já passaram no motor da issue 7 — repeti-las aqui gastaria em
 * conferência os 3 a 4 minutos que o instrutor tem por formulário, que é
 * exatamente o oposto do que o pré-filtro existe para conseguir.
 *
 * A ordem é por tempo de espera: quem entregou primeiro é atendido primeiro.
 * O desempate por `criadoEm` e `id` não é decoração — sem ele, dois grupos com
 * o mesmo instante trocariam de lugar entre dois carregamentos, e o instrutor
 * perderia o fio andando pela sala.
 *
 * Reprovado no pré-filtro não aparece porque nunca foi submetido; decidido não
 * aparece porque saiu de `submetido`. A fila lê o estado, não repete a regra.
 */
export async function filaDoInstrutor(db: Db, turmaId: string): Promise<ItemDaFila[]> {
  const emEspera = await db
    .select({
      respostaDeEscopoId: respostasDeEscopo.id,
      grupoId: respostasDeEscopo.grupoId,
      formularioId: respostasDeEscopo.formularioId,
      submetidoEm: respostasDeEscopo.submetidoEm,
      temaId: temas.id,
      temaNome: temas.nome,
    })
    .from(respostasDeEscopo)
    .innerJoin(grupos, eq(grupos.id, respostasDeEscopo.grupoId))
    .leftJoin(temas, eq(temas.id, grupos.temaId))
    .where(and(eq(grupos.turmaId, turmaId), eq(respostasDeEscopo.estado, 'submetido')))
    .orderBy(
      asc(respostasDeEscopo.submetidoEm),
      asc(respostasDeEscopo.criadoEm),
      asc(respostasDeEscopo.id),
    )

  if (emEspera.length === 0) return []

  // Duas consultas em lote em vez de duas por item: a fila de uma turma inteira
  // carrega de uma vez, e o instrutor abre a tela entre um grupo e outro.
  const escopoIds = emEspera.map((e) => e.respostaDeEscopoId)
  const formularioIds = [...new Set(emEspera.map((e) => e.formularioId))]

  const respostas = await db
    .select({
      respostaDeEscopoId: respostasDePergunta.respostaDeEscopoId,
      perguntaId: respostasDePergunta.perguntaId,
      ordem: perguntasDoFormulario.ordem,
      enunciado: perguntasDoFormulario.enunciado,
      texto: respostasDePergunta.texto,
    })
    .from(respostasDePergunta)
    .innerJoin(perguntasDoFormulario, eq(perguntasDoFormulario.id, respostasDePergunta.perguntaId))
    .where(inArray(respostasDePergunta.respostaDeEscopoId, escopoIds))
    .orderBy(asc(perguntasDoFormulario.ordem))

  const julgamentos = await db
    .select({
      formularioId: julgamentosHumanos.formularioId,
      id: julgamentosHumanos.id,
      ordem: julgamentosHumanos.ordem,
      enunciado: julgamentosHumanos.enunciado,
      perguntaId: julgamentosHumanos.perguntaId,
    })
    .from(julgamentosHumanos)
    .where(inArray(julgamentosHumanos.formularioId, formularioIds))
    .orderBy(asc(julgamentosHumanos.ordem))

  return emEspera.map((e) => ({
    respostaDeEscopoId: e.respostaDeEscopoId,
    grupoId: e.grupoId,
    // O `where` filtra por `submetido`, e o CHECK garante a data nesse estado.
    submetidoEm: e.submetidoEm!,
    tema: e.temaId && e.temaNome ? { id: e.temaId, nome: e.temaNome } : null,
    respostas: respostas
      .filter((r) => r.respostaDeEscopoId === e.respostaDeEscopoId)
      .map(({ perguntaId, ordem, enunciado, texto }) => ({ perguntaId, ordem, enunciado, texto })),
    julgamentos: julgamentos
      .filter((j) => j.formularioId === e.formularioId)
      .map(({ id, ordem, enunciado, perguntaId }) => ({ id, ordem, enunciado, perguntaId })),
  }))
}

/** O estado vigente do escopo de um grupo. */
export async function estadoDoEscopo(
  db: Db,
  respostaDeEscopoId: string,
): Promise<EstadoDoEscopo | null> {
  const [escopo] = await db
    .select({ estado: respostasDeEscopo.estado })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
    .limit(1)

  return escopo?.estado ?? null
}
