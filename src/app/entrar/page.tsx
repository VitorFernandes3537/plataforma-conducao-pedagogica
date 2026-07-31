import { redirect } from 'next/navigation'

import { Aviso, Logotipo } from '@/components/ui'
import { auth } from '@/lib/auth'
import { destinoSeguro } from '@/lib/destino'

import { entrarComGitHubAction } from './acoes'

export const metadata = { title: 'Entrar — PCP' }

/**
 * A tela de entrada.
 *
 * Existe porque a plataforma não tinha uma: sem `pages.signIn`, o Auth.js servia
 * a página padrão dele — fora do layout raiz, em inglês, com as fontes do
 * navegador e um tema escuro que o `color-scheme: light` do sistema não alcança,
 * porque é outro documento. Todo mundo passava por ali, instrutor e aluno.
 *
 * E é o primeiro contato da turma inteira com o produto: o Doc 4 §3 reserva um
 * bloco do D1 para tour e cadastro. Uma tela em inglês que só diz "Sign in with
 * GitHub" desperdiça esse bloco explicando o que a tela devia ter dito sozinha.
 *
 * As duas frases que ela precisa dizer antes do clique vêm da ADR 0002: a
 * identidade é a conta do GitHub, e **autorizar o aplicativo não cria acesso** —
 * quem não foi matriculado é recusado depois de autorizar, e sem esse aviso a
 * recusa parece defeito da plataforma.
 */

type Motivo = { titulo: string; corpo: string; tom: 'portao' | 'destaque' }

/**
 * Os códigos são os do Auth.js. O que não estiver mapeado cai no genérico — a
 * lista muda entre versões, e uma tela que exibisse o código cru ("Verification")
 * empurraria a tradução para a pessoa errada.
 */
const MOTIVO: Record<string, Motivo> = {
  AccessDenied: {
    titulo: 'A sua conta entrou no GitHub, mas não está matriculada.',
    corpo:
      'A matrícula é feita pelo instrutor, por usuário do GitHub. Autorizar o aplicativo não cria acesso — procure o instrutor com o seu usuário em mãos.',
    tom: 'portao',
  },
  Configuration: {
    titulo: 'A entrada está mal configurada no servidor.',
    corpo:
      'Não é a sua credencial, e tentar de novo não resolve. O erro de verdade está no log do servidor.',
    tom: 'portao',
  },
  Verification: {
    titulo: 'O link de entrada não vale mais.',
    corpo: 'Comece de novo por esta tela.',
    tom: 'destaque',
  },
}

const GENERICO: Motivo = {
  titulo: 'Não foi possível concluir a entrada.',
  corpo: 'Tente de novo. Se repetir, avise o instrutor antes de continuar sozinho.',
  tom: 'destaque',
}

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams
  const destino = destinoSeguro(callbackUrl)

  // Quem já tem sessão não fica preso numa tela de entrar. Isso acontece de
  // verdade: o botão de voltar depois do login cai exatamente aqui.
  const sessao = await auth()
  if (sessao) redirect(destino === '/' ? (sessao.papel === 'instrutor' ? '/instrutor' : '/hoje') : destino)

  const motivo = error ? (MOTIVO[error] ?? GENERICO) : null

  return (
    <main className="margem flex min-h-dvh flex-col justify-center gap-10 py-20">
      <Logotipo tamanho="abertura" />

      {motivo && (
        <Aviso tom={motivo.tom} className="max-w-[62ch]">
          <strong className="font-medium">{motivo.titulo}</strong>{' '}
          <span className="text-tinta-media">{motivo.corpo}</span>
        </Aviso>
      )}

      <div>
        <h1 className="max-w-[26ch] font-prosa text-[1.875rem] leading-tight tracking-tight text-tinta">
          A sua conta do GitHub é a sua identidade aqui.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-tinta-media">
          Não há senha para criar nem para esquecer. É a mesma conta que assina o
          seu repositório — que é público, é o produto deste curso, e continua no
          ar depois dele.
        </p>
      </div>

      <form action={entrarComGitHubAction} className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <input type="hidden" name="destino" value={destino} />
        <button type="submit" className="botao botao-acao">
          Entrar com o GitHub
        </button>
        <p className="legenda">entra quem o instrutor já matriculou</p>
      </form>
    </main>
  )
}
