import { and, asc, eq, isNull, max } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeAcesso, type Ator } from '@/domain/autorizacao'
import {
  agrega,
  proporcaoDoEixo,
  type ApuracaoDeEixo,
  type ItemPontuado,
  type NotaAgregada,
} from '@/domain/rubrica'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import {
  alunos,
  avaliacoesDaDefesa,
  avaliacoesDeMudanca,
  avaliacoesDeObstaculo,
  eixos,
  incrementos,
  niveisDeAvaliacao,
  obstaculos,
  perguntasDaDefesa,
  perguntasUsadasNaDefesa,
  registrosDeDefesa,
  registrosDiarios,
  turmas,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra da agregação, distinto de falha de banco. */
export class AgregacaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'AgregacaoInvalida'
  }
}

/** O maior nível da escala do curso. É por ele que cada eixo normaliza. */
async function tetoDaEscala(db: Db, cursoId: string): Promise<number> {
  const [linha] = await db
    .select({ maximo: max(niveisDeAvaliacao.valor) })
    .from(niveisDeAvaliacao)
    .where(eq(niveisDeAvaliacao.cursoId, cursoId))

  if (linha?.maximo == null) {
    throw new AgregacaoInvalida('o curso não tem escala de avaliação cadastrada')
  }
  return linha.maximo
}

async function contextoDoAluno(db: Db, alunoId: string) {
  const [linha] = await db
    .select({
      grupoId: alunos.grupoId,
      copiloto: alunos.copiloto,
      turmaId: alunos.turmaId,
      cursoId: turmas.cursoId,
      agregacaoFinalizadaEm: turmas.agregacaoFinalizadaEm,
    })
    .from(alunos)
    .innerJoin(turmas, eq(turmas.id, alunos.turmaId))
    .where(eq(alunos.id, alunoId))
    .limit(1)

  if (!linha) throw new AgregacaoInvalida('aluno não encontrado')
  return linha
}

/** As notas de obstáculo de um aluno, com o peso de cada obstáculo. */
async function itensDoModelo(db: Db, alunoId: string): Promise<ItemPontuado[]> {
  return db
    .select({ valor: niveisDeAvaliacao.valor, peso: obstaculos.peso })
    .from(avaliacoesDeObstaculo)
    .innerJoin(registrosDiarios, eq(registrosDiarios.id, avaliacoesDeObstaculo.registroDiarioId))
    .innerJoin(obstaculos, eq(obstaculos.id, avaliacoesDeObstaculo.obstaculoId))
    .innerJoin(niveisDeAvaliacao, eq(niveisDeAvaliacao.id, avaliacoesDeObstaculo.nivelId))
    .where(eq(registrosDiarios.alunoId, alunoId))
}

/** As notas das mudanças do incremento de um grupo. Todas pesam igual. */
async function itensDoIncremento(db: Db, grupoId: string): Promise<ItemPontuado[]> {
  const linhas = await db
    .select({ valor: niveisDeAvaliacao.valor })
    .from(avaliacoesDeMudanca)
    .innerJoin(incrementos, eq(incrementos.id, avaliacoesDeMudanca.incrementoId))
    .innerJoin(niveisDeAvaliacao, eq(niveisDeAvaliacao.id, avaliacoesDeMudanca.nivelId))
    .where(eq(incrementos.grupoId, grupoId))

  // Peso 1 para todas: o Doc 6 §4.5 diz "média de M1 e M2", sem ponderar. Pesar
  // aqui seria inventar um número que nenhum documento escreveu.
  return linhas.map((l) => ({ valor: l.valor, peso: 1 }))
}

/** O que a defesa registrou para cada eixo, do grupo e do aluno. */
async function notasDaDefesa(
  db: Db,
  grupoId: string | null,
  alunoId: string,
): Promise<Map<string, number>> {
  if (!grupoId) return new Map()

  const linhas = await db
    .select({
      eixoId: avaliacoesDaDefesa.eixoId,
      alunoId: avaliacoesDaDefesa.alunoId,
      valor: niveisDeAvaliacao.valor,
    })
    .from(avaliacoesDaDefesa)
    .innerJoin(registrosDeDefesa, eq(registrosDeDefesa.id, avaliacoesDaDefesa.registroDeDefesaId))
    .innerJoin(niveisDeAvaliacao, eq(niveisDeAvaliacao.id, avaliacoesDaDefesa.nivelId))
    .where(eq(registrosDeDefesa.grupoId, grupoId))

  return new Map(
    linhas
      .filter((l) => l.alunoId === null || l.alunoId === alunoId)
      .map((l) => [l.eixoId, l.valor]),
  )
}

/**
 * A nota agregada de um aluno.
 *
 * Cada eixo apura sobre a própria unidade (Doc 6 §1.1): o eixo de aluno lê o
 * que é dele, o eixo de grupo lê o que é do grupo. É a declaração que impede um
 * aluno ausente de herdar a nota do parceiro, e impede um instrumento entregue
 * em conjunto de ser partido em dois.
 *
 * **O aluno em estado de copiloto tem o eixo do modelo vindo só da defesa
 * oral** (Doc 6 §9.1). Ele não tem repositório próprio, e as notas de obstáculo
 * que existirem são ignoradas — não porque valham zero, mas porque a origem da
 * nota dele é outra. E não há teto: um copiloto que responde bem à defesa chega
 * ao mesmo máximo que qualquer outro, porque punir a ausência de repositório
 * puniria a falta, não o aprendizado, e a falta já foi tratada.
 */
export async function notaDoAluno(db: Db, alunoId: string): Promise<NotaAgregada> {
  const contexto = await contextoDoAluno(db, alunoId)
  const teto = await tetoDaEscala(db, contexto.cursoId)

  const declarados = await db
    .select()
    .from(eixos)
    .where(eq(eixos.cursoId, contexto.cursoId))
    .orderBy(asc(eixos.ordem))

  if (declarados.length === 0) {
    throw new AgregacaoInvalida('o curso não tem eixos de rubrica cadastrados')
  }

  const daDefesa = await notasDaDefesa(db, contexto.grupoId, alunoId)

  const apuracoes: ApuracaoDeEixo[] = []
  for (const eixo of declarados) {
    const notaDaDefesa = daDefesa.get(eixo.id) ?? null
    const proporcaoDaDefesa = notaDaDefesa === null ? null : notaDaDefesa / teto

    const itens = await itensDoEixo(db, eixo, contexto, alunoId)

    // Copiloto: a defesa não ajusta o eixo do modelo, ela É o eixo do modelo.
    const doCopiloto =
      contexto.copiloto && eixo.fonte === 'avaliacao_de_obstaculo' ? proporcaoDaDefesa : null

    apuracoes.push({
      eixoId: eixo.id,
      nome: eixo.nome,
      peso: eixo.peso,
      unidade: eixo.unidade,
      proporcao: doCopiloto ?? proporcaoDoEixo(itens, teto),
      itens: contexto.copiloto && eixo.fonte === 'avaliacao_de_obstaculo' ? 0 : itens.length,
      proporcaoDaDefesa,
    })
  }

  return agrega(apuracoes)
}

async function itensDoEixo(
  db: Db,
  eixo: typeof eixos.$inferSelect,
  contexto: { grupoId: string | null; copiloto: boolean },
  alunoId: string,
): Promise<ItemPontuado[]> {
  if (eixo.fonte === 'avaliacao_de_obstaculo') {
    // O eixo declara a unidade, mas a fonte já é por aluno: a avaliação de
    // obstáculo pendura no registro diário, que pendura no aluno.
    return contexto.copiloto ? [] : itensDoModelo(db, alunoId)
  }

  if (!contexto.grupoId) return []
  return itensDoIncremento(db, contexto.grupoId)
}

/**
 * A nota agregada, respeitando quem pode ver.
 *
 * "Aluno não vê nota antes da agregação" (Doc 7 §3). O fato é o fechamento da
 * turma, e a checagem passa pela matriz pura — não por um `if` local que a
 * próxima tela esqueceria de repetir.
 */
export async function notaVisivel(
  db: Db,
  alunoId: string,
  ator: Ator,
): Promise<NotaAgregada | null> {
  const contexto = await contextoDoAluno(db, alunoId)

  exigeAcesso(ator, {
    tipo: 'nota',
    agregacaoFinalizada: contexto.agregacaoFinalizadaEm !== null,
  })

  return notaDoAluno(db, alunoId)
}

/** Fecha a agregação de uma turma. A partir daqui o aluno vê a própria nota. */
export async function finalizaAgregacao(
  db: Db,
  turmaId: string,
  instrutorId: string,
): Promise<{ finalizadaEm: Date }> {
  await exigeInstrutor(db, instrutorId)

  const [fechada] = await db
    .update(turmas)
    .set({ agregacaoFinalizadaEm: new Date() })
    .where(and(eq(turmas.id, turmaId), isNull(turmas.agregacaoFinalizadaEm)))
    .returning({ finalizadaEm: turmas.agregacaoFinalizadaEm })

  if (!fechada?.finalizadaEm) {
    throw new AgregacaoInvalida('turma não encontrada, ou agregação já finalizada')
  }
  return { finalizadaEm: fechada.finalizadaEm }
}

export type DefesaRegistrada = {
  /** As perguntas do banco usadas, na ordem em que foram feitas. */
  perguntasUsadas: readonly string[]
  /** Nota por eixo. `alunoId` só nos eixos que apuram por aluno. */
  notas: readonly { eixoId: string; alunoId: string | null; nivelId: string }[]
}

/**
 * Registra a defesa oral de um grupo (Doc 6 §6 · `D6-DEFESA`).
 *
 * Guardar QUAIS perguntas foram usadas é o que torna a defesa auditável. São
 * duas por grupo, escolhidas na hora sobre aquele código — sem o registro,
 * ninguém consegue depois explicar por que a nota de um grupo subiu e a de
 * outro não.
 *
 * Numa transação: defesa com perguntas gravadas e notas pela metade produziria
 * uma agregação que muda sozinha na próxima leitura.
 */
export async function registraDefesa(
  db: Db,
  grupoId: string,
  defesa: DefesaRegistrada,
  instrutorId: string,
): Promise<{ id: string }> {
  await exigeInstrutor(db, instrutorId)

  if (defesa.perguntasUsadas.length === 0) {
    throw new AgregacaoInvalida('a defesa exige registrar quais perguntas foram usadas')
  }

  return db.transaction(async (tx) => {
    const [registro] = await tx
      .insert(registrosDeDefesa)
      .values({ grupoId, registradoPorId: instrutorId })
      .returning({ id: registrosDeDefesa.id })

    if (!registro) throw new AgregacaoInvalida('não foi possível registrar a defesa')

    await tx.insert(perguntasUsadasNaDefesa).values(
      defesa.perguntasUsadas.map((perguntaId, i) => ({
        registroDeDefesaId: registro.id,
        perguntaId,
        ordem: i + 1,
      })),
    )

    if (defesa.notas.length > 0) {
      await tx
        .insert(avaliacoesDaDefesa)
        .values(defesa.notas.map((n) => ({ registroDeDefesaId: registro.id, ...n })))
    }

    return registro
  })
}

/** O banco de perguntas de um curso, na ordem cadastrada. */
export async function bancoDePerguntas(
  db: Db,
  cursoId: string,
): Promise<{ id: string; ordem: number; enunciado: string }[]> {
  return db
    .select({
      id: perguntasDaDefesa.id,
      ordem: perguntasDaDefesa.ordem,
      enunciado: perguntasDaDefesa.enunciado,
    })
    .from(perguntasDaDefesa)
    .where(eq(perguntasDaDefesa.cursoId, cursoId))
    .orderBy(asc(perguntasDaDefesa.ordem))
}

/** O que foi perguntado numa defesa, para o instrutor conferir depois. */
export async function perguntasDaDefesaDoGrupo(db: Db, grupoId: string): Promise<string[]> {
  return db
    .select({ enunciado: perguntasDaDefesa.enunciado })
    .from(perguntasUsadasNaDefesa)
    .innerJoin(
      registrosDeDefesa,
      eq(registrosDeDefesa.id, perguntasUsadasNaDefesa.registroDeDefesaId),
    )
    .innerJoin(perguntasDaDefesa, eq(perguntasDaDefesa.id, perguntasUsadasNaDefesa.perguntaId))
    .where(eq(registrosDeDefesa.grupoId, grupoId))
    .orderBy(asc(perguntasUsadasNaDefesa.ordem))
    .then((linhas) => linhas.map((l) => l.enunciado))
}
