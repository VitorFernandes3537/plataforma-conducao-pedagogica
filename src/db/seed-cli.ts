import { config as carregaEnv } from 'dotenv'

carregaEnv({ path: '.env.local', quiet: true })

const { db } = await import('./index')
const { semeia } = await import('./seed')

const resultado = await semeia(db())
console.log('Seed aplicado.', resultado)
