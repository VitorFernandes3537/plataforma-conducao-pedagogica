import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, cursos, grupos, repositorios, turmas, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * Dados de desenvolvimento. Nada aqui é regra: são valores de exemplo de um
 * curso fictício, e é por isso que aparecem juntos e nomeados neste bloco em
 * vez de espalhados pelo código.
 */
export const EXEMPLO = {
  curso: { nome: 'Curso de exemplo', tamanhoMaximoDeGrupo: 2 },
  turma: { nome: 'Turma de exemplo' },
  instrutor: { githubUserId: 1000, githubLogin: 'instrutor-exemplo', nome: 'Instrutor' },
  // Um grupo com dois alunos e um grupo solo — o solo é caso válido pelo
  // Doc 2 §2.4.1, não exceção.
  grupos: [
    ['Ana', 'Bruno'],
    ['Carla'],
  ],
} as const

export async function semeia(db: Db) {
  const [curso] = await db.insert(cursos).values(EXEMPLO.curso).returning()
  if (!curso) throw new Error('seed: curso não foi criado')

  const [turma] = await db
    .insert(turmas)
    .values({ cursoId: curso.id, nome: EXEMPLO.turma.nome })
    .returning()
  if (!turma) throw new Error('seed: turma não foi criada')

  // Sem instrutor não há como abrir a área de instrutor em desenvolvimento.
  const [instrutor] = await db
    .insert(usuarios)
    .values({ ...EXEMPLO.instrutor, papel: 'instrutor' })
    .returning()
  if (!instrutor) throw new Error('seed: instrutor não foi criado')

  let proximoGithubId = 1

  for (const integrantes of EXEMPLO.grupos) {
    const [grupo] = await db.insert(grupos).values({ turmaId: turma.id }).returning()
    if (!grupo) throw new Error('seed: grupo não foi criado')

    for (const [indice, nome] of integrantes.entries()) {
      const [usuario] = await db
        .insert(usuarios)
        .values({
          githubUserId: proximoGithubId++,
          githubLogin: nome.toLowerCase(),
          nome,
          papel: 'aluno',
        })
        .returning()
      if (!usuario) throw new Error('seed: usuário não foi criado')

      const [aluno] = await db
        .insert(alunos)
        .values({
          turmaId: turma.id,
          usuarioId: usuario.id,
          grupoId: grupo.id,
          posicaoNoGrupo: indice + 1,
        })
        .returning()
      if (!aluno) throw new Error('seed: aluno não foi criado')

      // Repositório é individual mesmo dentro do grupo (Doc 5 §6).
      await db.insert(repositorios).values({
        alunoId: aluno.id,
        url: `https://github.com/${nome.toLowerCase()}/projeto-de-exemplo`,
      })
    }
  }

  return { cursoId: curso.id, turmaId: turma.id, instrutorId: instrutor.id }
}
