import { config as carregaEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

carregaEnv({ path: '.env.local', quiet: true })

// `generate` roda offline — só compara o schema com a pasta de migrations.
// `migrate` e `push` precisam de banco. O placeholder abaixo garante que o
// primeiro funcione sem DATABASE_URL e que os outros falhem alto em vez de
// aplicarem no banco errado: a partir do D1 o banco carrega nota de aluno.
const url = process.env.DATABASE_URL ?? 'postgresql://DATABASE_URL-nao-definida'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
