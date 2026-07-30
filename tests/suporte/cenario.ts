import { cursos } from '@/db/schema'

import type { BancoEfemero } from './banco-efemero'

type ValoresDeCurso = Partial<typeof cursos.$inferInsert>

/**
 * Cria um curso de teste com os obrigatórios preenchidos.
 *
 * Existe para que acrescentar coluna obrigatória ao curso não obrigue a
 * editar todos os arquivos de teste — o que foi exatamente o que aconteceu
 * quando `pergunta_condutora` entrou.
 *
 * Nenhum valor aqui é regra: é configuração de um curso fictício.
 */
export async function criaCurso(banco: BancoEfemero, valores: ValoresDeCurso = {}) {
  const [curso] = await banco.db
    .insert(cursos)
    .values({
      nome: 'Curso de teste',
      tamanhoMaximoDeGrupo: 2,
      perguntaCondutora: 'Pergunta condutora de teste?',
      ...valores,
    })
    .returning()

  if (!curso) throw new Error('cenário: curso não foi criado')
  return curso
}
