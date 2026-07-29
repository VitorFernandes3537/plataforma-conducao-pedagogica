import { eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

import { db } from '@/db'
import { usuarios } from '@/db/schema'
import type { Papel } from '@/domain/autorizacao'

declare module 'next-auth' {
  interface Session {
    usuarioId: string
    papel: Papel
    githubLogin: string
  }
}

/** O `id` do perfil do GitHub é numérico e é a chave de identidade (ADR 0002 §2). */
function githubUserIdDe(profile: unknown): number | null {
  const id = (profile as { id?: unknown } | null)?.id
  const numero = typeof id === 'string' ? Number(id) : typeof id === 'number' ? id : NaN
  return Number.isSafeInteger(numero) ? numero : null
}

async function buscaUsuario(githubUserId: number) {
  const [usuario] = await db()
    .select()
    .from(usuarios)
    .where(eq(usuarios.githubUserId, githubUserId))
    .limit(1)
  return usuario ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  // Sessão em JWT: não há adapter de banco, então o proxy consegue decidir
  // sem consultar o Postgres a cada request.
  session: { strategy: 'jwt' },
  callbacks: {
    /**
     * Só entra quem o instrutor já matriculou. Autorizar a aplicação no
     * GitHub não cria conta aqui — senão qualquer pessoa do mundo entraria
     * na turma.
     */
    async signIn({ profile }) {
      const githubUserId = githubUserIdDe(profile)
      if (githubUserId === null) return false
      return (await buscaUsuario(githubUserId)) !== null
    },

    async jwt({ token, profile }) {
      // `profile` só existe no login. Nos requests seguintes o token já
      // carrega o papel, e não se toca no banco.
      if (!profile) return token

      const githubUserId = githubUserIdDe(profile)
      if (githubUserId === null) return token

      const usuario = await buscaUsuario(githubUserId)
      if (!usuario) return token

      token.usuarioId = usuario.id
      token.papel = usuario.papel
      token.githubLogin = usuario.githubLogin
      return token
    },

    async session({ session, token }) {
      session.usuarioId = String(token.usuarioId ?? '')
      session.papel = (token.papel as Papel | undefined) ?? 'aluno'
      session.githubLogin = String(token.githubLogin ?? '')
      return session
    },
  },
})
