import { z } from 'zod'

/**
 * Validação das variáveis de ambiente.
 *
 * Existe por causa de um erro concreto: `npx auth secret` gera
 * `BETTER_AUTH_SECRET`, porque o pacote `auth` no npm é o CLI do Better Auth,
 * não do Auth.js. O nome errado não causa erro — a aplicação sobe e o login
 * simplesmente não funciona, sem dizer por quê.
 *
 * Aqui a falha é alta e nomeia a variável que falta.
 */
const esquema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL não definida. Copie a connection string do Neon.')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL precisa começar com postgres:// ou postgresql://',
    }),
  AUTH_SECRET: z
    .string()
    .min(
      32,
      'AUTH_SECRET ausente ou curta. Gere com: node -e "console.log(require(\'crypto\').randomBytes(33).toString(\'base64\'))". Atenção: `npx auth secret` gera BETTER_AUTH_SECRET, que é de outra biblioteca.',
    ),
  AUTH_GITHUB_ID: z.string().min(1, 'AUTH_GITHUB_ID não definida. Registre um OAuth App no GitHub.'),
  AUTH_GITHUB_SECRET: z.string().min(1, 'AUTH_GITHUB_SECRET não definida.'),
})

export type Env = z.infer<typeof esquema>

/**
 * Lê e valida o ambiente.
 *
 * Chamada sob demanda, nunca no topo de módulo: no build da Vercel as rotas
 * são avaliadas sem as variáveis de runtime, e validar na importação
 * derrubaria o build inteiro.
 */
export function leEnv(): Env {
  const resultado = esquema.safeParse(process.env)

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  · ${String(i.path[0] ?? '?')}: ${i.message}`)
      .join('\n')
    throw new Error(`Ambiente inválido:\n${problemas}`)
  }

  return resultado.data
}

/** Só o que o banco precisa — o seed e as migrations não usam OAuth. */
export function leDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL não definida. Copie .env.example para .env.local e cole a connection string do Neon.',
    )
  }
  return url
}
