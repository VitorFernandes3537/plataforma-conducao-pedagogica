// Confere o ambiente e diz o que falta, pelo nome.
//
// Nunca imprime valor de variável — só nome e diagnóstico. Rodar isto é mais
// barato que descobrir no D1 que o login não funciona.

import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const { leEnv } = await import('../src/lib/env.ts')

try {
  leEnv()
  console.log('Ambiente completo: DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET.')
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro))

  if (process.env.BETTER_AUTH_SECRET && !process.env.AUTH_SECRET) {
    console.error(
      '\nEncontrei BETTER_AUTH_SECRET no ambiente. Ela é do Better Auth, não do Auth.js.\n' +
        'Renomeie a chave para AUTH_SECRET — o valor serve.',
    )
  }

  process.exitCode = 1
}
