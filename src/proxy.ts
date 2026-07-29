import { NextResponse, type NextRequest } from 'next/server'

import { ehRotaDeInstrutor } from '@/domain/autorizacao'
import { auth } from '@/lib/auth'

// No Next 16 o arquivo é `proxy.ts` com export nomeado `proxy`. Um
// `middleware.ts` remanescente NÃO gera erro de build — ele simplesmente não
// roda, e toda rota protegida vira pública em silêncio (ADR 0002 §7).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!ehRotaDeInstrutor(pathname)) return NextResponse.next()

  const sessao = await auth()

  if (!sessao) {
    const login = new URL('/api/auth/signin', request.url)
    login.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(login)
  }

  if (sessao.papel !== 'instrutor') {
    // 403, não redirecionamento: quem está autenticado e não tem o papel
    // recebe negativa explícita em vez de um laço de login.
    return new NextResponse('Acesso negado', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  // Matcher negativo: sem ele o proxy roda em CSS, JS e imagem, e no Next 16
  // ele é função Node faturada por invocação.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
