import { and, eq, isNull, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { grupos, temas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * Erro de alocação, com mensagem que o aluno pode ler.
 *
 * Existe para o adaptador HTTP distinguir "esse tema já é de outro grupo" de
 * "o banco caiu" — e para a tela não precisar interpretar código de erro do
 * Postgres.
 */
export class AlocacaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'AlocacaoInvalida'
  }
}

/** Código do Postgres para violação de unicidade. */
const UNICIDADE_VIOLADA = '23505'

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  const causa = erro instanceof Error ? erro.cause : erro
  const codigo = (causa as { code?: unknown } | null)?.code
  return codigo === UNICIDADE_VIOLADA
}

/**
 * Aloca um tema a um grupo.
 *
 * "Um `Tema` pertence a no máximo um `Grupo` por `Turma`" — `D2-BANCO`,
 * Doc 7 §2.4. A razão não é estética: o envelope de incremento do D12 é escrito
 * por tema, e tema repetido significa envelope repetido, com risco de
 * vazamento entre grupos no dia mais importante da avaliação.
 *
 * A GARANTIA É DO BANCO, não desta função. O `where` só filtra grupo sem tema;
 * quem impede dois grupos com o mesmo tema é o índice único parcial. Verificar
 * antes e gravar depois perderia a corrida entre dois grupos clicando junto — e
 * a alocação acontece por negociação em sala, ou seja, todos ao mesmo tempo.
 *
 * A plataforma registra o resultado da negociação; ela não conduz a
 * negociação, e o desempate por sorteio acontece em sala.
 */
export async function alocaTema(db: Db, grupoId: string, temaId: string): Promise<void> {
  try {
    const atualizados = await db
      .update(grupos)
      .set({ temaId })
      .where(and(eq(grupos.id, grupoId), isNull(grupos.temaId)))
      .returning({ id: grupos.id })

    if (atualizados.length === 0) {
      throw new AlocacaoInvalida(
        'Este grupo já tem tema alocado. Para trocar, o instrutor precisa realocar.',
      )
    }
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) {
      throw new AlocacaoInvalida(
        'Este tema acabou de ser alocado a outro grupo da turma. Escolha outro.',
      )
    }
    throw erro
  }
}

/**
 * Realoca um tema, liberando o grupo anterior.
 *
 * Só o instrutor faz isso (Doc 7 §3: "Instrutor — Tudo"), e é o que resolve a
 * negociação que travou em sala. As duas escritas acontecem na MESMA transação:
 * liberar o anterior sem alocar o novo deixaria dois grupos sem tema, e a
 * turma inteira esperando.
 */
export async function realocaTema(
  db: Db,
  temaId: string,
  paraGrupoId: string,
): Promise<{ liberado: string | null }> {
  return db.transaction(async (tx) => {
    const [destino] = await tx
      .select({ id: grupos.id, turmaId: grupos.turmaId })
      .from(grupos)
      .where(eq(grupos.id, paraGrupoId))
      .limit(1)

    if (!destino) throw new AlocacaoInvalida('grupo de destino não existe')

    const [tema] = await tx.select({ id: temas.id }).from(temas).where(eq(temas.id, temaId)).limit(1)
    if (!tema) throw new AlocacaoInvalida('tema não existe')

    // Trava a turma pela ordem do id, para duas realocações simultâneas na
    // mesma turma serializarem em vez de se cruzarem.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${destino.turmaId}))`)

    const anteriores = await tx
      .update(grupos)
      .set({ temaId: null })
      .where(and(eq(grupos.turmaId, destino.turmaId), eq(grupos.temaId, temaId)))
      .returning({ id: grupos.id })

    await tx.update(grupos).set({ temaId }).where(eq(grupos.id, paraGrupoId))

    const liberado = anteriores.find((g) => g.id !== paraGrupoId)?.id ?? null
    return { liberado }
  })
}

/** O tema de um grupo, ou nulo. Usado para conferir o resultado da alocação. */
export async function temaDoGrupo(db: Db, grupoId: string): Promise<string | null> {
  const [grupo] = await db
    .select({ temaId: grupos.temaId })
    .from(grupos)
    .where(eq(grupos.id, grupoId))
    .limit(1)

  return grupo?.temaId ?? null
}
