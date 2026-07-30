import { and, asc, eq, inArray, lt, or } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { chaveDoPar, sorteiaEmparelhamento } from '@/domain/sorteio'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import {
  grupos,
  paresDeCritica,
  perguntasDoRoteiro,
  registrosDeCritica,
  rodadasDeCritica,
  turmas,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra da crítica, distinto de falha de banco. */
export class CriticaInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'CriticaInvalida'
  }
}

export type ParSorteado = { parId: string; revisorId: string; revisadoId: string }

export type ResultadoDoSorteio = {
  pares: readonly ParSorteado[]
  /** Grupos sem par. A plataforma não decide o que fazer com eles. */
  semPar: readonly string[]
}

/** O roteiro de uma rodada, na ordem em que o revisor deve perguntar. */
export async function roteiroDaRodada(
  db: Db,
  rodadaId: string,
): Promise<{ ordem: number; enunciado: string }[]> {
  return db
    .select({ ordem: perguntasDoRoteiro.ordem, enunciado: perguntasDoRoteiro.enunciado })
    .from(perguntasDoRoteiro)
    .where(eq(perguntasDoRoteiro.rodadaId, rodadaId))
    .orderBy(asc(perguntasDoRoteiro.ordem))
}

/**
 * Os encontros que já aconteceram numa turma, antes de uma rodada.
 *
 * Chaves não ordenadas, porque `{A,B}` e `{B,A}` são o mesmo encontro — e o que
 * o Doc 5 §4.1 quer é que cada grupo enxergue dois temas alheios, não que a
 * seta troque de sentido.
 */
async function encontrosAnteriores(
  db: Db,
  turmaId: string,
  ordemDaRodada: number,
  cursoId: string,
): Promise<Set<string>> {
  const anteriores = await db
    .select({ revisorId: paresDeCritica.revisorId, revisadoId: paresDeCritica.revisadoId })
    .from(paresDeCritica)
    .innerJoin(rodadasDeCritica, eq(rodadasDeCritica.id, paresDeCritica.rodadaId))
    .innerJoin(grupos, eq(grupos.id, paresDeCritica.revisorId))
    .where(
      and(
        eq(grupos.turmaId, turmaId),
        eq(rodadasDeCritica.cursoId, cursoId),
        lt(rodadasDeCritica.ordem, ordemDaRodada),
      ),
    )

  return new Set(anteriores.map((p) => chaveDoPar(p.revisorId, p.revisadoId)))
}

/**
 * Sorteia o emparelhamento de uma rodada e grava os dois sentidos de cada par.
 *
 * Um emparelhamento vira DUAS linhas: o par de grupos se critica nos dois
 * sentidos na mesma sessão, "25 minutos por direção" (Doc 5 §4.5). Gravar um
 * sentido só deixaria metade da turma sem crítica a escrever.
 *
 * O gerador aleatório entra por parâmetro para o sorteio ser reproduzível — um
 * instrutor pode perguntar por que dois grupos caíram juntos, e "o computador
 * decidiu" não é resposta.
 *
 * Sortear duas vezes a mesma rodada é recusado. O segundo sorteio desfaria
 * pareamentos que a turma já está usando, e o índice único de revisor por
 * rodada recusaria de qualquer forma — melhor a frase que a violação.
 */
export async function sorteiaRodada(
  db: Db,
  rodadaId: string,
  turmaId: string,
  instrutorId: string,
  aleatorio: () => number,
): Promise<ResultadoDoSorteio> {
  await exigeInstrutor(db, instrutorId)

  const [rodada] = await db
    .select({ ordem: rodadasDeCritica.ordem, cursoId: rodadasDeCritica.cursoId })
    .from(rodadasDeCritica)
    .where(eq(rodadasDeCritica.id, rodadaId))
    .limit(1)

  if (!rodada) throw new CriticaInvalida('rodada não encontrada')

  const [turma] = await db
    .select({ cursoId: turmas.cursoId })
    .from(turmas)
    .where(eq(turmas.id, turmaId))
    .limit(1)

  if (!turma) throw new CriticaInvalida('turma não encontrada')
  if (turma.cursoId !== rodada.cursoId) {
    throw new CriticaInvalida('a rodada não pertence ao curso desta turma')
  }

  const daTurma = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(eq(grupos.turmaId, turmaId))
    .orderBy(asc(grupos.criadoEm))

  const jaSorteada = await db
    .select({ id: paresDeCritica.id })
    .from(paresDeCritica)
    .innerJoin(grupos, eq(grupos.id, paresDeCritica.revisorId))
    .where(and(eq(paresDeCritica.rodadaId, rodadaId), eq(grupos.turmaId, turmaId)))
    .limit(1)

  if (jaSorteada.length > 0) {
    throw new CriticaInvalida('esta rodada já foi sorteada para esta turma')
  }

  const anteriores = await encontrosAnteriores(db, turmaId, rodada.ordem, rodada.cursoId)
  const emparelhamento = sorteiaEmparelhamento(
    daTurma.map((g) => g.id),
    anteriores,
    aleatorio,
  )

  if (!emparelhamento) {
    throw new CriticaInvalida(
      'não há emparelhamento possível sem repetir encontro de rodada anterior',
    )
  }

  if (emparelhamento.pares.length === 0) {
    return { pares: [], semPar: emparelhamento.semPar }
  }

  const gravados = await db
    .insert(paresDeCritica)
    .values(
      emparelhamento.pares.flatMap((p) => [
        { rodadaId, revisorId: p.a, revisadoId: p.b },
        { rodadaId, revisorId: p.b, revisadoId: p.a },
      ]),
    )
    .returning({
      parId: paresDeCritica.id,
      revisorId: paresDeCritica.revisorId,
      revisadoId: paresDeCritica.revisadoId,
    })

  return { pares: gravados, semPar: emparelhamento.semPar }
}

/**
 * Grava o registro escrito de um sentido da crítica.
 *
 * Os dois campos são a regra inteira do Doc 5 §4.2: explicar o tema do colega em
 * uma frase, e entregar ao menos um cenário concreto que quebra. "Achei
 * confuso" não é cenário — mas isso é julgamento humano, e a plataforma exige
 * que o campo exista, não que ele seja bom.
 */
export async function registraCritica(
  db: Db,
  parId: string,
  registro: { explicacaoDoTema: string; cenarioQueQuebra: string },
): Promise<{ id: string }> {
  const explicacaoDoTema = registro.explicacaoDoTema.trim()
  const cenarioQueQuebra = registro.cenarioQueQuebra.trim()

  if (explicacaoDoTema.length === 0) {
    throw new CriticaInvalida('a crítica exige explicar o tema do colega em uma frase')
  }
  if (cenarioQueQuebra.length === 0) {
    throw new CriticaInvalida('a crítica exige ao menos um cenário concreto que quebra')
  }

  const [gravado] = await db
    .insert(registrosDeCritica)
    .values({ parId, explicacaoDoTema, cenarioQueQuebra })
    .onConflictDoUpdate({
      target: registrosDeCritica.parId,
      set: { explicacaoDoTema, cenarioQueQuebra, registradoEm: new Date() },
    })
    .returning({ id: registrosDeCritica.id })

  if (!gravado) throw new CriticaInvalida('não foi possível gravar a crítica')
  return gravado
}

export type PendenciaDeCritica = {
  parId: string
  revisorId: string
  revisadoId: string
  /** O grupo consultado deve esta crítica. */
  deve: boolean
  /** O grupo consultado ainda não recebeu esta crítica. */
  aguarda: boolean
}

/**
 * O que falta a um grupo numa rodada, nos dois papéis.
 *
 * A pendência aparece para **ambas** as partes de propósito. Quem revisa
 * precisa saber que deve escrever; quem é revisado precisa saber que ainda não
 * recebeu — e essa segunda metade é a que costuma sumir das telas, porque quem
 * está esperando não tem nada a fazer e por isso ninguém lembra dele.
 *
 * Sem ela, um grupo descobriria na plenária que ninguém escreveu sobre o tema
 * dele, e os 115 minutos da rodada já teriam passado.
 */
export async function pendenciasDaRodada(
  db: Db,
  rodadaId: string,
  grupoId: string,
): Promise<PendenciaDeCritica[]> {
  const meus = await db
    .select({
      parId: paresDeCritica.id,
      revisorId: paresDeCritica.revisorId,
      revisadoId: paresDeCritica.revisadoId,
      registroId: registrosDeCritica.id,
    })
    .from(paresDeCritica)
    .leftJoin(registrosDeCritica, eq(registrosDeCritica.parId, paresDeCritica.id))
    .where(
      and(
        eq(paresDeCritica.rodadaId, rodadaId),
        or(eq(paresDeCritica.revisorId, grupoId), eq(paresDeCritica.revisadoId, grupoId)),
      ),
    )

  return meus
    .filter((p) => p.registroId === null)
    .map((p) => ({
      parId: p.parId,
      revisorId: p.revisorId,
      revisadoId: p.revisadoId,
      deve: p.revisorId === grupoId,
      aguarda: p.revisadoId === grupoId,
    }))
}

/** A rodada inteira, para o instrutor ver quem ainda não escreveu. */
export async function situacaoDaRodada(
  db: Db,
  rodadaId: string,
  turmaId: string,
): Promise<{ parId: string; revisorId: string; revisadoId: string; registrada: boolean }[]> {
  const daTurma = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(eq(grupos.turmaId, turmaId))

  if (daTurma.length === 0) return []

  return db
    .select({
      parId: paresDeCritica.id,
      revisorId: paresDeCritica.revisorId,
      revisadoId: paresDeCritica.revisadoId,
      registroId: registrosDeCritica.id,
    })
    .from(paresDeCritica)
    .leftJoin(registrosDeCritica, eq(registrosDeCritica.parId, paresDeCritica.id))
    .where(
      and(
        eq(paresDeCritica.rodadaId, rodadaId),
        inArray(
          paresDeCritica.revisorId,
          daTurma.map((g) => g.id),
        ),
      ),
    )
    .orderBy(asc(paresDeCritica.criadoEm))
    .then((linhas) =>
      linhas.map(({ registroId, ...resto }) => ({ ...resto, registrada: registroId !== null })),
    )
}
