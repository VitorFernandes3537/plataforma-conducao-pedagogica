import { and, eq, inArray } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import {
  estadosQueLevamA,
  motivoDaRecusa,
  type EstadoDoEscopo,
} from '@/domain/escopo'

import * as schema from './schema'
import { respostasDeEscopo, usuarios } from './schema'

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

async function exigeInstrutor(db: Db, usuarioId: string): Promise<void> {
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
