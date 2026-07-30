import { and, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeAcesso, type Ator } from '@/domain/autorizacao'

import * as schema from './schema'
import { alunos, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** O usuário existe mas não está matriculado onde a ação acontece. */
export class AtorDesconhecido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'AtorDesconhecido'
  }
}

/**
 * Traduz um usuário do banco no `Ator` puro da matriz de permissões.
 *
 * Existe para que `src/domain/autorizacao.ts` continue sem saber que banco
 * existe (ADR 0001 §7) e para que nenhum módulo monte o ator de novo por conta
 * própria — um `Ator` de aluno com `grupoId` errado passaria na matriz e
 * mostraria a avaliação do grupo vizinho.
 *
 * `turmaId` é obrigatório para aluno porque `grupoId` só existe dentro de uma
 * turma: o mesmo GitHub pode ser aluno numa turma e instrutor em outro curso
 * (ADR 0002).
 */
export async function atorDoUsuario(db: Db, usuarioId: string, turmaId?: string): Promise<Ator> {
  const [usuario] = await db
    .select({ id: usuarios.id, papel: usuarios.papel })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!usuario) throw new AtorDesconhecido('usuário não encontrado')

  if (usuario.papel === 'instrutor') {
    return { papel: 'instrutor', usuarioId: usuario.id }
  }

  if (turmaId === undefined) {
    // Sem turma, `grupoId` seria um palpite. Nulo aqui abriria acesso a nada,
    // mas esconderia o defeito de quem esqueceu o parâmetro.
    throw new AtorDesconhecido('ator de aluno exige a turma em que a ação acontece')
  }

  const [matricula] = await db
    .select({ grupoId: alunos.grupoId })
    .from(alunos)
    .where(and(eq(alunos.usuarioId, usuarioId), eq(alunos.turmaId, turmaId)))
    .limit(1)

  if (!matricula) throw new AtorDesconhecido('usuário não está matriculado nesta turma')

  return { papel: 'aluno', usuarioId: usuario.id, grupoId: matricula.grupoId }
}

/**
 * Confere que quem escreve é o próprio aluno, ou o instrutor.
 *
 * Doc 7 §3 dá ao aluno "registrar log, contrato diário, push". A matriz pura já
 * sabe disso pelo recurso `producao-propria`; o que falta é descobrir de quem é
 * a produção, e isso exige o banco.
 *
 * Mora aqui, e não em cada instrumento, porque a regra é a mesma para log, push
 * e contrato diário — e três cópias dela divergiriam na primeira exceção.
 */
export async function exigeProducaoPropria(
  db: Db,
  autorId: string,
  alunoId: string,
): Promise<void> {
  const [dono] = await db
    .select({ usuarioId: alunos.usuarioId, turmaId: alunos.turmaId })
    .from(alunos)
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!dono) throw new AtorDesconhecido('aluno não encontrado')

  const ator = await atorDoUsuario(db, autorId, dono.turmaId)
  exigeAcesso(ator, { tipo: 'producao-propria', usuarioId: dono.usuarioId })
}
