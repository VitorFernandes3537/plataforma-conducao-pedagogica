import Link from 'next/link'

import { Logotipo } from '@/components/ui'
import { auth } from '@/lib/auth'

/**
 * A porta pública.
 *
 * Serve dois momentos, e nenhum deles é institucional: o primeiro contato de
 * quem abre a plataforma no D1 (Doc 4 §3, "tour e cadastro"), e o destino de
 * quem acabou de entrar e ainda não sabe para onde vai. Por isso ela diz o que a
 * plataforma é, o que ela recusa, e leva a **um** lugar.
 *
 * O que ela recusa está aqui de propósito. O Doc 7 §6 é a parte da especificação
 * que mais protege o produto, e uma porta que só promete infla a expectativa
 * exatamente onde o escopo é mais frágil.
 *
 * O que estava aqui antes afirmava que nenhuma entidade de domínio existia
 * ainda e apontava para as issues 1 e 2. Ficou vinte e cinco issues atrasado, na
 * primeira coisa que qualquer pessoa vê.
 */
export default async function Home() {
  const sessao = await auth()

  const entrada = !sessao
    ? { href: '/entrar', rotulo: 'Entrar' }
    : sessao.papel === 'instrutor'
      ? { href: '/instrutor', rotulo: 'Ir para suas turmas' }
      : { href: '/hoje', rotulo: 'Ir para o seu dia' }

  return (
    <main className="margem flex min-h-dvh flex-col justify-center gap-12 py-20">
      <div>
        <Logotipo tamanho="abertura" />
        <p className="mt-9 max-w-[42ch] font-prosa text-2xl leading-snug tracking-tight text-tinta">
          Conduz um módulo de ensino baseado em projetos do primeiro dia ao
          último: o dia, o mural, os obstáculos, o escopo de cada grupo e a
          avaliação que acontece em aula.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={entrada.href} className="botao botao-acao">
          {entrada.rotulo}
        </Link>
        {!sessao && <p className="legenda">a entrada é pela sua conta do github</p>}
      </div>

      <section>
        <h2 className="legenda">e o que ela não faz</h2>
        <ul className="mt-3 flex max-w-[62ch] flex-col gap-2 text-[0.9375rem] leading-snug text-tinta-media">
          {[
            'Não hospeda o código de ninguém — o repositório é seu, é público, e continua no ar depois do curso.',
            'Não substitui o mural da sala. Ela o espelha, e o mural continua sendo de papel.',
            'Não corrige código, não gera conteúdo e não decide nota sozinha.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.6rem] h-px w-3 shrink-0 bg-linha-forte" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
