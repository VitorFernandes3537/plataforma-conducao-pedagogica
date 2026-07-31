'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { avancaDia } from '@/db/dia-corrente'
import { riscaItem } from '@/db/mural'
import { lancaAvaliacaoDoAluno } from '@/db/registro-diario'
import { auth } from '@/lib/auth'

/**
 * Ações da área do instrutor.
 *
 * Cada uma revalida a sessão por conta própria. O proxy já barra quem não é
 * instrutor da rota, mas server action é endpoint: quem souber o identificador
 * dela a chama direto, sem passar por página nenhuma (ADR 0001 §3).
 *
 * A autorização de verdade continua no módulo de banco — `exigeInstrutor` está
 * dentro de cada função. Aqui a checagem existe para falhar cedo e com frase,
 * não para ser a única.
 */
async function instrutorDaSessao(): Promise<string> {
  const sessao = await auth()
  if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
  if (sessao.papel !== 'instrutor') throw new Error('Esta ação é do instrutor.')
  return sessao.usuarioId
}

export async function lancaAvaliacaoAction(dados: {
  alunoId: string
  diaId: string
  obstaculoId: string
  valor: number
  turmaId: string
}) {
  const instrutorId = await instrutorDaSessao()

  await lancaAvaliacaoDoAluno(db(), dados.alunoId, {
    diaId: dados.diaId,
    obstaculoId: dados.obstaculoId,
    valor: dados.valor,
    instrutorId,
  })

  revalidatePath(`/instrutor/turma/${dados.turmaId}`)
}

export async function riscaItemDoMuralAction(dados: { itemId: string; turmaId: string }) {
  const instrutorId = await instrutorDaSessao()
  await riscaItem(db(), dados.itemId, instrutorId)
  revalidatePath(`/instrutor/turma/${dados.turmaId}`)
}

export async function avancaDiaAction(turmaId: string) {
  const instrutorId = await instrutorDaSessao()
  await avancaDia(db(), turmaId, instrutorId)
  revalidatePath(`/instrutor/turma/${turmaId}`)
}
