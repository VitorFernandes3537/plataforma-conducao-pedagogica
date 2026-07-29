import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL não definida.')
  }
  return url
}

// Instanciado sob demanda: no build da Vercel as rotas são avaliadas sem
// as variáveis de runtime, e um client criado no topo do módulo derrubaria
// o build inteiro por falta de DATABASE_URL.
let cached: ReturnType<typeof drizzle<typeof schema>> | undefined

export function db() {
  cached ??= drizzle(neon(connectionString()), { schema })
  return cached
}
