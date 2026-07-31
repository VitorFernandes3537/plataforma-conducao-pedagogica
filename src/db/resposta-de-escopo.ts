import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import {
  estadosEditaveisPeloGrupo,
  estadosQueLevamA,
  type EstadoDoEscopo,
} from '@/domain/escopo'

import * as schema from './schema'
import {
  estruturas,
  linhasDeTraducao,
  papeisDaEstrutura,
  perguntasDoFormulario,
  respostasDeEscopo,
  respostasDePergunta,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra da resposta de escopo, distinto de falha de banco. */
export class EscopoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'EscopoInvalido'
  }
}

export type RespostaDoGrupo = {
  id: string
  grupoId: string
  formularioId: string
  /** Onde o escopo está na máquina de estados. É ele que abre e fecha a edição. */
  estado: EstadoDoEscopo
  submetidoEm: Date | null
  /**
   * O que o instrutor mandou corrigir, quando devolveu.
   *
   * Vem junto porque devolver sem o motivo à vista gastaria de novo os minutos
   * que a fila tem por grupo (Doc 2 §4.5) — o motivo é obrigatório na escrita, e
   * seria desperdiçado se a tela do grupo não o mostrasse.
   */
  motivoDaDevolucao: string | null
  respostas: readonly { perguntaId: string; ordem: number; texto: string }[]
}

/**
 * Abre o rascunho de escopo de um grupo.
 *
 * A resposta é **do grupo**, não do aluno: o contrato é preenchido e entregue
 * uma vez por grupo (Doc 2 §4.2), e a unidade vem do Doc 6 §1.1. Por isso a
 * unicidade está em `grupo_id` — dois alunos do mesmo grupo abrem o mesmo
 * rascunho, nunca dois.
 *
 * Idempotente: chamar de novo devolve o que já existe. Duas pessoas do mesmo
 * grupo entrando ao mesmo tempo é o caso normal, não a exceção.
 */
export async function abreRascunho(
  db: Db,
  grupoId: string,
  formularioId: string,
): Promise<{ id: string }> {
  const [existente] = await db
    .select({ id: respostasDeEscopo.id })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (existente) return existente

  const [criada] = await db
    .insert(respostasDeEscopo)
    .values({ grupoId, formularioId })
    .onConflictDoNothing({ target: respostasDeEscopo.grupoId })
    .returning({ id: respostasDeEscopo.id })

  if (criada) return criada

  // Perdeu a corrida para o parceiro de grupo: quem venceu já gravou.
  const [doParceiro] = await db
    .select({ id: respostasDeEscopo.id })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!doParceiro) throw new EscopoInvalido('não foi possível abrir o rascunho do grupo')
  return doParceiro
}

/** A resposta de escopo de um grupo, com o que já foi respondido. */
export async function respostaDoGrupo(db: Db, grupoId: string): Promise<RespostaDoGrupo | null> {
  const [escopo] = await db
    .select()
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!escopo) return null

  const respostas = await db
    .select({
      perguntaId: respostasDePergunta.perguntaId,
      ordem: perguntasDoFormulario.ordem,
      texto: respostasDePergunta.texto,
    })
    .from(respostasDePergunta)
    .innerJoin(
      perguntasDoFormulario,
      eq(perguntasDoFormulario.id, respostasDePergunta.perguntaId),
    )
    .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id))
    .orderBy(asc(perguntasDoFormulario.ordem))

  return {
    id: escopo.id,
    grupoId: escopo.grupoId,
    formularioId: escopo.formularioId,
    estado: escopo.estado,
    submetidoEm: escopo.submetidoEm,
    motivoDaDevolucao: escopo.motivoDaDevolucao,
    respostas,
  }
}

export type EstadoDaTraducao = {
  /** Papéis obrigatórios da estrutura que ainda não têm linha. */
  faltando: readonly { papelId: string; nome: string }[]
  completa: boolean
}

/**
 * Verifica se a tabela de tradução cobre todos os papéis obrigatórios.
 *
 * O critério é "uma linha por papel **obrigatório** da `Estrutura`". Papel
 * opcional pode ficar de fora sem invalidar o escopo — e é por isso que
 * `obrigatorio` é coluna e não convenção.
 *
 * A comparação é feita contra a estrutura do curso a que o grupo pertence, não
 * contra uma lista fixa: quantos papéis existem é configuração.
 */
export async function estadoDaTraducao(
  db: Db,
  respostaDeEscopoId: string,
  cursoId: string,
): Promise<EstadoDaTraducao> {
  const obrigatorios = await db
    .select({ papelId: papeisDaEstrutura.id, nome: papeisDaEstrutura.nome })
    .from(papeisDaEstrutura)
    .innerJoin(estruturas, eq(estruturas.id, papeisDaEstrutura.estruturaId))
    .where(and(eq(estruturas.cursoId, cursoId), eq(papeisDaEstrutura.obrigatorio, true)))
    .orderBy(asc(papeisDaEstrutura.ordem))

  const preenchidos = await db
    .select({ papelId: linhasDeTraducao.papelId })
    .from(linhasDeTraducao)
    .where(eq(linhasDeTraducao.respostaDeEscopoId, respostaDeEscopoId))

  const cobertos = new Set(preenchidos.map((l) => l.papelId))
  const faltando = obrigatorios.filter((p) => !cobertos.has(p.papelId))

  return { faltando, completa: faltando.length === 0 }
}

/**
 * Grava a resposta de uma pergunta no escopo do grupo.
 *
 * O grupo edita enquanto o escopo é `rascunho` ou `devolvido` — a lista sai do
 * mapa de transições, não de uma segunda cópia. Entregue, deixa de ser
 * editável: reescrever depois de entregar tornaria a fila do instrutor um alvo
 * móvel, e a imutabilidade a partir da aprovação é do Doc 7 §2.4.
 *
 * O `SELECT ... FOR UPDATE` no escopo é o que serializa. Sem ele a primeira
 * gravação de uma pergunta escaparia — o filtro do `on conflict` só vale para o
 * caminho de UPDATE, e resposta nova entra pelo INSERT. Com a linha travada, a
 * aprovação do instrutor espera a gravação terminar em vez de acontecer no meio
 * dela.
 */
export async function gravaResposta(
  db: Db,
  respostaDeEscopoId: string,
  perguntaId: string,
  texto: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [escopo] = await tx
      .select({ estado: respostasDeEscopo.estado })
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
      .limit(1)
      .for('update')

    if (!escopo) throw new EscopoInvalido('escopo não encontrado')

    if (!estadosEditaveisPeloGrupo().includes(escopo.estado)) {
      throw new EscopoInvalido(`escopo ${escopo.estado}: o grupo não edita depois de entregar`)
    }

    await tx
      .insert(respostasDePergunta)
      .values({ respostaDeEscopoId, perguntaId, texto })
      .onConflictDoUpdate({
        target: [respostasDePergunta.respostaDeEscopoId, respostasDePergunta.perguntaId],
        set: { texto, atualizadoEm: new Date() },
      })
  })
}

export type LinhaDaTraducao = {
  papelId: string
  ordem: number
  nome: string
  obrigatorio: boolean
  nomeNoNegocio: string | null
  nomeNoCodigo: string | null
}

/**
 * A tabela de tradução de um escopo, com os papéis ainda vazios inclusos.
 *
 * `estadoDaTraducao` responde "está completa?"; esta responde "o que há para
 * preencher". São perguntas diferentes e a tela precisa da segunda: papel sem
 * linha tem que aparecer como campo vazio, não sumir.
 *
 * Traz o papel OPCIONAL junto. Ele não invalida o escopo se ficar de fora
 * (`obrigatorio` é coluna, não convenção), mas escondê-lo tiraria do grupo a
 * chance de preenchê-lo — e a tabela é o índice de navegação do código dele.
 *
 * Aceita escopo **inexistente**, e isso é o caso normal na primeira abertura da
 * tela: o rascunho só nasce quando alguém grava algo. A alternativa seria criar
 * o rascunho ao renderizar a página, e uma requisição de leitura que escreve no
 * banco é o tipo de efeito que reaparece como linha fantasma quando o navegador
 * faz prefetch.
 */
export async function traducaoDoEscopo(
  db: Db,
  respostaDeEscopoId: string | null,
  cursoId: string,
): Promise<LinhaDaTraducao[]> {
  const daResposta = respostaDeEscopoId
    ? eq(linhasDeTraducao.respostaDeEscopoId, respostaDeEscopoId)
    : sql`false`

  return db
    .select({
      papelId: papeisDaEstrutura.id,
      ordem: papeisDaEstrutura.ordem,
      nome: papeisDaEstrutura.nome,
      obrigatorio: papeisDaEstrutura.obrigatorio,
      nomeNoNegocio: linhasDeTraducao.nomeNoNegocio,
      nomeNoCodigo: linhasDeTraducao.nomeNoCodigo,
    })
    .from(papeisDaEstrutura)
    .innerJoin(estruturas, eq(estruturas.id, papeisDaEstrutura.estruturaId))
    .leftJoin(
      linhasDeTraducao,
      and(eq(linhasDeTraducao.papelId, papeisDaEstrutura.id), daResposta),
    )
    .where(eq(estruturas.cursoId, cursoId))
    .orderBy(asc(papeisDaEstrutura.ordem))
}

/**
 * Grava uma linha da tabela de tradução.
 *
 * Mesma janela de edição de `gravaResposta`, e pelo mesmo motivo: a tabela é
 * parte do que o instrutor julga (Doc 2 §4.5), então reescrevê-la depois de
 * entregar tornaria a fila um alvo móvel. A lista de estados sai do mapa de
 * transições, nunca de uma segunda cópia.
 *
 * O `SELECT ... FOR UPDATE` serializa contra a decisão do instrutor pela mesma
 * razão de lá: no D3 as duas telas estão abertas ao mesmo tempo.
 *
 * A plataforma **não** julga o nome. "Tradução sem nomes genéricos" é
 * verificação declarada do formulário (Doc 2 §4.6), e quem a executa é o motor
 * de regras sobre o dado — não um `if` escondido numa escrita.
 */
export async function gravaLinhaDeTraducao(
  db: Db,
  respostaDeEscopoId: string,
  papelId: string,
  nomes: { nomeNoNegocio: string; nomeNoCodigo: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [escopo] = await tx
      .select({ estado: respostasDeEscopo.estado })
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.id, respostaDeEscopoId))
      .limit(1)
      .for('update')

    if (!escopo) throw new EscopoInvalido('escopo não encontrado')

    if (!estadosEditaveisPeloGrupo().includes(escopo.estado)) {
      throw new EscopoInvalido(`escopo ${escopo.estado}: o grupo não edita depois de entregar`)
    }

    await tx
      .insert(linhasDeTraducao)
      .values({ respostaDeEscopoId, papelId, ...nomes })
      .onConflictDoUpdate({
        target: [linhasDeTraducao.respostaDeEscopoId, linhasDeTraducao.papelId],
        set: nomes,
      })
  })
}

/**
 * Campos da submissão, usados aqui e pelo portão do pré-filtro.
 *
 * Reenviar um escopo devolvido apaga a decisão anterior: o CHECK
 * `decisao_coerente_com_estado` exige o par vazio fora de `aprovado` e
 * `devolvido`, e o motivo antigo na tela do grupo apareceria como correção
 * ainda pendente.
 */
export function camposDaSubmissao(): Partial<typeof respostasDeEscopo.$inferInsert> {
  return {
    estado: 'submetido',
    submetidoEm: new Date(),
    decididoEm: null,
    decididoPorId: null,
    motivoDaDevolucao: null,
  }
}

/**
 * De onde se pode submeter. Vem do mapa de transições, não de uma segunda
 * lista: `rascunho` na primeira entrega, `devolvido` na correção.
 */
export function origensDaSubmissao() {
  return [...estadosQueLevamA('submetido')]
}

/**
 * Submete o escopo do grupo.
 *
 * Marca o instante e fecha a edição. Submeter duas vezes é recusado: o segundo
 * clique não pode mover a data e reabrir a janela de edição — e a data é o que
 * ordena a fila do instrutor por tempo de espera.
 *
 * A legalidade é verificada dentro da escrita, pelo `where`. Ler o estado e
 * gravar depois perderia a corrida entre o grupo reenviando e o instrutor
 * decidindo, que no D3 acontece com as duas telas abertas.
 */
export async function submete(db: Db, respostaDeEscopoId: string): Promise<{ submetidoEm: Date }> {
  const [atualizada] = await db
    .update(respostasDeEscopo)
    .set(camposDaSubmissao())
    .where(
      and(
        eq(respostasDeEscopo.id, respostaDeEscopoId),
        inArray(respostasDeEscopo.estado, origensDaSubmissao()),
      ),
    )
    .returning({ submetidoEm: respostasDeEscopo.submetidoEm })

  if (!atualizada?.submetidoEm) {
    throw new EscopoInvalido('escopo já foi submetido')
  }
  return { submetidoEm: atualizada.submetidoEm }
}
