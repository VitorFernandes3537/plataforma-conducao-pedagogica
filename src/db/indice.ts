import { asc, eq, isNotNull } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { alunos, grupos, repositorios, temas, turmas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type GrupoNoIndice = {
  grupoId: string
  tema: string
  /** As URLs públicas dos repositórios do grupo, na ordem dos integrantes. */
  repositorios: readonly string[]
}

/**
 * O índice público de uma turma (Doc 5 §6.2).
 *
 * O repositório não é só entrega — é o **produto público** do curso. O
 * enquadramento é declarado no primeiro dia, o link é compartilhado no último, e
 * o repositório permanece no ar depois. O índice é o que dá sentido a isso: uma
 * página que mostra o que a coorte construiu.
 *
 * **Não recebe ator, de propósito.** Esta é a única leitura da plataforma que
 * não pergunta quem está lendo — e, por isso mesmo, é a que precisa devolver o
 * mínimo. Um parâmetro de ator aqui convidaria a acrescentar campo "só para
 * quem está logado", e a página deixaria de ser a mesma para todo mundo.
 *
 * O que sai: o tema e as URLs. Nada de nome de pessoa. O documento diz
 * "domínios e repositórios da coorte", e o login do GitHub que aparece na URL já
 * é público por decisão do próprio aluno ao ter repositório público (Doc 5 §6) —
 * o nome civil não é, e não tem por que estar numa página aberta.
 *
 * O que NÃO sai, e o teste da issue afirma: nota, avaliação e incremento. Este
 * módulo não importa nenhuma dessas tabelas, e essa é a garantia — não há campo
 * a esquecer de omitir, porque o dado não é buscado.
 *
 * Grupo sem tema fica de fora: não teria o que mostrar, e uma linha vazia no
 * índice pareceria projeto abandonado em vez de projeto ainda sem tema.
 */
export async function indicePublicoDaTurma(db: Db, turmaId: string): Promise<GrupoNoIndice[]> {
  const linhas = await db
    .select({
      grupoId: grupos.id,
      tema: temas.nome,
      url: repositorios.url,
      posicao: alunos.posicaoNoGrupo,
    })
    .from(grupos)
    .innerJoin(temas, eq(temas.id, grupos.temaId))
    .leftJoin(alunos, eq(alunos.grupoId, grupos.id))
    .leftJoin(repositorios, eq(repositorios.alunoId, alunos.id))
    .where(eq(grupos.turmaId, turmaId))
    .orderBy(asc(temas.nome), asc(alunos.posicaoNoGrupo))

  const porGrupo = new Map<string, GrupoNoIndice>()
  for (const linha of linhas) {
    const atual = porGrupo.get(linha.grupoId) ?? {
      grupoId: linha.grupoId,
      tema: linha.tema,
      repositorios: [] as string[],
    }
    if (linha.url) (atual.repositorios as string[]).push(linha.url)
    porGrupo.set(linha.grupoId, atual)
  }

  return [...porGrupo.values()]
}

/** As turmas que já têm algum grupo com tema. É o que o índice consegue mostrar. */
export async function turmasComIndice(
  db: Db,
  cursoId: string,
): Promise<{ turmaId: string; nome: string }[]> {
  const linhas = await db
    .selectDistinct({ turmaId: turmas.id, nome: turmas.nome })
    .from(turmas)
    .innerJoin(grupos, eq(grupos.turmaId, turmas.id))
    .where(eq(turmas.cursoId, cursoId))
    .orderBy(asc(turmas.nome))

  const comTema = await db
    .selectDistinct({ turmaId: grupos.turmaId })
    .from(grupos)
    .where(isNotNull(grupos.temaId))

  const publicaveis = new Set(comTema.map((t) => t.turmaId))
  return linhas.filter((t) => publicaveis.has(t.turmaId))
}
