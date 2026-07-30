import { PerguntaCondutora } from '@/components/pergunta-condutora'
import { db } from '@/db'
import { perguntaCondutoraDoUsuario } from '@/db/curso'
import { auth } from '@/lib/auth'

/**
 * Casca de toda tela do aluno.
 *
 * A pergunta condutora é renderizada AQUI, e não em cada página, porque o
 * critério de aceite é "aparece em todas as telas do aluno" (`D1-PERGUNTA`).
 * Uma lista de páginas que precisam mostrá-la falharia em silêncio no dia em
 * que alguém criasse a próxima. No layout do grupo de rotas, a tela nova nasce
 * com ela.
 */
export default async function LayoutDoAluno({ children }: { children: React.ReactNode }) {
  const sessao = await auth()
  const pergunta = sessao?.usuarioId
    ? await perguntaCondutoraDoUsuario(db(), sessao.usuarioId)
    : null

  return (
    <div className="min-h-dvh">
      {pergunta && <PerguntaCondutora texto={pergunta} />}
      {children}
    </div>
  )
}
