'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { registraDefesa } from '@/db/rubrica'
import { auth } from '@/lib/auth'
import { tenta, type Resultado } from '@/lib/erros'

/**
 * Registra a defesa oral de um grupo (Doc 6 §6).
 *
 * O que se grava é **quais perguntas foram feitas**, porque é isso que torna a
 * defesa auditável: duas por grupo, escolhidas na hora sobre aquele código. Sem
 * o registro, ninguém explica depois por que a nota de um grupo subiu e a de
 * outro não.
 *
 * A nota por eixo **não** entra aqui. O Doc 6 §6 diz que a defesa ajusta os
 * Eixos 1 e 2, mas não diz **quanto** — é pendência conhecida da série
 * (CLAUDE §10). Enquanto o tamanho do ajuste não estiver na série, a plataforma
 * registra o fato e as perguntas, e não aplica um número que ninguém definiu.
 *
 * O instrutor vem da sessão, e `registraDefesa` reconfere o papel no banco.
 */
export async function registraDefesaAction(dados: {
  grupoId: string
  perguntasIds: readonly string[]
}): Promise<Resultado> {
  return tenta(async () => {
    const sessao = await auth()
    if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')
    if (sessao.papel !== 'instrutor') throw new Error('A defesa é registrada pelo instrutor.')

    await registraDefesa(
      db(),
      dados.grupoId,
      { perguntasUsadas: dados.perguntasIds, notas: [] },
      sessao.usuarioId,
    )

    revalidatePath(`/instrutor/grupo/${dados.grupoId}`)
  })
}
