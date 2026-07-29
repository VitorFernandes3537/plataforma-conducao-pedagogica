import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

import * as schema from '@/db/schema'

export type BancoEfemero = Awaited<ReturnType<typeof criaBancoEfemero>>

/**
 * Postgres real, em memória, por teste.
 *
 * PGlite é o Postgres compilado para WASM — não é mock nem SQLite. Isso
 * importa porque o que se testa aqui é integridade de dados: CHECK
 * constraint e índice único parcial, que banco falso não reproduz
 * (ADR 0001, §6).
 */
export async function criaBancoEfemero() {
  const cliente = new PGlite()
  const db = drizzle(cliente, { schema })

  await migrate(db, { migrationsFolder: './drizzle' })

  return {
    db,
    async encerra() {
      await cliente.close()
    },
  }
}
