'use server'

import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { alocaTema } from '@/db/alocacao'
import { cursoDaTurma } from '@/db/curso'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { formularioDoCurso } from '@/db/formulario'
import { submeteSePassar, type ResultadoDoPreFiltro } from '@/db/pre-filtro'
import { abreRascunho, gravaLinhaDeTraducao, gravaResposta } from '@/db/resposta-de-escopo'
import { auth } from '@/lib/auth'

/**
 * Ações do formulário de escopo.
 *
 * **Nada aqui aceita identificador de dono vindo do cliente.** Nem `grupoId`,
 * nem `respostaDeEscopoId`: os dois são derivados da sessão, toda vez. O
 * formulário de escopo é o documento contra o qual o grupo é avaliado o curso
 * inteiro (Doc 2 §4.1), e um `grupoId` de parâmetro deixaria qualquer pessoa
 * logada escrever o contrato de qualquer outro grupo — server action é
 * endpoint, e quem souber o identificador dela a chama direto (ADR 0001 §3).
 *
 * O que o cliente manda é só o conteúdo: qual pergunta, qual papel, que texto.
 */

type Contexto = {
  grupoId: string
  turmaId: string
  cursoId: string
  formularioId: string
  respostaDeEscopoId: string
}

/**
 * O escopo do grupo de quem está na sessão, criando o rascunho se preciso.
 *
 * O rascunho nasce aqui e não na página: página é leitura, e leitura que grava
 * vira linha fantasma no primeiro prefetch do navegador. `abreRascunho` é
 * idempotente de propósito — duas pessoas do mesmo grupo escrevendo ao mesmo
 * tempo é o caso normal, não a exceção.
 */
async function contextoDaSessao(): Promise<Contexto> {
  const sessao = await auth()
  if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)
  if (!matricula) throw new Error('Você ainda não está numa turma.')
  if (!matricula.grupoId) throw new Error('O formulário é do grupo, e você ainda não tem grupo.')

  const curso = await cursoDaTurma(banco, matricula.turmaId)
  if (!curso) throw new Error('Esta turma não está ligada a um curso.')

  const formulario = await formularioDoCurso(banco, curso.id)
  if (!formulario) throw new Error('O instrutor ainda não cadastrou o formulário deste curso.')

  const escopo = await abreRascunho(banco, matricula.grupoId, formulario.id)

  return {
    grupoId: matricula.grupoId,
    turmaId: matricula.turmaId,
    cursoId: curso.id,
    formularioId: formulario.id,
    respostaDeEscopoId: escopo.id,
  }
}

export async function gravaRespostaAction(dados: { perguntaId: string; texto: string }) {
  const { respostaDeEscopoId } = await contextoDaSessao()
  await gravaResposta(db(), respostaDeEscopoId, dados.perguntaId, dados.texto)
  revalidatePath('/escopo')
}

export async function gravaTraducaoAction(dados: {
  papelId: string
  nomeNoNegocio: string
  nomeNoCodigo: string
}) {
  const { respostaDeEscopoId } = await contextoDaSessao()
  await gravaLinhaDeTraducao(db(), respostaDeEscopoId, dados.papelId, {
    nomeNoNegocio: dados.nomeNoNegocio,
    nomeNoCodigo: dados.nomeNoCodigo,
  })
  revalidatePath('/escopo')
}

export async function escolheTemaAction(dados: { temaId: string }) {
  const sessao = await auth()
  if (!sessao?.usuarioId) throw new Error('Sessão expirada. Entre de novo.')

  const matricula = await matriculaDoUsuario(db(), sessao.usuarioId)
  if (!matricula?.grupoId) throw new Error('O tema é do grupo, e você ainda não tem grupo.')

  // A garantia de "um tema por grupo por turma" é do índice único do banco, não
  // desta chamada. A alocação acontece por negociação em sala, ou seja, todos ao
  // mesmo tempo — verificar antes e gravar depois perderia a corrida.
  await alocaTema(db(), matricula.grupoId, dados.temaId)
  revalidatePath('/escopo')
}

/**
 * Entrega o formulário, **se** ele passar no pré-filtro.
 *
 * É `submeteSePassar` e nunca `submete`. As duas gravam a mesma submissão, e a
 * diferença é o portão: sem o pré-filtro o formulário chega ao instrutor com
 * campo vazio, e o bloco do D3 é gasto apontando o que uma máquina apontaria
 * (Doc 2 §4.6).
 *
 * Devolve as reprovações em vez de lançar: elas não são erro, são o retorno
 * esperado da tentativa, e cada uma volta para o lado da pergunta que a causou.
 */
export async function entregaEscopoAction(): Promise<ResultadoDoPreFiltro> {
  const { respostaDeEscopoId } = await contextoDaSessao()
  const resultado = await submeteSePassar(db(), respostaDeEscopoId)
  revalidatePath('/escopo')
  return resultado
}
