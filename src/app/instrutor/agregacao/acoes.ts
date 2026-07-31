'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { finalizaAgregacao } from '@/db/rubrica'
import { auth } from '@/lib/auth'
import { tenta, type Resultado } from '@/lib/erros'

/**
 * Fecha a agregação de uma turma (Doc 6 §0.3).
 *
 * É o ato que torna a nota visível para o aluno — antes disso, `notaVisivel`
 * recusa. Por isso é do instrutor, e a sessão o entrega; `finalizaAgregacao`
 * reconfere o papel no banco e recusa fechar o que já foi fechado.
 */
export async function fechaAgregacaoAction(dados: { turmaId: string }): Promise<Resultado> {
  return tenta(async () => {
    const sessao = await auth()
    if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
    if (sessao.papel !== 'instrutor') throw new Error('Só o instrutor fecha a agregação.')

    await finalizaAgregacao(db(), dados.turmaId, sessao.usuarioId)
    // O path, sem a query: `revalidatePath` casa por caminho, e o `?turma=` só
    // faria a revalidação não encontrar a rota — a tela ficaria mostrando o
    // estado velho apesar de o banco já ter fechado.
    revalidatePath('/instrutor/agregacao')
  })
}
