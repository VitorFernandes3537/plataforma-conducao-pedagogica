import { and, asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import { grupos, itensDeMural, obstaculos } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do mural, distinto de falha de banco. */
export class ItemDeMuralInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'ItemDeMuralInvalido'
  }
}

export type ItemDoMural = {
  id: string
  grupoId: string
  texto: string
  status: 'aberto' | 'resolvido'
  resolvidoPorId: string | null
  resolvidoEm: Date | null
  criadoEm: Date
}

/**
 * O mural agrupado pela PERGUNTA do obstáculo.
 *
 * A chave do agrupamento é a pergunta, nunca o identificador nem a ordem
 * (Doc 5 §8.1 · `D3-07`). Não é detalhe de apresentação: agrupar por número
 * transformaria o mural em índice de aula numerada, que é exatamente o que
 * separa o método de um currículo — o aluno reconhece a própria dúvida na
 * pergunta, não num obstáculo numerado.
 */
export type GrupoDoMural = {
  obstaculoId: string
  pergunta: string
  itens: readonly ItemDoMural[]
}

/**
 * Escreve um item no mural.
 *
 * O autor é o GRUPO, que o Doc 5 §8.1 diz ser quem escreve, sempre que trava.
 * Quem digitou não é o fato registrado — quem travou é.
 *
 * O vínculo com o obstáculo é obrigatório porque é a pergunta que agrupa. Item
 * sem vínculo não teria onde aparecer na única tela que existe.
 *
 * Não há validação do texto além de não ser vazio. O Doc 5 §8.3 separa a dúvida
 * do pedido de solução por exemplos, e isso é leitura humana — automatizar
 * seria a plataforma corrigindo conteúdo, que o Doc 7 §6 exclui.
 */
export async function escreveNoMural(
  db: Db,
  grupoId: string,
  obstaculoId: string,
  texto: string,
): Promise<{ id: string }> {
  const limpo = texto.trim()
  if (limpo.length === 0) {
    throw new ItemDeMuralInvalido('o item do mural exige a dúvida escrita')
  }

  const [gravado] = await db
    .insert(itensDeMural)
    .values({ grupoId, obstaculoId, texto: limpo })
    .returning({ id: itensDeMural.id })

  if (!gravado) throw new ItemDeMuralInvalido('não foi possível escrever no mural')
  return gravado
}

/**
 * Risca um item: o instrutor marca que a demonstração resolveu a dúvida.
 *
 * "Quem risca: o instrutor, quando a demonstração resolve o item" (Doc 5 §8.1).
 * O grupo escreve e não risca — se pudesse, o mural deixaria de mostrar o que a
 * turma ainda não sabe e passaria a mostrar o que cada grupo acha que já sabe.
 *
 * O `where` exige item aberto, então riscar duas vezes é recusado dentro da
 * escrita: o segundo risco moveria a data e o autor do primeiro.
 */
export async function riscaItem(
  db: Db,
  itemId: string,
  instrutorId: string,
): Promise<{ resolvidoEm: Date }> {
  await exigeInstrutor(db, instrutorId)

  const [riscado] = await db
    .update(itensDeMural)
    .set({ status: 'resolvido', resolvidoPorId: instrutorId, resolvidoEm: new Date() })
    .where(and(eq(itensDeMural.id, itemId), eq(itensDeMural.status, 'aberto')))
    .returning({ resolvidoEm: itensDeMural.resolvidoEm })

  if (!riscado?.resolvidoEm) {
    throw new ItemDeMuralInvalido('item não encontrado, ou já riscado')
  }
  return { resolvidoEm: riscado.resolvidoEm }
}

/**
 * Desfaz o risco.
 *
 * Riscar por engano precisa ter volta, pela mesma razão que a confirmação de
 * push tem: um item riscado some da lista do que a turma ainda precisa saber, e
 * o mural é consultado na abertura de todo dia. Continua sendo ato do instrutor
 * — o grupo não escolhe o que volta a estar aberto.
 */
export async function reabreItem(
  db: Db,
  itemId: string,
  instrutorId: string,
): Promise<{ reabertos: number }> {
  await exigeInstrutor(db, instrutorId)

  const reabertos = await db
    .update(itensDeMural)
    .set({ status: 'aberto', resolvidoPorId: null, resolvidoEm: null })
    .where(and(eq(itensDeMural.id, itemId), eq(itensDeMural.status, 'resolvido')))
    .returning({ id: itensDeMural.id })

  return { reabertos: reabertos.length }
}

/**
 * O mural de uma turma, agrupado por pergunta de obstáculo.
 *
 * Traz os obstáculos do curso inteiro, inclusive os sem item. A pergunta sem
 * dúvida nenhuma é informação: significa que a turma passou por ali sem travar,
 * e o instrutor lê isso na abertura do dia.
 *
 * Itens riscados continuam vindo, marcados. O mural é o que sobrevive ao dia e
 * alimenta a retrospectiva (Doc 5 §8.2); apagar o resolvido apagaria metade
 * dela.
 */
export async function muralDaTurma(db: Db, turmaId: string): Promise<GrupoDoMural[]> {
  const [turma] = await db
    .select({ cursoId: schema.turmas.cursoId })
    .from(schema.turmas)
    .where(eq(schema.turmas.id, turmaId))
    .limit(1)

  if (!turma) throw new ItemDeMuralInvalido('turma não encontrada')

  const perguntas = await db
    .select({ id: obstaculos.id, pergunta: obstaculos.pergunta })
    .from(obstaculos)
    .where(eq(obstaculos.cursoId, turma.cursoId))
    .orderBy(asc(obstaculos.ordem))

  const itens = await db
    .select({
      id: itensDeMural.id,
      obstaculoId: itensDeMural.obstaculoId,
      grupoId: itensDeMural.grupoId,
      texto: itensDeMural.texto,
      status: itensDeMural.status,
      resolvidoPorId: itensDeMural.resolvidoPorId,
      resolvidoEm: itensDeMural.resolvidoEm,
      criadoEm: itensDeMural.criadoEm,
    })
    .from(itensDeMural)
    .innerJoin(grupos, eq(grupos.id, itensDeMural.grupoId))
    .where(eq(grupos.turmaId, turmaId))
    .orderBy(asc(itensDeMural.criadoEm))

  return perguntas.map((p) => ({
    obstaculoId: p.id,
    pergunta: p.pergunta,
    itens: itens
      .filter((i) => i.obstaculoId === p.id)
      .map((i) => ({
        id: i.id,
        grupoId: i.grupoId,
        texto: i.texto,
        status: i.status,
        resolvidoPorId: i.resolvidoPorId,
        resolvidoEm: i.resolvidoEm,
        criadoEm: i.criadoEm,
      })),
  }))
}

/** Só o que a turma ainda não sabe. É o degrau 2 da escada de suporte. */
export async function muralEmAberto(db: Db, turmaId: string): Promise<GrupoDoMural[]> {
  const completo = await muralDaTurma(db, turmaId)
  return completo
    .map((g) => ({ ...g, itens: g.itens.filter((i) => i.status === 'aberto') }))
    .filter((g) => g.itens.length > 0)
}
