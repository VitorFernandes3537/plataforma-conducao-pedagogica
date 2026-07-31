'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { registraCritica } from '@/db/critica'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { auth } from '@/lib/auth'
import { tenta, type Resultado } from '@/lib/erros'

/**
 * Registra a crítica de um par.
 *
 * O grupo autor vem da sessão, nunca do formulário. O cliente manda o `parId` e
 * o texto; quem é o grupo que escreve, a plataforma descobre pela matrícula — e
 * `registraCritica` confere que esse grupo é o revisor daquele par. Sem isso, o
 * `parId` num corpo de requisição deixaria um grupo escrever a crítica de
 * qualquer outro (ADR 0001 §3).
 */
export async function registraCriticaAction(dados: {
  rodadaId: string
  parId: string
  explicacaoDoTema: string
  cenarioQueQuebra: string
}): Promise<Resultado> {
  return tenta(async () => {
    const sessao = await auth()
    if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')

    const matricula = await matriculaDoUsuario(db(), sessao.usuarioId)
    if (!matricula?.grupoId) {
      throw new Error('A crítica é do grupo, e você ainda não tem grupo.')
    }

    await registraCritica(db(), dados.parId, matricula.grupoId, {
      explicacaoDoTema: dados.explicacaoDoTema,
      cenarioQueQuebra: dados.cenarioQueQuebra,
    })

    revalidatePath(`/critica/${dados.rodadaId}`)
  })
}
