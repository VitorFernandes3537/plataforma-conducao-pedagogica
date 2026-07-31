'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { respondeReflexao } from '@/db/reflexao'
import { auth } from '@/lib/auth'
import { tenta, type Resultado } from '@/lib/erros'

/**
 * Grava a resposta do aluno a uma reflexão.
 *
 * O aluno vem da sessão, nunca do cliente. O que o formulário manda é a reflexão
 * e o texto; de quem é a produção, a plataforma descobre pela matrícula, e
 * `respondeReflexao` reconfere com `exigeProducaoPropria`. Se o `alunoId` viesse
 * do corpo da requisição, uma pessoa responderia a retrospectiva de outra
 * (ADR 0001 §3).
 */
export async function respondeReflexaoAction(dados: {
  reflexaoId: string
  texto: string
}): Promise<Resultado> {
  return tenta(async () => {
    const sessao = await auth()
    if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')

    const matricula = await matriculaDoUsuario(db(), sessao.usuarioId)
    if (!matricula) throw new Error('Você ainda não está numa turma.')

    await respondeReflexao(
      db(),
      matricula.alunoId,
      dados.reflexaoId,
      dados.texto,
      sessao.usuarioId,
    )

    revalidatePath('/percurso')
  })
}
