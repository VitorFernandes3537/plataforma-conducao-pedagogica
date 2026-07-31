import { and, asc, eq, exists, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import { bancosDeTemas, grupos, temas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type TemaListado = {
  id: string
  nome: string
  dificuldade: string
  trilha: 'padrao' | 'desafio'
  briefing: string | null
  disponivel: boolean
}

/**
 * Todos os temas do banco, com disponibilidade calculada para uma turma.
 *
 * Duas decisões que o critério de aceite exige:
 *
 * 1. Nada é filtrado. Tema indisponível continua na lista — o aluno precisa
 *    ver que ele existe e já foi tomado, senão a escolha parece menor do que é.
 * 2. Disponibilidade é POR TURMA (Doc 7 §2.4: "um `Tema` pertence a no máximo
 *    um `Grupo` por `Turma`"). O mesmo banco serve várias turmas, e um tema
 *    tomado numa não é tomado na outra.
 */
export async function temasComDisponibilidade(
  db: Db,
  bancoDeTemasId: string,
  turmaId: string,
): Promise<TemaListado[]> {
  const tomadoNaTurma = exists(
    db
      .select({ um: grupos.id })
      .from(grupos)
      .where(and(eq(grupos.turmaId, turmaId), eq(grupos.temaId, temas.id))),
  )

  return db
    .select({
      id: temas.id,
      nome: temas.nome,
      dificuldade: temas.dificuldade,
      trilha: temas.trilha,
      briefing: temas.briefing,
      disponivel: sql<boolean>`not ${tomadoNaTurma}`,
    })
    .from(temas)
    .where(eq(temas.bancoDeTemasId, bancoDeTemasId))
    .orderBy(asc(temas.criadoEm), asc(temas.nome))
}

/**
 * Os temas que uma turma pode escolher, com disponibilidade.
 *
 * Existe porque `temasComDisponibilidade` pede um `bancoDeTemasId` que **nada
 * deriva** de turma nem de curso, e a tela do aluno só conhece a matrícula.
 * Fixar o id do banco na tela seria hardcode do semeador.
 *
 * A escolha aqui é passar por `Curso`, e ela merece registro: `bancosDeTemas`
 * não tem unicidade por curso, então um curso pode ter mais de um banco. Esta
 * consulta devolve os temas de **todos** eles, e não escolhe um.
 *
 * O motivo é que escolher seria inventar regra. Nenhum documento-dono diz que o
 * curso tem um banco só, nem qual deles vale para o aluno. O que o Doc 2 §3
 * descreve é uma escolha de tema, não de banco — o banco é o contêiner do
 * instrutor (Doc 7 §2.1). Se um dia o curso precisar de mais de um banco com
 * significados diferentes, quem decide qual vale é o instrutor, e isso vira
 * coluna ou tela; não se resolve por sorte de `limit 1`.
 *
 * Escopo de reserva não vaza por aqui: a reserva é o `EscopoPreAprovado`, não o
 * tema. O tema de um escopo de reserva já era um tema comum da lista.
 */
export async function temasDoCurso(
  db: Db,
  cursoId: string,
  turmaId: string,
): Promise<TemaListado[]> {
  const tomadoNaTurma = exists(
    db
      .select({ um: grupos.id })
      .from(grupos)
      .where(and(eq(grupos.turmaId, turmaId), eq(grupos.temaId, temas.id))),
  )

  return db
    .select({
      id: temas.id,
      nome: temas.nome,
      dificuldade: temas.dificuldade,
      trilha: temas.trilha,
      briefing: temas.briefing,
      disponivel: sql<boolean>`not ${tomadoNaTurma}`,
    })
    .from(temas)
    .innerJoin(bancosDeTemas, eq(bancosDeTemas.id, temas.bancoDeTemasId))
    .where(eq(bancosDeTemas.cursoId, cursoId))
    .orderBy(asc(temas.criadoEm), asc(temas.nome))
}
