// Confere que a DATABASE_URL conecta e em que versão. Somente leitura:
// nenhuma tabela criada, nenhuma migration aplicada.
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

const { neon } = await import('@neondatabase/serverless')
const { leDatabaseUrl } = await import('../src/lib/env.ts')

const sql = neon(leDatabaseUrl())
const [info] = await sql`
  select current_setting('server_version') as versao,
         current_database() as banco,
         (select count(*)::int from information_schema.tables where table_schema = 'public') as tabelas
`
console.log(`conectado · Postgres ${info.versao} · banco "${info.banco}" · ${info.tabelas} tabelas em public`)
