import { and, eq, isNull } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeProducaoPropria } from './ator'
import { garanteRegistroDiario } from './registro-diario'
import * as schema from './schema'
import { contratosDiarios, registrosDiarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do contrato diário, distinto de falha de banco. */
export class ContratoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'ContratoInvalido'
  }
}

export type DuasLinhas = { faremos: string; naoFaremos: string }

export type ContratoDoDia = {
  id: string
  faremos: string
  naoFaremos: string
  cumprido: boolean | null
  motivoDoFechamento: string | null
  abertoEm: Date
  fechadoEm: Date | null
}

function exigeAsDuasLinhas({ faremos, naoFaremos }: DuasLinhas): DuasLinhas {
  if (faremos.trim().length === 0) {
    throw new ContratoInvalido('o contrato exige dizer o que será feito hoje')
  }
  if (naoFaremos.trim().length === 0) {
    // A segunda linha é a que importa (Doc 5 §7.1): sem ela o instrumento não
    // vacina contra nada, e o contrato viraria uma lista de intenções.
    throw new ContratoInvalido('o contrato exige dizer o que NÃO será feito hoje')
  }
  return { faremos: faremos.trim(), naoFaremos: naoFaremos.trim() }
}

/**
 * Abre o contrato diário de um aluno, com as duas linhas.
 *
 * Reabrir com texto novo é permitido **enquanto o dia não fechou** — corrigir o
 * que se escreveu em dois minutos de abertura é legítimo. Depois do fechamento,
 * não: poder reescrever "hoje NÃO faremos" depois de saber o resultado
 * destruiria a única coisa que o instrumento faz.
 */
export async function abreContratoDiario(
  db: Db,
  alunoId: string,
  diaId: string,
  linhas: DuasLinhas,
  autorId: string,
): Promise<{ id: string }> {
  await exigeProducaoPropria(db, autorId, alunoId)
  const limpas = exigeAsDuasLinhas(linhas)

  const registro = await garanteRegistroDiario(db, alunoId, diaId)

  const [gravado] = await db
    .insert(contratosDiarios)
    .values({ registroDiarioId: registro.id, ...limpas })
    .onConflictDoUpdate({
      target: contratosDiarios.registroDiarioId,
      set: limpas,
      setWhere: isNull(contratosDiarios.cumprido),
    })
    .returning({ id: contratosDiarios.id })

  if (!gravado) {
    throw new ContratoInvalido('o dia já foi fechado: o contrato não se reescreve depois')
  }
  return gravado
}

/**
 * Fecha o dia: cumpriu ou não, e por quê (Doc 5 §7).
 *
 * O `where` exige contrato aberto, então fechar duas vezes é recusado dentro da
 * escrita — um segundo veredito reescreveria o histórico que a retrospectiva do
 * último dia usa como insumo (§7.2).
 *
 * O motivo é obrigatório também quando cumpriu. O documento diz "cumpriu ou
 * não, **e por quê**" sem qualificar, e são 60 segundos de orçamento: uma frase.
 */
export async function fechaContratoDiario(
  db: Db,
  alunoId: string,
  diaId: string,
  veredito: { cumprido: boolean; motivo: string },
  autorId: string,
): Promise<{ fechadoEm: Date }> {
  await exigeProducaoPropria(db, autorId, alunoId)

  if (veredito.motivo.trim().length === 0) {
    throw new ContratoInvalido('o fechamento exige dizer por quê')
  }

  const [registro] = await db
    .select({ id: registrosDiarios.id })
    .from(registrosDiarios)
    .where(and(eq(registrosDiarios.alunoId, alunoId), eq(registrosDiarios.diaId, diaId)))
    .limit(1)

  // Sem contrato aberto não há o que fechar. É o critério "exige as duas linhas
  // antes de fechar o dia" lido pelo outro lado: as linhas são obrigatórias na
  // abertura, e sem abertura não existe fechamento.
  if (!registro) throw new ContratoInvalido('não há contrato aberto para este dia')

  const [fechado] = await db
    .update(contratosDiarios)
    .set({
      cumprido: veredito.cumprido,
      motivoDoFechamento: veredito.motivo.trim(),
      fechadoEm: new Date(),
    })
    .where(
      and(
        eq(contratosDiarios.registroDiarioId, registro.id),
        isNull(contratosDiarios.cumprido),
      ),
    )
    .returning({ fechadoEm: contratosDiarios.fechadoEm })

  if (!fechado?.fechadoEm) {
    const existente = await contratoDoDia(db, alunoId, diaId)
    throw new ContratoInvalido(
      existente ? 'este dia já foi fechado' : 'não há contrato aberto para este dia',
    )
  }

  return { fechadoEm: fechado.fechadoEm }
}

/** O contrato de um aluno num dia, aberto ou fechado. */
export async function contratoDoDia(
  db: Db,
  alunoId: string,
  diaId: string,
): Promise<ContratoDoDia | null> {
  const [linha] = await db
    .select({
      id: contratosDiarios.id,
      faremos: contratosDiarios.faremos,
      naoFaremos: contratosDiarios.naoFaremos,
      cumprido: contratosDiarios.cumprido,
      motivoDoFechamento: contratosDiarios.motivoDoFechamento,
      abertoEm: contratosDiarios.abertoEm,
      fechadoEm: contratosDiarios.fechadoEm,
    })
    .from(contratosDiarios)
    .innerJoin(registrosDiarios, eq(registrosDiarios.id, contratosDiarios.registroDiarioId))
    .where(and(eq(registrosDiarios.alunoId, alunoId), eq(registrosDiarios.diaId, diaId)))
    .limit(1)

  return linha ?? null
}
