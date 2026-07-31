'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { abreContratoDiario, fechaContratoDiario } from '@/db/contrato-diario'
import { escreveNoMural } from '@/db/mural'
import { confirmaPush, registraLogDeObstaculo } from '@/db/registro-diario'
import { auth } from '@/lib/auth'

/**
 * Ações do aluno.
 *
 * Cada uma passa o autor da sessão adiante, e é o módulo de banco que decide se
 * ele pode — `exigeProducaoPropria` está lá dentro. A sessão aqui serve para
 * falhar cedo e para o autor nunca vir do cliente: se viesse, qualquer pessoa
 * escreveria o contrato de qualquer outra.
 */
async function autorDaSessao(): Promise<string> {
  const sessao = await auth()
  if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
  return sessao.usuarioId
}

export async function abreContratoAction(dados: {
  alunoId: string
  diaId: string
  faremos: string
  naoFaremos: string
}) {
  const autorId = await autorDaSessao()
  await abreContratoDiario(
    db(),
    dados.alunoId,
    dados.diaId,
    { faremos: dados.faremos, naoFaremos: dados.naoFaremos },
    autorId,
  )
  revalidatePath('/hoje')
}

export async function fechaContratoAction(dados: {
  alunoId: string
  diaId: string
  cumprido: boolean
  motivo: string
}) {
  const autorId = await autorDaSessao()
  await fechaContratoDiario(
    db(),
    dados.alunoId,
    dados.diaId,
    { cumprido: dados.cumprido, motivo: dados.motivo },
    autorId,
  )
  revalidatePath('/hoje')
}

export async function escreveNoMuralAction(dados: {
  grupoId: string
  obstaculoId: string
  texto: string
}) {
  // Escrever no mural não passa por `exigeProducaoPropria`: o item é do GRUPO,
  // e o Doc 5 §8.1 diz que quem escreve é quem travou. A sessão garante que há
  // alguém logado; o vínculo com o grupo vem da matrícula, não do cliente.
  await autorDaSessao()
  await escreveNoMural(db(), dados.grupoId, dados.obstaculoId, dados.texto)
  revalidatePath('/hoje')
}

export async function registraLogAction(dados: {
  alunoId: string
  diaId: string
  obstaculoId: string
  texto: string
}) {
  const autorId = await autorDaSessao()
  await registraLogDeObstaculo(
    db(),
    dados.alunoId,
    dados.diaId,
    dados.obstaculoId,
    dados.texto,
    autorId,
  )
  revalidatePath('/hoje')
}

export async function confirmaPushAction(dados: { alunoId: string; diaId: string }) {
  const autorId = await autorDaSessao()
  await confirmaPush(db(), dados.alunoId, dados.diaId, autorId)
  revalidatePath('/hoje')
}
