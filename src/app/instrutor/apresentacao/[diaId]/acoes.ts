'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { liberaAgregado } from '@/db/bloco-de-material'
import { auth } from '@/lib/auth'
import { tenta, type Resultado } from '@/lib/erros'

/**
 * Ações do modo apresentação.
 *
 * Só uma existe, e é a única coisa que a apresentação escreve: liberar o
 * agregado de um bloco. Avançar lâmina e revelar camada não gravam nada — quem
 * conduz é a pessoa, e a plataforma não guarda em que slide a sala estava.
 * Guardar isso seria um "agora" inventado, e a plataforma não tem relógio.
 */
export async function liberaAgregadoAction(dados: {
  blocoId: string
  diaId: string
}): Promise<Resultado> {
  return tenta(async () => {
    const sessao = await auth()
    if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
    if (sessao.papel !== 'instrutor') throw new Error('Só o instrutor libera o agregado.')

    // A conferência de papel acontece de novo dentro de `liberaAgregado`. Aqui
    // ela existe para falhar cedo e com frase, não para ser a única (ADR 0001 §3).
    await liberaAgregado(db(), dados.blocoId, sessao.usuarioId)
    revalidatePath(`/instrutor/apresentacao/${dados.diaId}`)
  })
}
