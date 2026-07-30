import { and, asc, eq, inArray, lte } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import type { Ator } from '@/domain/autorizacao'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import {
  cursos,
  dias,
  grupos,
  incrementos,
  itensImutaveis,
  lacunasDoModelo,
  modelosDeMudanca,
  perguntasDoFormulario,
  respostasDeEscopo,
  respostasDePergunta,
  turmas,
  valoresDaLacuna,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do incremento, distinto de falha de banco. */
export class IncrementoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'IncrementoInvalido'
  }
}

export type LacunaParaPreencher = {
  lacunaId: string
  chave: string
  rotulo: string
  obrigatoria: boolean
}

export type MudancaParaPreencher = {
  modeloId: string
  ordem: number
  rotulo: string
  lacunas: readonly LacunaParaPreencher[]
}

export type Derivacao = {
  /** Respostas do grupo que alimentam a derivação, na ordem do formulário. */
  respostasDeOrigem: readonly { perguntaId: string; enunciado: string; texto: string }[]
  mudancas: readonly MudancaParaPreencher[]
  minimoDeItensImutaveis: number
}

/**
 * Pré-carrega o que o instrutor precisa ter à vista para derivar o incremento.
 *
 * "O envelope não se escreve — ele se deriva" (Doc 6 §4.1). O instrutor abre a
 * resposta de escopo do grupo, lê as respostas marcadas como origem e preenche
 * as lacunas: ~10 minutos por incremento (§4.4). Sem a pré-carga ele abriria
 * duas telas e copiaria à mão, e os 10 minutos virariam 20 vezes onze.
 *
 * Quais respostas alimentam a derivação é configuração — a marca está na
 * pergunta. O Doc 6 nomeia as do curso dele, e esses códigos não podem entrar
 * no código da plataforma.
 *
 * Recusa grupo sem escopo aprovado. É a regra do Doc 7 §2.4, e recusar aqui
 * poupa o instrutor de descobrir depois de preencher — o gatilho recusaria de
 * qualquer forma, mas com violação de constraint em vez de frase.
 */
export async function derivacaoDoGrupo(
  db: Db,
  grupoId: string,
  versao: 'integral' | 'reduzida',
): Promise<Derivacao> {
  const [escopo] = await db
    .select({
      id: respostasDeEscopo.id,
      estado: respostasDeEscopo.estado,
      formularioId: respostasDeEscopo.formularioId,
      cursoId: turmas.cursoId,
      minimoDeItensImutaveis: cursos.minimoDeItensImutaveis,
    })
    .from(respostasDeEscopo)
    .innerJoin(grupos, eq(grupos.id, respostasDeEscopo.grupoId))
    .innerJoin(turmas, eq(turmas.id, grupos.turmaId))
    .innerJoin(cursos, eq(cursos.id, turmas.cursoId))
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!escopo) {
    throw new IncrementoInvalido('este grupo ainda não tem escopo: o incremento deriva dele')
  }
  if (escopo.estado !== 'aprovado') {
    throw new IncrementoInvalido(
      `escopo ${escopo.estado}: o incremento só deriva de escopo aprovado`,
    )
  }

  const respostasDeOrigem = await db
    .select({
      perguntaId: perguntasDoFormulario.id,
      enunciado: perguntasDoFormulario.enunciado,
      texto: respostasDePergunta.texto,
    })
    .from(respostasDePergunta)
    .innerJoin(perguntasDoFormulario, eq(perguntasDoFormulario.id, respostasDePergunta.perguntaId))
    .where(
      and(
        eq(respostasDePergunta.respostaDeEscopoId, escopo.id),
        eq(perguntasDoFormulario.alimentaIncremento, true),
      ),
    )
    .orderBy(asc(perguntasDoFormulario.ordem))

  const mudancas = await modelosDoCurso(db, escopo.cursoId, versao)

  return { respostasDeOrigem, mudancas, minimoDeItensImutaveis: escopo.minimoDeItensImutaveis }
}

/**
 * As mudanças que uma versão inclui, com as lacunas de cada uma.
 *
 * A versão reduzida não some com uma mudança por condicional: ela filtra pelos
 * modelos que o curso marcou. Quem decide o que a redução poupa é o curso, e o
 * Doc 5 §5.2 chama isso de "mesma estrutura, menos superfície".
 */
export async function modelosDoCurso(
  db: Db,
  cursoId: string,
  versao: 'integral' | 'reduzida',
): Promise<MudancaParaPreencher[]> {
  const modelos = await db
    .select({
      modeloId: modelosDeMudanca.id,
      ordem: modelosDeMudanca.ordem,
      rotulo: modelosDeMudanca.rotulo,
    })
    .from(modelosDeMudanca)
    .where(
      versao === 'reduzida'
        ? and(
            eq(modelosDeMudanca.cursoId, cursoId),
            eq(modelosDeMudanca.entraNaVersaoReduzida, true),
          )
        : eq(modelosDeMudanca.cursoId, cursoId),
    )
    .orderBy(asc(modelosDeMudanca.ordem))

  if (modelos.length === 0) return []

  const lacunas = await db
    .select({
      lacunaId: lacunasDoModelo.id,
      modeloId: lacunasDoModelo.modeloDeMudancaId,
      chave: lacunasDoModelo.chave,
      rotulo: lacunasDoModelo.rotulo,
      obrigatoria: lacunasDoModelo.obrigatoria,
    })
    .from(lacunasDoModelo)
    .where(
      inArray(
        lacunasDoModelo.modeloDeMudancaId,
        modelos.map((m) => m.modeloId),
      ),
    )
    .orderBy(asc(lacunasDoModelo.ordem))

  return modelos.map((m) => ({
    ...m,
    lacunas: lacunas
      .filter((l) => l.modeloId === m.modeloId)
      .map(({ lacunaId, chave, rotulo, obrigatoria }) => ({ lacunaId, chave, rotulo, obrigatoria })),
  }))
}

export type IncrementoPreenchido = {
  remetente: string
  contexto: string
  versao: 'integral' | 'reduzida'
  diaDeLiberacaoId: string
  /** Valor por `lacunaId`. As obrigatórias da versão precisam estar aqui. */
  lacunas: Readonly<Record<string, string>>
  itensImutaveis: readonly string[]
}

/**
 * Grava o incremento de um grupo.
 *
 * Ato do instrutor. O incremento é o pedido que CHEGA ao grupo — se o grupo
 * pudesse escrevê-lo, deixaria de ser mudança externa e o eixo de absorção
 * mediria a própria imaginação dele.
 *
 * Tudo numa transação: um incremento com cabeçalho gravado e lacunas pela
 * metade seria entregue incompleto no dia da liberação, quando já não há tempo
 * de refazer.
 */
export async function geraIncremento(
  db: Db,
  grupoId: string,
  preenchido: IncrementoPreenchido,
  instrutorId: string,
): Promise<{ id: string }> {
  await exigeInstrutor(db, instrutorId)

  const derivacao = await derivacaoDoGrupo(db, grupoId, preenchido.versao)

  const remetente = preenchido.remetente.trim()
  if (remetente.length === 0) {
    // "O envelope vem assinado por um interessado nomeado do domínio"
    // (Doc 6 §4.2.1): sem remetente a mudança volta a ser tarefa do professor.
    throw new IncrementoInvalido('o incremento exige um remetente nomeado do domínio')
  }

  const contexto = preenchido.contexto.trim()
  if (contexto.length === 0) {
    throw new IncrementoInvalido('o incremento exige uma frase de contexto de negócio')
  }

  const itens = preenchido.itensImutaveis.map((i) => i.trim()).filter((i) => i.length > 0)
  if (itens.length < derivacao.minimoDeItensImutaveis) {
    throw new IncrementoInvalido(
      `"o que não muda" exige ao menos ${derivacao.minimoDeItensImutaveis} itens; vieram ${itens.length}`,
    )
  }

  const obrigatorias = derivacao.mudancas.flatMap((m) => m.lacunas.filter((l) => l.obrigatoria))
  const faltando = obrigatorias.filter(
    (l) => (preenchido.lacunas[l.lacunaId] ?? '').trim().length === 0,
  )
  if (faltando.length > 0) {
    throw new IncrementoInvalido(
      `faltam lacunas obrigatórias: ${faltando.map((l) => l.rotulo).join(', ')}`,
    )
  }

  const daVersao = new Set(derivacao.mudancas.flatMap((m) => m.lacunas.map((l) => l.lacunaId)))
  const forasteira = Object.keys(preenchido.lacunas).find((id) => !daVersao.has(id))
  if (forasteira) {
    throw new IncrementoInvalido('lacuna preenchida não pertence às mudanças desta versão')
  }

  const [escopo] = await db
    .select({ id: respostasDeEscopo.id })
    .from(respostasDeEscopo)
    .where(eq(respostasDeEscopo.grupoId, grupoId))
    .limit(1)

  if (!escopo) throw new IncrementoInvalido('escopo do grupo não encontrado')

  return db.transaction(async (tx) => {
    const [criado] = await tx
      .insert(incrementos)
      .values({
        grupoId,
        respostaDeEscopoId: escopo.id,
        remetente,
        contexto,
        versao: preenchido.versao,
        diaDeLiberacaoId: preenchido.diaDeLiberacaoId,
        criadoPorId: instrutorId,
      })
      .returning({ id: incrementos.id })

    if (!criado) throw new IncrementoInvalido('não foi possível gravar o incremento')

    const preenchidas = Object.entries(preenchido.lacunas)
      .map(([lacunaId, valor]) => ({ incrementoId: criado.id, lacunaId, valor: valor.trim() }))
      .filter((v) => v.valor.length > 0)

    if (preenchidas.length > 0) await tx.insert(valoresDaLacuna).values(preenchidas)

    await tx
      .insert(itensImutaveis)
      .values(itens.map((texto, i) => ({ incrementoId: criado.id, ordem: i + 1, texto })))

    return criado
  })
}

export type IncrementoMontado = {
  id: string
  grupoId: string
  remetente: string
  contexto: string
  versao: 'integral' | 'reduzida'
  ordemDeLiberacao: number
  mudancas: readonly {
    rotulo: string
    lacunas: readonly { chave: string; rotulo: string; valor: string }[]
  }[]
  itensImutaveis: readonly string[]
}

/**
 * O incremento de um grupo, montado, respeitando a liberação.
 *
 * O filtro de liberação é de CONSULTA, não de tela. Incremento não liberado não
 * pode chegar ao navegador do aluno nem dentro de uma resposta que a interface
 * ignora — é o mesmo motivo pelo qual o material de referência filtra em SQL.
 *
 * O instrutor vê antes: ele é quem escreve, e produz os incrementos entre o D4
 * e o D11 para entregar no D12 (Doc 6 §4.4).
 */
export async function incrementoDoGrupo(
  db: Db,
  grupoId: string,
  ator: Ator,
  ordemDoDiaCorrente: number,
): Promise<IncrementoMontado | null> {
  const jaLiberado = lte(dias.ordem, ordemDoDiaCorrente)
  const doGrupo = eq(incrementos.grupoId, grupoId)

  const [cabecalho] = await db
    .select({
      id: incrementos.id,
      grupoId: incrementos.grupoId,
      remetente: incrementos.remetente,
      contexto: incrementos.contexto,
      versao: incrementos.versao,
      ordemDeLiberacao: dias.ordem,
    })
    .from(incrementos)
    .innerJoin(dias, eq(dias.id, incrementos.diaDeLiberacaoId))
    .where(ator.papel === 'instrutor' ? doGrupo : and(doGrupo, jaLiberado))
    .limit(1)

  if (!cabecalho) return null

  const valores = await db
    .select({
      modeloOrdem: modelosDeMudanca.ordem,
      modeloRotulo: modelosDeMudanca.rotulo,
      chave: lacunasDoModelo.chave,
      rotulo: lacunasDoModelo.rotulo,
      valor: valoresDaLacuna.valor,
    })
    .from(valoresDaLacuna)
    .innerJoin(lacunasDoModelo, eq(lacunasDoModelo.id, valoresDaLacuna.lacunaId))
    .innerJoin(modelosDeMudanca, eq(modelosDeMudanca.id, lacunasDoModelo.modeloDeMudancaId))
    .where(eq(valoresDaLacuna.incrementoId, cabecalho.id))
    .orderBy(asc(modelosDeMudanca.ordem), asc(lacunasDoModelo.ordem))

  const itens = await db
    .select({ texto: itensImutaveis.texto })
    .from(itensImutaveis)
    .where(eq(itensImutaveis.incrementoId, cabecalho.id))
    .orderBy(asc(itensImutaveis.ordem))

  const porModelo = new Map<number, { rotulo: string; lacunas: typeof valores }>()
  for (const v of valores) {
    const atual = porModelo.get(v.modeloOrdem)
    if (atual) atual.lacunas.push(v)
    else porModelo.set(v.modeloOrdem, { rotulo: v.modeloRotulo, lacunas: [v] })
  }

  return {
    ...cabecalho,
    mudancas: [...porModelo.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, m]) => ({
        rotulo: m.rotulo,
        lacunas: m.lacunas.map((l) => ({ chave: l.chave, rotulo: l.rotulo, valor: l.valor })),
      })),
    itensImutaveis: itens.map((i) => i.texto),
  }
}
