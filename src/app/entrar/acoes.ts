'use server'

import { signIn } from '@/lib/auth'
import { destinoSeguro } from '@/lib/destino'

export async function entrarComGitHubAction(formData: FormData) {
  const destino = destinoSeguro(formData.get('destino')?.toString())
  // `signIn` termina em redirecionamento — ele lança para navegar. Não há
  // try/catch aqui de propósito: capturar engoliria a navegação, e a tela
  // ficaria parada sem dizer por quê.
  await signIn('github', { redirectTo: destino })
}
