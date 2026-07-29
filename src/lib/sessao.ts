import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { alunos } from '@/db/schema'
import { AcessoNegado, type Ator, type Recurso, exigeAcesso } from '@/domain/autorizacao'

import { auth } from './auth'

/**
 * O ator da requisição atual, ou `null` se não houver sessão.
 *
 * A ADR 0001 §3 é explícita: o proxy não é solução de autorização. Toda
 * página e toda server action re-verifica com estas funções.
 */
export async function atorAtual(turmaId?: string): Promise<Ator | null> {
  const sessao = await auth()
  if (!sessao?.usuarioId) return null

  if (sessao.papel === 'instrutor') {
    return { papel: 'instrutor', usuarioId: sessao.usuarioId }
  }

  // O grupo é por turma: sem turma no contexto não há grupo a assumir, e
  // assumir o errado abriria avaliação de outro grupo.
  const grupoId = turmaId ? await grupoDoAluno(sessao.usuarioId, turmaId) : null
  return { papel: 'aluno', usuarioId: sessao.usuarioId, grupoId }
}

async function grupoDoAluno(usuarioId: string, turmaId: string): Promise<string | null> {
  const [matricula] = await db()
    .select({ grupoId: alunos.grupoId })
    .from(alunos)
    .where(and(eq(alunos.usuarioId, usuarioId), eq(alunos.turmaId, turmaId)))
    .limit(1)
  return matricula?.grupoId ?? null
}

/** Falha com 403 quando não há sessão ou quando o ator não pode ver o recurso. */
export async function exigeAcessoNaSessao(recurso: Recurso, turmaId?: string): Promise<Ator> {
  const ator = await atorAtual(turmaId)
  if (!ator) throw new AcessoNegado('sem sessão')
  exigeAcesso(ator, recurso)
  return ator
}
