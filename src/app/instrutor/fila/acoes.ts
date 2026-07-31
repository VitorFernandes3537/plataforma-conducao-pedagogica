'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { aprova, devolve } from '@/db/fila-de-aprovacao'
import { auth } from '@/lib/auth'

/**
 * Decisões da fila de aprovação.
 *
 * O instrutor vem da sessão, sempre. Ele fica registrado em `decididoPorId`, e
 * aceitar esse id do cliente deixaria a decisão do marco assinada por quem
 * quisesse — o proxy protege a rota, mas server action é endpoint (ADR 0001 §3).
 *
 * A conferência de papel acontece de novo dentro de `aprova` e `devolve`, por
 * `exigeInstrutor`. Aqui ela existe para falhar cedo e com frase, não para ser a
 * única.
 */
async function instrutorDaSessao(): Promise<string> {
  const sessao = await auth()
  if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
  if (sessao.papel !== 'instrutor') throw new Error('Só o instrutor decide escopo.')
  return sessao.usuarioId
}

export async function aprovaEscopoAction(dados: { respostaDeEscopoId: string }) {
  const instrutorId = await instrutorDaSessao()
  await aprova(db(), dados.respostaDeEscopoId, instrutorId)
  revalidatePath('/instrutor/fila')
  revalidatePath('/escopo')
}

export async function devolveEscopoAction(dados: {
  respostaDeEscopoId: string
  motivo: string
}) {
  const instrutorId = await instrutorDaSessao()
  // O motivo é exigido aqui, dentro de `devolve` e por CHECK no banco. Devolver
  // sem dizer o que corrigir gastaria de novo os minutos que a fila tem por
  // grupo (Doc 2 §4.5) — e o grupo voltaria para a fila com o mesmo defeito.
  await devolve(db(), dados.respostaDeEscopoId, instrutorId, dados.motivo)
  revalidatePath('/instrutor/fila')
  revalidatePath('/escopo')
}
