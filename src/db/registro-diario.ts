import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import {
  alunos,
  avaliacoesDeObstaculo,
  confirmacoesDePush,
  logsDeObstaculo,
  niveisDeAvaliacao,
  obstaculos,
  registrosDiarios,
  turmas,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do registro diário, distinto de falha de banco. */
export class RegistroInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'RegistroInvalido'
  }
}

export type Nivel = {
  id: string
  valor: number
  descritor: string
  contaComoSuperacao: boolean
}

/**
 * A escala de avaliação de um curso, do menor valor ao maior (`D6-ESCALA`).
 *
 * A tela de lançamento mostra os descritores, não inteiros anônimos: o que
 * separa um nível do outro é a frase, e é ela que faz o instrutor lançar a
 * mesma nota que lançaria amanhã.
 */
export async function escalaDoCurso(db: Db, cursoId: string): Promise<Nivel[]> {
  return db
    .select({
      id: niveisDeAvaliacao.id,
      valor: niveisDeAvaliacao.valor,
      descritor: niveisDeAvaliacao.descritor,
      contaComoSuperacao: niveisDeAvaliacao.contaComoSuperacao,
    })
    .from(niveisDeAvaliacao)
    .where(eq(niveisDeAvaliacao.cursoId, cursoId))
    .orderBy(asc(niveisDeAvaliacao.valor))
}

/** O curso a que um aluno pertence, via turma. */
async function cursoDoAluno(db: Db, alunoId: string): Promise<string> {
  const [linha] = await db
    .select({ cursoId: turmas.cursoId })
    .from(alunos)
    .innerJoin(turmas, eq(turmas.id, alunos.turmaId))
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!linha) throw new RegistroInvalido('aluno não encontrado')
  return linha.cursoId
}

/**
 * Resolve o número que o instrutor lançou no nível configurado do curso.
 *
 * É aqui que "a escala só aceita os níveis deste curso" vira frase legível. A
 * garantia é da chave estrangeira — um `nivelId` inventado não entra —, mas o
 * instrutor não pode receber violação de constraint quando erra o valor.
 */
async function nivelDoCurso(db: Db, cursoId: string, valor: number): Promise<Nivel> {
  const [nivel] = await db
    .select({
      id: niveisDeAvaliacao.id,
      valor: niveisDeAvaliacao.valor,
      descritor: niveisDeAvaliacao.descritor,
      contaComoSuperacao: niveisDeAvaliacao.contaComoSuperacao,
    })
    .from(niveisDeAvaliacao)
    .where(and(eq(niveisDeAvaliacao.cursoId, cursoId), eq(niveisDeAvaliacao.valor, valor)))
    .limit(1)

  if (!nivel) {
    const escala = await escalaDoCurso(db, cursoId)
    const aceitos = escala.map((n) => n.valor).join(', ')
    throw new RegistroInvalido(`nível ${valor} não existe na escala deste curso; aceitos: ${aceitos}`)
  }

  return nivel
}

/**
 * Abre — ou reaproveita — o registro diário de um aluno num dia.
 *
 * Idempotente, e é a primitiva de que todo instrumento do dia depende. Sem ela,
 * o instrutor não conseguiria lançar nota num dia em que o aluno ainda não
 * escreveu nada, porque não haveria onde pendurar.
 *
 * `on conflict do nothing` seguido de leitura, e não leitura seguida de insert:
 * o aluno confirmando o push e o instrutor lançando a nota acontecem no mesmo
 * minuto do fechamento, e a corrida entre os dois é o caso normal.
 */
export async function garanteRegistroDiario(
  db: Db,
  alunoId: string,
  diaId: string,
): Promise<{ id: string }> {
  const [criado] = await db
    .insert(registrosDiarios)
    .values({ alunoId, diaId })
    .onConflictDoNothing({ target: [registrosDiarios.alunoId, registrosDiarios.diaId] })
    .returning({ id: registrosDiarios.id })

  if (criado) return criado

  const [existente] = await db
    .select({ id: registrosDiarios.id })
    .from(registrosDiarios)
    .where(and(eq(registrosDiarios.alunoId, alunoId), eq(registrosDiarios.diaId, diaId)))
    .limit(1)

  if (!existente) throw new RegistroInvalido('não foi possível abrir o registro do dia')
  return existente
}

/**
 * Serializa as escritas de avaliação de um dia dentro de uma turma.
 *
 * O lançamento por grupo escreve várias linhas, e a divergência individual
 * reescreve uma delas. Sem trava, as duas ações concorrentes deixariam o grupo
 * rasgado — um integrante com o valor novo, outro com o antigo, sem ninguém ter
 * pedido isso. O molde é o mesmo da realocação de tema.
 */
async function travaOLancamento(tx: Db, diaId: string, turmaId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${diaId}), hashtext(${turmaId}))`)
}

async function turmaDoAluno(db: Db, alunoId: string): Promise<string> {
  const [linha] = await db
    .select({ turmaId: alunos.turmaId })
    .from(alunos)
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!linha) throw new RegistroInvalido('aluno não encontrado')
  return linha.turmaId
}

type Lancamento = {
  diaId: string
  obstaculoId: string
  valor: number
  instrutorId: string
}

async function gravaAvaliacao(
  tx: Db,
  alunoId: string,
  { diaId, obstaculoId }: Lancamento,
  nivelId: string,
  instrutorId: string,
): Promise<void> {
  const registro = await garanteRegistroDiario(tx, alunoId, diaId)

  await tx
    .insert(avaliacoesDeObstaculo)
    .values({
      registroDiarioId: registro.id,
      obstaculoId,
      nivelId,
      lancadoPorId: instrutorId,
    })
    .onConflictDoUpdate({
      target: [avaliacoesDeObstaculo.registroDiarioId, avaliacoesDeObstaculo.obstaculoId],
      set: { nivelId, lancadoPorId: instrutorId, atualizadoEm: new Date() },
    })
}

/**
 * Lança a avaliação de um obstáculo para um aluno.
 *
 * É o caminho da divergência: "o instrutor diverge apenas quando observa
 * diferença real entre os repositórios" (Doc 6 §1.1). Reescrever o valor de um
 * integrante depois do lançamento em lote é a operação inteira — não existe
 * marca de "divergente", porque divergir é apenas ter valor diferente do
 * parceiro.
 */
export async function lancaAvaliacaoDoAluno(
  db: Db,
  alunoId: string,
  lancamento: Lancamento,
): Promise<{ nivel: Nivel }> {
  await exigeInstrutor(db, lancamento.instrutorId)

  const cursoId = await cursoDoAluno(db, alunoId)
  const nivel = await nivelDoCurso(db, cursoId, lancamento.valor)
  const turmaId = await turmaDoAluno(db, alunoId)

  await db.transaction(async (tx) => {
    await travaOLancamento(tx, lancamento.diaId, turmaId)
    await gravaAvaliacao(tx, alunoId, lancamento, nivel.id, lancamento.instrutorId)
  })

  return { nivel }
}

/**
 * Apaga a avaliação de um obstáculo num dia.
 *
 * "Sem avaliação" e "nível 0" são estados diferentes, e os dois têm de ser
 * alcançáveis: o Doc 6 §3.2 grava zero explícito na verificação ao vivo, e zero
 * é uma afirmação sobre o aluno. Corrigir um lançamento errado não pode obrigar
 * o instrutor a afirmar isso.
 */
export async function removeAvaliacao(
  db: Db,
  alunoId: string,
  diaId: string,
  obstaculoId: string,
  instrutorId: string,
): Promise<{ removidas: number }> {
  await exigeInstrutor(db, instrutorId)

  const removidas = await db
    .delete(avaliacoesDeObstaculo)
    .where(
      and(
        eq(avaliacoesDeObstaculo.obstaculoId, obstaculoId),
        inArray(
          avaliacoesDeObstaculo.registroDiarioId,
          db
            .select({ id: registrosDiarios.id })
            .from(registrosDiarios)
            .where(and(eq(registrosDiarios.alunoId, alunoId), eq(registrosDiarios.diaId, diaId))),
        ),
      ),
    )
    .returning({ id: avaliacoesDeObstaculo.id })

  return { removidas: removidas.length }
}

export type RegistroDoDia = {
  id: string
  alunoId: string
  diaId: string
  avaliacoes: readonly {
    obstaculoId: string
    pergunta: string
    valor: number
    descritor: string
    superado: boolean
    lancadoPorId: string
  }[]
  logs: readonly { obstaculoId: string; texto: string }[]
  pushConfirmado: boolean
}

/**
 * O que existe no dia de um aluno.
 *
 * `superado` sai de `contaComoSuperacao`, nunca de comparação com número: é a
 * definição do Doc 6 §2 lida de onde ela mora, e é a mesma coluna que o painel
 * de superação e o limiar de adiantamento vão ler.
 */
export async function registroDoDia(
  db: Db,
  alunoId: string,
  diaId: string,
): Promise<RegistroDoDia | null> {
  const [registro] = await db
    .select()
    .from(registrosDiarios)
    .where(and(eq(registrosDiarios.alunoId, alunoId), eq(registrosDiarios.diaId, diaId)))
    .limit(1)

  if (!registro) return null

  const avaliacoes = await db
    .select({
      obstaculoId: avaliacoesDeObstaculo.obstaculoId,
      pergunta: obstaculos.pergunta,
      valor: niveisDeAvaliacao.valor,
      descritor: niveisDeAvaliacao.descritor,
      superado: niveisDeAvaliacao.contaComoSuperacao,
      lancadoPorId: avaliacoesDeObstaculo.lancadoPorId,
    })
    .from(avaliacoesDeObstaculo)
    .innerJoin(obstaculos, eq(obstaculos.id, avaliacoesDeObstaculo.obstaculoId))
    .innerJoin(niveisDeAvaliacao, eq(niveisDeAvaliacao.id, avaliacoesDeObstaculo.nivelId))
    .where(eq(avaliacoesDeObstaculo.registroDiarioId, registro.id))
    .orderBy(asc(obstaculos.ordem))

  const logs = await db
    .select({ obstaculoId: logsDeObstaculo.obstaculoId, texto: logsDeObstaculo.texto })
    .from(logsDeObstaculo)
    .innerJoin(obstaculos, eq(obstaculos.id, logsDeObstaculo.obstaculoId))
    .where(eq(logsDeObstaculo.registroDiarioId, registro.id))
    .orderBy(asc(obstaculos.ordem))

  const push = await db
    .select({ id: confirmacoesDePush.id })
    .from(confirmacoesDePush)
    .where(eq(confirmacoesDePush.registroDiarioId, registro.id))
    .limit(1)

  return {
    id: registro.id,
    alunoId: registro.alunoId,
    diaId: registro.diaId,
    avaliacoes,
    logs,
    pushConfirmado: push.length > 0,
  }
}
