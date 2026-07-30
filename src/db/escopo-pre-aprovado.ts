import { and, asc, eq, isNull, ne } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import type { Ator } from '@/domain/autorizacao'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import { bancosDeTemas, escoposPreAprovados, grupos, respostasDeEscopo, temas } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type EscopoListado = {
  id: string
  titulo: string
  temaId: string
  temaNome: string
  grupoId: string | null
}

/**
 * Erro de regra de negócio da atribuição.
 *
 * Nomeado para o adaptador HTTP poder distinguir "o instrutor tentou algo
 * inválido" de "o banco caiu".
 */
export class AtribuicaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'AtribuicaoInvalida'
  }
}

/**
 * Escopos pré-aprovados de um curso, visíveis para o ator.
 *
 * O instrutor vê todos, usados e de reserva — é a rede dele, e ele precisa
 * saber quantas sobraram. O aluno vê **apenas o que foi atribuído ao próprio
 * grupo**: escopo de reserva não usado não aparece para aluno nenhum, senão a
 * turma descobre que existe saída fácil e o marco deixa de ser duro
 * (Doc 5 §5.1).
 *
 * O filtro é SQL, não memória: escopo de reserva não pode chegar ao navegador
 * do aluno nem dentro de uma resposta que a tela ignora.
 */
export async function escoposVisiveis(
  db: Db,
  cursoId: string,
  ator: Ator,
): Promise<EscopoListado[]> {
  const doCurso = eq(bancosDeTemas.cursoId, cursoId)

  const selecao = db
    .select({
      id: escoposPreAprovados.id,
      titulo: escoposPreAprovados.titulo,
      temaId: escoposPreAprovados.temaId,
      temaNome: temas.nome,
      grupoId: escoposPreAprovados.grupoId,
    })
    .from(escoposPreAprovados)
    .innerJoin(temas, eq(temas.id, escoposPreAprovados.temaId))
    .innerJoin(bancosDeTemas, eq(bancosDeTemas.id, temas.bancoDeTemasId))

  if (ator.papel === 'instrutor') {
    return selecao.where(doCurso).orderBy(asc(temas.nome))
  }

  // Aluno sem grupo nunca vê escopo de reserva.
  if (ator.grupoId === null) return []

  return selecao
    .where(and(doCurso, eq(escoposPreAprovados.grupoId, ator.grupoId)))
    .orderBy(asc(temas.nome))
}

/** Só os que ainda estão de reserva. É o que o instrutor conta antes do marco. */
export async function escoposDeReserva(db: Db, cursoId: string): Promise<EscopoListado[]> {
  return db
    .select({
      id: escoposPreAprovados.id,
      titulo: escoposPreAprovados.titulo,
      temaId: escoposPreAprovados.temaId,
      temaNome: temas.nome,
      grupoId: escoposPreAprovados.grupoId,
    })
    .from(escoposPreAprovados)
    .innerJoin(temas, eq(temas.id, escoposPreAprovados.temaId))
    .innerJoin(bancosDeTemas, eq(bancosDeTemas.id, temas.bancoDeTemasId))
    .where(and(eq(bancosDeTemas.cursoId, cursoId), isNull(escoposPreAprovados.grupoId)))
    .orderBy(asc(temas.nome))
}

/**
 * Quem entregou e sob qual formulário, quando a atribuição também precisa
 * deixar o escopo do grupo aprovado.
 *
 * O formulário vem de fora, como em `abreRascunho`: qual formulário o curso usa
 * é escolha da tela, não fato que esta função possa adivinhar quando o curso tem
 * mais de um.
 */
export type Entrega = { instrutorId: string; formularioId: string }

/**
 * Atribui um escopo pré-aprovado a um grupo.
 *
 * Aloca o tema do escopo ao grupo e marca o escopo como usado, numa
 * transação: alocar o tema sem marcar o escopo deixaria a rede do instrutor
 * mentindo sobre quantas reservas restam.
 *
 * A unicidade "um tema por grupo por turma" (Doc 7 §2.4) é garantida pelo
 * índice único parcial, não por leitura prévia — validar em código perderia a
 * corrida entre dois grupos recebendo escopo ao mesmo tempo.
 *
 * Com `entrega`, o escopo do grupo já nasce **aprovado**: o pré-aprovado é a
 * rede do instrutor num marco em que o grupo não passou (Doc 5 §5.1), e mandá-lo
 * para a fila de aprovação seria pedir aprovação do que já vem aprovado. Sem
 * `entrega`, apenas o tema é alocado — é o que a tela usa quando só quer
 * reservar antes do marco.
 */
export async function atribuiEscopo(
  db: Db,
  escopoId: string,
  grupoId: string,
  entrega?: Entrega,
): Promise<{ temaId: string }> {
  return db.transaction(async (tx) => {
    const [escopo] = await tx
      .select({ id: escoposPreAprovados.id, temaId: escoposPreAprovados.temaId, grupoId: escoposPreAprovados.grupoId })
      .from(escoposPreAprovados)
      .where(eq(escoposPreAprovados.id, escopoId))
      .limit(1)

    if (!escopo) throw new AtribuicaoInvalida('escopo pré-aprovado não existe')
    if (escopo.grupoId !== null) {
      throw new AtribuicaoInvalida('escopo pré-aprovado já foi atribuído a outro grupo')
    }

    const [grupo] = await tx
      .select({ id: grupos.id, temaId: grupos.temaId })
      .from(grupos)
      .where(eq(grupos.id, grupoId))
      .limit(1)

    if (!grupo) throw new AtribuicaoInvalida('grupo não existe')
    if (grupo.temaId !== null) {
      throw new AtribuicaoInvalida('grupo já tem tema alocado')
    }

    await tx.update(grupos).set({ temaId: escopo.temaId }).where(eq(grupos.id, grupoId))
    await tx
      .update(escoposPreAprovados)
      .set({ grupoId, atribuidoEm: new Date() })
      .where(eq(escoposPreAprovados.id, escopoId))

    if (entrega) await aprovaNaEntrega(tx, grupoId, entrega)

    return { temaId: escopo.temaId }
  })
}

/**
 * Deixa o escopo do grupo aprovado, no ato da atribuição.
 *
 * O conteúdo autoritativo é `escoposPreAprovados.conteudo`: o grupo não
 * respondeu nada, e criar respostas por pergunta em nome dele faria a tela
 * mostrar como resposta do grupo um texto que o instrutor escreveu antes do D1.
 *
 * `submetidoEm` recebe o instante da atribuição porque a atribuição **é** a
 * entrega neste caminho — e o CHECK `estado_coerente_com_submissao` não admite
 * escopo fora de rascunho sem data.
 *
 * Um rascunho já começado é aproveitado, não duplicado: `respostasDeEscopo` tem
 * unicidade por grupo, e o grupo que tentou e não passou é justamente quem
 * recebe a rede.
 */
async function aprovaNaEntrega(
  tx: Db,
  grupoId: string,
  { instrutorId, formularioId }: Entrega,
): Promise<void> {
  await exigeInstrutor(tx, instrutorId)

  const agora = new Date()
  const decisao = {
    estado: 'aprovado' as const,
    submetidoEm: agora,
    decididoEm: agora,
    decididoPorId: instrutorId,
    motivoDaDevolucao: null,
  }

  const gravadas = await tx
    .insert(respostasDeEscopo)
    .values({ grupoId, formularioId, ...decisao })
    .onConflictDoUpdate({
      target: respostasDeEscopo.grupoId,
      set: decisao,
      // Escopo já aprovado não se reaprova: seria a segunda rede para o mesmo
      // grupo, e o instrutor perderia a conta de quantas usou.
      setWhere: ne(respostasDeEscopo.estado, 'aprovado'),
    })
    .returning({ id: respostasDeEscopo.id })

  if (gravadas.length === 0) {
    throw new AtribuicaoInvalida('o escopo deste grupo já está aprovado')
  }
}
