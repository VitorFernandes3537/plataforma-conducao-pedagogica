import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import { leDatabaseUrl } from '@/lib/env'

import * as schema from './schema'

// Instanciado sob demanda: no build da Vercel as rotas são avaliadas sem
// as variáveis de runtime, e um client criado no topo do módulo derrubaria
// o build inteiro por falta de DATABASE_URL.
let cached: ReturnType<typeof drizzle<typeof schema>> | undefined

export function db() {
  cached ??= drizzle(neon(leDatabaseUrl()), { schema })
  return cached
}
