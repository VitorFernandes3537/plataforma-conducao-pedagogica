import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import {
  perguntasDoFormulario,
  podas,
  respostasAnteriores,
  respostasDeEscopo,
  respostasDePergunta,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra da poda, distinto de falha de banco. */
export class PodaInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'PodaInvalida'
  }
}

export type NovoTexto = { perguntaId: string; texto: string }

export type VersaoAnterior = {
  podaId: string
  podadoPorId: string
  motivo: string
  podadoEm: Date
  respostas: readonly { perguntaId: string; texto: string }[]
}

/**
 * Poda o escopo aprovado de um grupo.
 *
 * É a única edição admitida depois da aprovação (Doc 2 §4.5.1): o instrutor
 * reduz o escopo declarado mantendo o mesmo tema, porque rebaixamento de trilha
 * é poda e não troca de tema (Doc 5 §5.3). Daí não haver parâmetro de tema aqui
 * — o tema mora em `grupos` e esta função não o alcança.
 *
 * A ordem dentro da transação não é arbitrária:
 *
 * 1. Trava o escopo e confere que está aprovado.
 * 2. Copia as respostas vigentes para o histórico.
 * 3. Só então autoriza a escrita, apresentando o `id` da poda ao gatilho.
 *
 * Invertida, a autorização existiria antes do registro e uma falha no meio
 * deixaria escopo alterado sem histórico. Nesta ordem, o gatilho recusa qualquer
 * escrita cuja poda ainda não tenha sido gravada — o histórico é pré-requisito,
 * não consequência.
 *
 * O grupo nunca chega aqui: aprovar ou devolver, e podar, são atos do instrutor.
 */
export async function poda(
  db: Db,
  respostaDeEscopoId: string,
  instrutorId: string,
  motivo: string,
  novosTextos: readonly NovoTexto[],
): Promise<{ podaId: string }> {
  await exigeInstrutor(db, instrutorId)

  if (motivo.trim().length === 0) {
    throw new PodaInvalida('poda exige motivo escrito')
  }
  if (novosTextos.length === 0) {
    throw new PodaInvalida('poda sem resposta alterada não reduz escopo nenhum')
  }

  return db.transaction(async (tx) => {
    const [escopo] = await tx
      .select({ id: respostasDeEscopo.id, estado: respostasDeEscopo.estado })
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
      .limit(1)
      .for('update')

    if (!escopo) throw new PodaInvalida('escopo não encontrado')
    if (escopo.estado !== 'aprovado') {
      throw new PodaInvalida(
        `escopo ${escopo.estado}: poda é edição de escopo aprovado, não de escopo em andamento`,
      )
    }

    const vigentes = await tx
      .select({
        perguntaId: respostasDePergunta.perguntaId,
        texto: respostasDePergunta.texto,
      })
      .from(respostasDePergunta)
      .where(eq(respostasDePergunta.respostaDeEscopoId, respostaDeEscopoId))

    const conhecidas = new Set(vigentes.map((v) => v.perguntaId))
    const forasteira = novosTextos.find((n) => !conhecidas.has(n.perguntaId))
    if (forasteira) {
      // Poda reduz o que foi entregue. Responder pergunta em branco depois da
      // aprovação seria ampliar escopo pela porta da exceção.
      throw new PodaInvalida('poda não responde pergunta que o grupo deixou em branco')
    }

    const [registro] = await tx
      .insert(podas)
      .values({ respostaDeEscopoId, podadoPorId: instrutorId, motivo: motivo.trim() })
      .returning({ id: podas.id })

    if (!registro) throw new PodaInvalida('não foi possível registrar a poda')

    if (vigentes.length > 0) {
      await tx.insert(respostasAnteriores).values(
        vigentes.map((v) => ({ podaId: registro.id, perguntaId: v.perguntaId, texto: v.texto })),
      )
    }

    // A porta se abre aqui, e só para esta poda. `set_config` com `is_local`
    // verdadeiro é o `SET LOCAL` que aceita parâmetro — a autorização morre com
    // a transação e não vaza para a consulta seguinte da mesma conexão.
    await tx.execute(sql`select set_config('pcp.poda_autorizada', ${registro.id}, true)`)

    for (const { perguntaId, texto } of novosTextos) {
      await tx
        .update(respostasDePergunta)
        .set({ texto, atualizadoEm: new Date() })
        .where(
          and(
            eq(respostasDePergunta.respostaDeEscopoId, respostaDeEscopoId),
            eq(respostasDePergunta.perguntaId, perguntaId),
          ),
        )
    }

    return { podaId: registro.id }
  })
}

/**
 * O histórico de podas de um escopo, do mais antigo para o mais recente.
 *
 * A comparação entre a versão guardada e a vigente é o que mostra o que o grupo
 * deixou de entregar — e é isso que o instrutor consulta na defesa oral.
 */
export async function historicoDePodas(
  db: Db,
  respostaDeEscopoId: string,
): Promise<VersaoAnterior[]> {
  const registros = await db
    .select()
    .from(podas)
    .where(eq(podas.respostaDeEscopoId, respostaDeEscopoId))
    .orderBy(asc(podas.podadoEm), asc(podas.id))

  if (registros.length === 0) return []

  const anteriores = await db
    .select({
      podaId: respostasAnteriores.podaId,
      perguntaId: respostasAnteriores.perguntaId,
      texto: respostasAnteriores.texto,
      ordem: perguntasDoFormulario.ordem,
    })
    .from(respostasAnteriores)
    .innerJoin(perguntasDoFormulario, eq(perguntasDoFormulario.id, respostasAnteriores.perguntaId))
    .where(
      inArray(
        respostasAnteriores.podaId,
        registros.map((r) => r.id),
      ),
    )
    .orderBy(asc(perguntasDoFormulario.ordem))

  return registros.map((r) => ({
    podaId: r.id,
    podadoPorId: r.podadoPorId,
    motivo: r.motivo,
    podadoEm: r.podadoEm,
    respostas: anteriores
      .filter((a) => a.podaId === r.id)
      .map(({ perguntaId, texto }) => ({ perguntaId, texto })),
  }))
}
