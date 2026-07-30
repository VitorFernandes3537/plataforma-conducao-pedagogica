import { and, eq, isNull } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { grupos } from './schema'

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

/** O tema de um grupo, ou nulo. Usado para conferir o resultado da alocação. */
export async function temaDoGrupo(db: Db, grupoId: string): Promise<string | null> {
  const [grupo] = await db
    .select({ temaId: grupos.temaId })
    .from(grupos)
    .where(eq(grupos.id, grupoId))
    .limit(1)

  return grupo?.temaId ?? null
}
