import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

import * as schema from '@/db/schema'

export type BancoEfemero = Awaited<ReturnType<typeof criaBancoEfemero>>

/**
 * Cópia de um banco já migrado, guardada por processo.
 *
 * Sem isso, cada teste subia um Postgres e aplicava TODAS as migrations —
 * trabalho que cresce a cada issue e é idêntico em todos eles. Com um arquivo
 * de teste por processo (`pool: 'forks'`), o primeiro teste paga a migração e
 * os seguintes carregam o resultado.
 *
 * O motivo não é só velocidade: a suíte falhou duas vezes de forma
 * irreprodutível, sempre na primeira rodada após um arquivo novo, e custo de
 * partida sob concorrência é o suspeito mais provável. Encurtar a partida
 * reduz a janela — e mesmo que a causa fosse outra, uma suíte três vezes mais
 * rápida é ganho que se paga sozinho.
 */
let moldeMigrado: Promise<Blob> | undefined

async function preparaMolde(): Promise<Blob> {
  const cliente = new PGlite()
  await migrate(drizzle(cliente, { schema }), { migrationsFolder: './drizzle' })
  const copia = await cliente.dumpDataDir()
  await cliente.close()
  return copia
}

/**
 * Postgres real, em memória, por teste.
 *
 * PGlite é o Postgres compilado para WASM — não é mock nem SQLite. Isso
 * importa porque o que se testa aqui é integridade de dados: CHECK
 * constraint, índice único parcial e gatilho, que banco falso não reproduz
 * (ADR 0001 §6).
 */
export async function criaBancoEfemero() {
  moldeMigrado ??= preparaMolde()
  const molde = await moldeMigrado

  // O dump é consumido na carga, então cada teste recebe a própria fatia.
  const cliente = new PGlite({ loadDataDir: molde.slice(0) })
  const db = drizzle(cliente, { schema })

  return {
    db,
    async encerra() {
      await cliente.close()
    },
  }
}
