import { and, asc, eq, gt } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import { alunos, dias, marcos, turmas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do dia corrente, distinto de falha de banco. */
export class DiaInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'DiaInvalido'
  }
}

export type DiaCorrente = {
  turmaId: string
  cursoId: string
  diaId: string
  ordem: number
  /** O marco deste dia, quando há um. */
  marco: { nome: string; tipo: 'duro' | 'triagem' } | null
  /** Quantos dias o curso tem. Vem do dado, não de uma constante. */
  totalDeDias: number
}

/**
 * Em que dia a turma está.
 *
 * A plataforma não lê relógio de calendário. O dia corrente é um ponteiro que o
 * instrutor avança, e isso é a sincronia do Doc 4 §5.2 virando mecanismo: a
 * turma inteira anda junto, ou não anda.
 *
 * Devolve nulo antes de o curso começar — e nulo é resposta, não erro. A turma
 * existe, cadastrada, antes do primeiro dia.
 */
export async function diaCorrenteDaTurma(db: Db, turmaId: string): Promise<DiaCorrente | null> {
  const [linha] = await db
    .select({
      turmaId: turmas.id,
      cursoId: turmas.cursoId,
      diaId: dias.id,
      ordem: dias.ordem,
      marcoNome: marcos.nome,
      marcoTipo: marcos.tipo,
    })
    .from(turmas)
    .innerJoin(dias, eq(dias.id, turmas.diaCorrenteId))
    .leftJoin(marcos, eq(marcos.diaId, dias.id))
    .where(eq(turmas.id, turmaId))
    .limit(1)

  if (!linha) return null

  const doCurso = await db
    .select({ id: dias.id })
    .from(dias)
    .where(eq(dias.cursoId, linha.cursoId))

  return {
    turmaId: linha.turmaId,
    cursoId: linha.cursoId,
    diaId: linha.diaId,
    ordem: linha.ordem,
    marco:
      linha.marcoNome && linha.marcoTipo
        ? { nome: linha.marcoNome, tipo: linha.marcoTipo }
        : null,
    totalDeDias: doCurso.length,
  }
}

/**
 * Avança a turma para o próximo dia do curso.
 *
 * Sempre o PRÓXIMO, nunca um salto: pular dia deixaria o material, a avaliação
 * e o mural daquele dia sem ninguém, e a captura contínua depende de cada dia
 * acontecer (Doc 6 §0.3).
 *
 * Ato do instrutor, e é ele quem decide o momento. O painel de superação sinaliza
 * que o limiar foi atingido; "a plataforma sinaliza, quem decide é o instrutor"
 * (fora de escopo declarado da issue 14).
 *
 * Voltar não existe. Um dia que já aconteceu não desacontece, e desfazer o
 * ponteiro esconderia o registro do dia em vez de corrigi-lo.
 */
export async function avancaDia(
  db: Db,
  turmaId: string,
  instrutorId: string,
): Promise<DiaCorrente> {
  await exigeInstrutor(db, instrutorId)

  const [turma] = await db
    .select({ cursoId: turmas.cursoId, diaCorrenteId: turmas.diaCorrenteId })
    .from(turmas)
    .where(eq(turmas.id, turmaId))
    .limit(1)

  if (!turma) throw new DiaInvalido('turma não encontrada')

  const ordemAtual = turma.diaCorrenteId
    ? ((
        await db
          .select({ ordem: dias.ordem })
          .from(dias)
          .where(eq(dias.id, turma.diaCorrenteId))
          .limit(1)
      )[0]?.ordem ?? 0)
    : 0

  const [proximo] = await db
    .select({ id: dias.id })
    .from(dias)
    .where(and(eq(dias.cursoId, turma.cursoId), gt(dias.ordem, ordemAtual)))
    .orderBy(asc(dias.ordem))
    .limit(1)

  if (!proximo) {
    throw new DiaInvalido('a turma já está no último dia do curso')
  }

  await db.update(turmas).set({ diaCorrenteId: proximo.id }).where(eq(turmas.id, turmaId))

  const corrente = await diaCorrenteDaTurma(db, turmaId)
  if (!corrente) throw new DiaInvalido('não foi possível avançar o dia')
  return corrente
}

/**
 * A turma de um aluno, com o dia em que ela está.
 *
 * É a primeira consulta de toda tela do aluno: sem saber o dia, nenhuma delas
 * sabe o que mostrar nem o que esconder.
 */
export async function diaDoAluno(db: Db, usuarioId: string): Promise<DiaCorrente | null> {
  const [matricula] = await db
    .select({ turmaId: alunos.turmaId })
    .from(alunos)
    .where(eq(alunos.usuarioId, usuarioId))
    .limit(1)

  if (!matricula) return null
  return diaCorrenteDaTurma(db, matricula.turmaId)
}

/**
 * As turmas de um curso, com o dia de cada uma. É a entrada do instrutor.
 *
 * Devolve todas as turmas porque nenhuma tabela liga instrutor a turma, e a
 * matriz do Doc 7 §3 diz "instrutor — tudo". O que o `instrutorId` decide não é
 * *quais* turmas aparecem, é *se* aparecem.
 *
 * A checagem é aqui e lê o papel do banco, não da sessão. O token é JWT e carrega
 * o papel gravado no login (ADR 0001 §3): rebaixar alguém no banco não invalida o
 * token que ele já tem. Enquanto a checagem morar só na sessão, esse token
 * continua listando as turmas até expirar.
 */
export async function turmasDoInstrutor(
  db: Db,
  instrutorId: string,
): Promise<{ turmaId: string; nome: string; ordem: number | null; totalDeDias: number }[]> {
  await exigeInstrutor(db, instrutorId)

  const linhas = await db
    .select({ turmaId: turmas.id, nome: turmas.nome, cursoId: turmas.cursoId, ordem: dias.ordem })
    .from(turmas)
    .leftJoin(dias, eq(dias.id, turmas.diaCorrenteId))
    .orderBy(asc(turmas.nome))

  const totais = new Map<string, number>()
  for (const linha of linhas) {
    if (totais.has(linha.cursoId)) continue
    const doCurso = await db
      .select({ id: dias.id })
      .from(dias)
      .where(eq(dias.cursoId, linha.cursoId))
    totais.set(linha.cursoId, doCurso.length)
  }

  return linhas.map((l) => ({
    turmaId: l.turmaId,
    nome: l.nome,
    ordem: l.ordem,
    totalDeDias: totais.get(l.cursoId) ?? 0,
  }))
}
