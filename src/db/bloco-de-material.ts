import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import type { Ator } from '@/domain/autorizacao'

import { exigeProducaoPropria } from './ator'
import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import { blocosDeMaterial, dias, materiaisInterativos, respostasDeBloco } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type TipoDeBloco = (typeof schema.tipoDeBlocoEnum.enumValues)[number]

/** Erro de regra do bloco de material, distinto de falha de banco. */
export class BlocoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'BlocoInvalido'
  }
}

export type BlocoVisivel = {
  id: string
  ordem: number
  tipo: TipoDeBloco
  conteudo: string
  /** Só vem depois de o aluno responder. Nulo antes disso, e para quem não é dono. */
  conteudoRevelado: string | null
  /** O aluno já respondeu este bloco. */
  respondido: boolean
  /** O agregado da turma pode ser mostrado. */
  agregadoLiberado: boolean
}

/**
 * Os blocos de uma lâmina, do ponto de vista de quem está olhando.
 *
 * Três coisas acontecem aqui, e as três são de CONSULTA e não de tela:
 *
 * 1. Bloco oculto até um dia não vem antes desse dia. Mostrado cedo, ele entrega
 *    a descoberta que um obstáculo posterior existe para produzir — e esconder
 *    na interface é esconder de quem não abre o inspetor.
 * 2. `conteudoRevelado` só vem depois de o próprio aluno responder. É o
 *    "resultado individual só após submissão" do Doc 11 §11, e a plataforma
 *    segura o texto sem saber o que ele diz.
 * 3. O agregado da turma só é declarado liberado depois que o instrutor libera.
 *
 * O instrutor vê tudo: é ele quem conduz, e quem libera.
 */
export async function blocosVisiveis(
  db: Db,
  materialInterativoId: string,
  ator: Ator,
  contexto: { ordemDoDiaCorrente: number; alunoId: string | null },
): Promise<BlocoVisivel[]> {
  const ehInstrutor = ator.papel === 'instrutor'

  const jaChegouODia = or(
    isNull(blocosDeMaterial.ocultoAteDiaId),
    lte(dias.ordem, contexto.ordemDoDiaCorrente),
  )

  const linhas = await db
    .select({
      id: blocosDeMaterial.id,
      ordem: blocosDeMaterial.ordem,
      tipo: blocosDeMaterial.tipo,
      conteudo: blocosDeMaterial.conteudo,
      conteudoRevelado: blocosDeMaterial.conteudoRevelado,
      agregadoLiberadoEm: blocosDeMaterial.agregadoLiberadoEm,
      respostaId: respostasDeBloco.id,
    })
    .from(blocosDeMaterial)
    .leftJoin(dias, eq(dias.id, blocosDeMaterial.ocultoAteDiaId))
    .leftJoin(
      respostasDeBloco,
      and(
        eq(respostasDeBloco.blocoId, blocosDeMaterial.id),
        // Sem aluno no contexto — o instrutor conduzindo, por exemplo — não há
        // resposta própria a casar. `false` desliga o lado direito do join em
        // vez de comparar um uuid com string vazia, que o banco recusa.
        contexto.alunoId ? eq(respostasDeBloco.alunoId, contexto.alunoId) : sql`false`,
      ),
    )
    .where(
      ehInstrutor
        ? eq(blocosDeMaterial.materialInterativoId, materialInterativoId)
        : and(eq(blocosDeMaterial.materialInterativoId, materialInterativoId), jaChegouODia),
    )
    .orderBy(asc(blocosDeMaterial.ordem))

  return linhas.map((l) => {
    const respondido = l.respostaId !== null
    return {
      id: l.id,
      ordem: l.ordem,
      tipo: l.tipo,
      conteudo: l.conteudo,
      // O instrutor conduz a revelação; o aluno só vê depois de responder.
      conteudoRevelado: ehInstrutor || respondido ? l.conteudoRevelado : null,
      respondido,
      agregadoLiberado: l.agregadoLiberadoEm !== null,
    }
  })
}

/**
 * Registra a resposta de um aluno a um bloco interativo.
 *
 * Responder é o que destranca o `conteudoRevelado` para ele — e só para ele.
 * Antes disso a plataforma não mostra o gabarito, mesmo sem saber qual é.
 *
 * Reescrever é permitido: a aula é presencial, o aluno erra o clique, e travar a
 * primeira resposta transformaria um engano em dado. O instante da última
 * resposta é o que fica.
 */
export async function respondeBloco(
  db: Db,
  blocoId: string,
  alunoId: string,
  resposta: string,
  autorId: string,
): Promise<{ id: string }> {
  await exigeProducaoPropria(db, autorId, alunoId)

  const limpa = resposta.trim()
  if (limpa.length === 0) {
    throw new BlocoInvalido('a resposta não pode ser vazia')
  }

  const [gravada] = await db
    .insert(respostasDeBloco)
    .values({ blocoId, alunoId, resposta: limpa })
    .onConflictDoUpdate({
      target: [respostasDeBloco.blocoId, respostasDeBloco.alunoId],
      set: { resposta: limpa, submetidoEm: new Date() },
    })
    .returning({ id: respostasDeBloco.id })

  if (!gravada) throw new BlocoInvalido('não foi possível registrar a resposta')
  return gravada
}

/**
 * Libera o agregado da turma de um bloco.
 *
 * "Agregado exibido só após liberação do instrutor" (Doc 11 §11). Mostrar antes
 * faria o aluno responder olhando a maioria, e a predição deixaria de medir
 * predição — que é a única coisa que ela mede.
 */
export async function liberaAgregado(
  db: Db,
  blocoId: string,
  instrutorId: string,
): Promise<{ liberadoEm: Date }> {
  await exigeInstrutor(db, instrutorId)

  const [liberado] = await db
    .update(blocosDeMaterial)
    .set({ agregadoLiberadoEm: new Date() })
    .where(and(eq(blocosDeMaterial.id, blocoId), isNull(blocosDeMaterial.agregadoLiberadoEm)))
    .returning({ liberadoEm: blocosDeMaterial.agregadoLiberadoEm })

  if (!liberado?.liberadoEm) {
    throw new BlocoInvalido('bloco não encontrado, ou agregado já liberado')
  }
  return { liberadoEm: liberado.liberadoEm }
}

export type AgregadoDoBloco = {
  /** Quantas vezes cada resposta apareceu, da mais escolhida para a menos. */
  distribuicao: readonly { resposta: string; quantidade: number }[]
  respondentes: number
}

/**
 * A distribuição das respostas da turma, se já liberada.
 *
 * Devolve nulo enquanto o instrutor não libera, e o nulo é a resposta — não um
 * agregado vazio, que o aluno leria como "ninguém respondeu".
 *
 * O instrutor vê antes: é ele quem decide o momento de mostrar, e para decidir
 * precisa saber o que vai aparecer.
 */
export async function agregadoDoBloco(
  db: Db,
  blocoId: string,
  ator: Ator,
): Promise<AgregadoDoBloco | null> {
  const [bloco] = await db
    .select({ liberadoEm: blocosDeMaterial.agregadoLiberadoEm })
    .from(blocosDeMaterial)
    .where(eq(blocosDeMaterial.id, blocoId))
    .limit(1)

  if (!bloco) throw new BlocoInvalido('bloco não encontrado')
  if (ator.papel !== 'instrutor' && bloco.liberadoEm === null) return null

  const respostas = await db
    .select({ resposta: respostasDeBloco.resposta })
    .from(respostasDeBloco)
    .where(eq(respostasDeBloco.blocoId, blocoId))

  const contagem = new Map<string, number>()
  for (const { resposta } of respostas) {
    contagem.set(resposta, (contagem.get(resposta) ?? 0) + 1)
  }

  return {
    distribuicao: [...contagem]
      .map(([resposta, quantidade]) => ({ resposta, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.resposta.localeCompare(b.resposta)),
    respondentes: respostas.length,
  }
}

/**
 * A lâmina com os blocos que ela tem — e uma lâmina pode não ter nenhum.
 *
 * Material cadastrado antes desta issue continua válido e continua sendo
 * exibido pelo `conteudo` da própria lâmina. O bloco é adição, não substituição:
 * o Doc 7 v1.4 registra a mudança como "adição, nada removido nem renomeado".
 */
export async function laminaComBlocos(
  db: Db,
  materialInterativoId: string,
  ator: Ator,
  contexto: { ordemDoDiaCorrente: number; alunoId: string | null },
): Promise<{ titulo: string; conteudo: string; blocos: BlocoVisivel[] } | null> {
  const [lamina] = await db
    .select({ titulo: materiaisInterativos.titulo, conteudo: materiaisInterativos.conteudo })
    .from(materiaisInterativos)
    .where(eq(materiaisInterativos.id, materialInterativoId))
    .limit(1)

  if (!lamina) return null

  return { ...lamina, blocos: await blocosVisiveis(db, materialInterativoId, ator, contexto) }
}
