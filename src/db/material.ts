import { and, asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { dias, materiaisInterativos } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type Lamina = {
  id: string
  ordem: number
  titulo: string
  conteudo: string
}

/**
 * As lâminas de um dia, em ordem.
 *
 * `ordem` vem do dado e é única por dia, então a sequência é determinística —
 * a apresentação nunca depende da ordem de inserção.
 */
export async function laminasDoDia(db: Db, diaId: string): Promise<Lamina[]> {
  return db
    .select({
      id: materiaisInterativos.id,
      ordem: materiaisInterativos.ordem,
      titulo: materiaisInterativos.titulo,
      conteudo: materiaisInterativos.conteudo,
    })
    .from(materiaisInterativos)
    .where(eq(materiaisInterativos.diaId, diaId))
    .orderBy(asc(materiaisInterativos.ordem))
}

/**
 * As lâminas do dia corrente de um curso, pela ordem do dia no calendário.
 *
 * O dia corrente é passado por parâmetro, nunca derivado do relógio aqui: o
 * curso é presencial e o instrutor conduz o ritmo (Doc 4 §2). Amarrar a tela ao
 * relógio do servidor quebraria a aula que atrasa cinco minutos.
 */
export async function laminasDoDiaCorrente(
  db: Db,
  cursoId: string,
  ordemDoDia: number,
): Promise<Lamina[]> {
  const [dia] = await db
    .select({ id: dias.id })
    .from(dias)
    .where(and(eq(dias.cursoId, cursoId), eq(dias.ordem, ordemDoDia)))
    .limit(1)

  if (!dia) return []
  return laminasDoDia(db, dia.id)
}

/**
 * Passo de navegação em modo apresentação.
 *
 * Função pura sobre o total: devolve o índice seguinte, o anterior, e se há
 * para onde ir. Fica aqui e não no componente para ser testável sem montar
 * React — a regra de borda é o que o critério de aceite cobra.
 */
export function navega(
  indiceAtual: number,
  total: number,
  direcao: 'anterior' | 'proxima',
): { indice: number; temAnterior: boolean; temProxima: boolean } {
  const limite = Math.max(0, total - 1)
  const bruto = direcao === 'proxima' ? indiceAtual + 1 : indiceAtual - 1
  const indice = Math.min(limite, Math.max(0, bruto))

  return {
    indice,
    temAnterior: indice > 0,
    temProxima: indice < limite,
  }
}
