import { asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, grupos, repositorios, temas, turmas, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type AlunoDaTurma = {
  alunoId: string
  nome: string
  grupoId: string | null
  copiloto: boolean
}

/**
 * Os alunos de uma turma, com nome, em ordem de grupo e posição.
 *
 * Existe para a agregação do D15, que é por aluno e precisa da turma inteira —
 * `lancamentoDoDia` traz alunos, mas amarrados a um obstáculo, e a agregação
 * não é de um dia só. A ordem por grupo mantém quem trabalha junto junto na
 * lista, e o `copiloto` vem porque a nota dele tem outra origem (Doc 6 §9.1).
 */
export async function alunosDaTurma(db: Db, turmaId: string): Promise<AlunoDaTurma[]> {
  return db
    .select({
      alunoId: alunos.id,
      nome: usuarios.nome,
      grupoId: alunos.grupoId,
      copiloto: alunos.copiloto,
    })
    .from(alunos)
    .innerJoin(usuarios, eq(usuarios.id, alunos.usuarioId))
    .where(eq(alunos.turmaId, turmaId))
    .orderBy(asc(alunos.grupoId), asc(alunos.posicaoNoGrupo))
}

export type DadosDoGrupo = {
  grupoId: string
  turmaId: string
  cursoId: string
  tema: string | null
  integrantes: readonly { alunoId: string; nome: string; repositorio: string | null }[]
}

/**
 * Os dados de um grupo, para a ficha que o instrutor abre.
 *
 * Existe porque nenhuma consulta reunia o grupo com quem o forma e a que curso
 * ele pertence: `filaDoInstrutor` montava os nomes inline, e `identidadesDeGrupos`
 * (da crítica) traz tema e repositório mas não a turma nem o curso — e a ficha
 * precisa do `cursoId` para o banco de perguntas da defesa.
 *
 * O repositório vem junto de cada integrante porque ele é individual mesmo
 * dentro do grupo (Doc 5 §6), e a ficha é onde o instrutor confere quem publicou.
 *
 * Devolve nulo para grupo inexistente — a tela traduz em `notFound`.
 */
export async function dadosDoGrupo(db: Db, grupoId: string): Promise<DadosDoGrupo | null> {
  const [grupo] = await db
    .select({
      grupoId: grupos.id,
      turmaId: grupos.turmaId,
      cursoId: turmas.cursoId,
      tema: temas.nome,
    })
    .from(grupos)
    .innerJoin(turmas, eq(turmas.id, grupos.turmaId))
    .leftJoin(temas, eq(temas.id, grupos.temaId))
    .where(eq(grupos.id, grupoId))
    .limit(1)

  if (!grupo) return null

  const integrantes = await db
    .select({
      alunoId: alunos.id,
      nome: usuarios.nome,
      posicao: alunos.posicaoNoGrupo,
      repositorio: repositorios.url,
    })
    .from(alunos)
    .innerJoin(usuarios, eq(usuarios.id, alunos.usuarioId))
    .leftJoin(repositorios, eq(repositorios.alunoId, alunos.id))
    .where(eq(alunos.grupoId, grupoId))
    .orderBy(asc(alunos.posicaoNoGrupo))

  return {
    grupoId: grupo.grupoId,
    turmaId: grupo.turmaId,
    cursoId: grupo.cursoId,
    tema: grupo.tema ?? null,
    integrantes: integrantes.map(({ alunoId, nome, repositorio }) => ({
      alunoId,
      nome,
      repositorio: repositorio ?? null,
    })),
  }
}
