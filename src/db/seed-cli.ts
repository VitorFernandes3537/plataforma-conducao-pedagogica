import { config as carregaEnv } from 'dotenv'

/**
 * Entrada de linha de comando do seed.
 *
 * Envolvido em função de propósito: sem `"type": "module"` no package.json, o
 * tsx compila `.ts` para CJS, e `await` no topo do arquivo é erro de
 * transformação. A ordem importa — o dotenv precisa rodar antes de importar
 * `./index`, que lê DATABASE_URL.
 */
async function principal() {
  carregaEnv({ path: '.env.local', quiet: true })

  const { db } = await import('./index')
  const { semeia } = await import('./seed')

  const resultado = await semeia(db())
  console.log('Seed aplicado.')
  console.table(resultado)
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exitCode = 1
})
