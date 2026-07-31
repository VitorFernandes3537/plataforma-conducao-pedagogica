import { and, asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeProducaoPropria } from './ator'
import { garanteRegistroDiario } from './registro-diario'
import * as schema from './schema'
import { alunos, dias, registrosDeRecuperacao, registrosDiarios, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do registro de recuperação, distinto de falha de banco. */
export class RecuperacaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'RecuperacaoInvalida'
  }
}

/**
 * Por quem a reposição aconteceu.
 *
 * O Doc 5 §3.2 lista quatro fontes e só duas são pessoas. Um tipo com duas
 * formas é mais honesto que um campo de texto onde caberia "pelo Bruno" e
 * "pelo repositório" indistinguíveis — o instrutor precisa poder perguntar quem
 * ajudou quem, e texto livre não responde isso.
 */
export type PorQuem = { colegaId: string } | { fonte: string }

export type Reposicao = {
  oQuePerdeu: string
  oQueRepos: string
  porQuem: PorQuem
}

export type RecuperacaoRegistrada = {
  id: string
  diaId: string
  ordemDoDia: number
  oQuePerdeu: string
  oQueRepos: string
  colega: { alunoId: string; nome: string } | null
  fonteDeReposicao: string | null
  registradoEm: Date
}

/**
 * Registra uma recuperação de um aluno num dia.
 *
 * Cinco campos, nenhum opcional (Doc 5 §3.3). São 30 segundos de custo para o
 * aluno, e um registro com metade preenchida não responde à pergunta que o
 * instrutor faz — quem está de fato acompanhando.
 *
 * Não é idempotente de propósito: quem perdeu duas coisas e repôs de formas
 * diferentes registra duas vezes. O documento diz "por aluno e por dia", que é
 * onde o registro pendura, não quantos cabem.
 */
export async function registraRecuperacao(
  db: Db,
  alunoId: string,
  diaId: string,
  reposicao: Reposicao,
  autorId: string,
): Promise<{ id: string }> {
  await exigeProducaoPropria(db, autorId, alunoId)

  const oQuePerdeu = reposicao.oQuePerdeu.trim()
  const oQueRepos = reposicao.oQueRepos.trim()

  if (oQuePerdeu.length === 0) {
    throw new RecuperacaoInvalida('o registro exige dizer o que foi perdido')
  }
  if (oQueRepos.length === 0) {
    throw new RecuperacaoInvalida('o registro exige dizer o que foi reposto')
  }

  const porQuem = normalizaPorQuem(reposicao.porQuem)
  const registro = await garanteRegistroDiario(db, alunoId, diaId)

  const [gravado] = await db
    .insert(registrosDeRecuperacao)
    .values({ registroDiarioId: registro.id, oQuePerdeu, oQueRepos, ...porQuem })
    .returning({ id: registrosDeRecuperacao.id })

  if (!gravado) throw new RecuperacaoInvalida('não foi possível registrar a recuperação')
  return gravado
}

function normalizaPorQuem(
  porQuem: PorQuem,
): { repostoPorAlunoId: string; fonteDeReposicao: null } | { repostoPorAlunoId: null; fonteDeReposicao: string } {
  if ('colegaId' in porQuem) {
    return { repostoPorAlunoId: porQuem.colegaId, fonteDeReposicao: null }
  }

  const fonte = porQuem.fonte.trim()
  if (fonte.length === 0) {
    throw new RecuperacaoInvalida('o registro exige dizer por quem, ou por qual fonte')
  }
  return { repostoPorAlunoId: null, fonteDeReposicao: fonte }
}

/**
 * Todas as recuperações de um aluno, em ordem de dia.
 *
 * É a leitura que o instrutor faz antes da triagem dos marcos (Doc 5 §3.3): não
 * "quantas vezes faltou", e sim o que perdeu e como repôs. Por isso a consulta
 * devolve o texto, não uma contagem — e por isso nada aqui calcula limiar.
 *
 * O nome do colega vem junto: "por quem" só informa se for legível, e o
 * instrutor está lendo isso entre dois blocos de aula.
 */
export async function recuperacoesDoAluno(
  db: Db,
  alunoId: string,
): Promise<RecuperacaoRegistrada[]> {
  const colega = alunos
  return db
    .select({
      id: registrosDeRecuperacao.id,
      diaId: dias.id,
      ordemDoDia: dias.ordem,
      oQuePerdeu: registrosDeRecuperacao.oQuePerdeu,
      oQueRepos: registrosDeRecuperacao.oQueRepos,
      colegaAlunoId: colega.id,
      colegaNome: usuarios.nome,
      fonteDeReposicao: registrosDeRecuperacao.fonteDeReposicao,
      registradoEm: registrosDeRecuperacao.registradoEm,
    })
    .from(registrosDeRecuperacao)
    .innerJoin(registrosDiarios, eq(registrosDiarios.id, registrosDeRecuperacao.registroDiarioId))
    .innerJoin(dias, eq(dias.id, registrosDiarios.diaId))
    .leftJoin(colega, eq(colega.id, registrosDeRecuperacao.repostoPorAlunoId))
    .leftJoin(usuarios, eq(usuarios.id, colega.usuarioId))
    .where(eq(registrosDiarios.alunoId, alunoId))
    .orderBy(asc(dias.ordem), asc(registrosDeRecuperacao.registradoEm))
    .then((linhas) =>
      linhas.map((l) => ({
        id: l.id,
        diaId: l.diaId,
        ordemDoDia: l.ordemDoDia,
        oQuePerdeu: l.oQuePerdeu,
        oQueRepos: l.oQueRepos,
        colega:
          l.colegaAlunoId && l.colegaNome ? { alunoId: l.colegaAlunoId, nome: l.colegaNome } : null,
        fonteDeReposicao: l.fonteDeReposicao,
        registradoEm: l.registradoEm,
      })),
    )
}

/**
 * As recuperações de uma turma inteira num dia.
 *
 * Complementa a leitura por aluno: na janela de 20 minutos da abertura, o
 * instrutor olha a turma, não um aluno por vez.
 *
 * O NOME vem junto. A consulta devolvia só `alunoId`, e a tela teria de exibir
 * uuid — o mesmo defeito que `lancamentoDoDia` e `filaDoInstrutor` já tiveram:
 * passa no teste e falha na sala, porque ninguém reconhece um aluno por id.
 */
export async function recuperacoesDaTurmaNoDia(
  db: Db,
  turmaId: string,
  diaId: string,
): Promise<{ alunoId: string; nome: string; oQuePerdeu: string; oQueRepos: string }[]> {
  return db
    .select({
      alunoId: registrosDiarios.alunoId,
      nome: usuarios.nome,
      oQuePerdeu: registrosDeRecuperacao.oQuePerdeu,
      oQueRepos: registrosDeRecuperacao.oQueRepos,
    })
    .from(registrosDeRecuperacao)
    .innerJoin(registrosDiarios, eq(registrosDiarios.id, registrosDeRecuperacao.registroDiarioId))
    .innerJoin(alunos, eq(alunos.id, registrosDiarios.alunoId))
    .innerJoin(usuarios, eq(usuarios.id, alunos.usuarioId))
    .where(and(eq(alunos.turmaId, turmaId), eq(registrosDiarios.diaId, diaId)))
    .orderBy(asc(registrosDeRecuperacao.registradoEm))
}
