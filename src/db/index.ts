import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import { leDatabaseUrl } from '@/lib/env'

import * as schema from './schema'

/**
 * O cliente do banco.
 *
 * **É `neon-serverless` e não `neon-http`, e a diferença não é de gosto: o
 * driver HTTP não suporta transação.** Ele responde
 * `No transactions support in neon-http driver` no primeiro `db.transaction()`,
 * e este projeto tem dez — o lançamento da avaliação, a gravação de resposta de
 * escopo, a linha de tradução, a alocação de tema, a poda, a atribuição de
 * escopo pré-aprovado, o incremento, a agregação e o próprio seed.
 *
 * O defeito não aparecia em teste: a suíte roda PGlite, que suporta transação.
 * Verde na suíte e quebrado no banco real, e quebrado justamente nas escritas
 * que precisam ser atômicas — as que existem porque metade da escrita seria pior
 * que nenhuma.
 *
 * O `Pool` é WebSocket e mantém sessão, que é o que a transação exige. Fica em
 * cache de módulo porque é assim que a conexão é reaproveitada entre invocações
 * na mesma instância.
 *
 * Instanciado sob demanda: no build da Vercel as rotas são avaliadas sem as
 * variáveis de runtime, e um cliente criado no topo do módulo derrubaria o build
 * inteiro por falta de `DATABASE_URL`.
 */
let cached: ReturnType<typeof drizzle<typeof schema>> | undefined

export function db() {
  cached ??= drizzle(new Pool({ connectionString: leDatabaseUrl() }), { schema })
  return cached
}
