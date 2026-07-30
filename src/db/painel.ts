import { and, asc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { apura, type Apuracao, type PoliticaDeSuperacao } from '@/domain/superacao'

import * as schema from './schema'
import {
  alunos,
  avaliacoesDeObstaculo,
  cursos,
  dias,
  niveisDeAvaliacao,
  obstaculos,
  registrosDiarios,
  turmas,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/** Erro de regra do painel, distinto de falha de banco. */
export class PainelIndisponivel extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'PainelIndisponivel'
  }
}

export type PainelDoDia = {
  diaId: string
  ordemDoDia: number
  obstaculoId: string | null
  pergunta: string | null
  politica: PoliticaDeSuperacao
  apuracao: Apuracao
}

/**
 * A política de superação de um curso, lida de onde ela mora.
 *
 * Nenhum valor aqui tem padrão em código: a proporção, a unidade e o critério
 * de grupo são colunas de `cursos` porque são escolha de quem conduz o módulo
 * (ADR 0005). Um `?? 0.8` nesta função seria a plataforma decidindo por ele.
 */
export async function politicaDoCurso(db: Db, cursoId: string): Promise<PoliticaDeSuperacao> {
  const [curso] = await db
    .select({
      limiar: cursos.limiarDeAdiantamento,
      unidade: cursos.unidadeDeSuperacao,
      criterioDoGrupo: cursos.criterioDeSuperacaoDoGrupo,
    })
    .from(cursos)
    .where(eq(cursos.id, cursoId))
    .limit(1)

  if (!curso) throw new PainelIndisponivel('curso não encontrado')
  return curso
}

/**
 * O painel do instrutor para um dia.
 *
 * Um instrutor, 180 minutos, a turma inteira: a tela responde uma pergunta só —
 * quantas unidades superaram o obstáculo de hoje, e isso já basta para adiantar?
 *
 * O obstáculo vem do DIA, não de um parâmetro: o calendário sabe qual é o
 * obstáculo de hoje (Doc 4 é o dono), e obrigar a tela a escolher abriria a
 * porta para o painel de um dia mostrar o obstáculo de outro.
 *
 * Dia sem obstáculo — abertura, marco, fechamento — devolve apuração vazia em
 * vez de erro. Não é falha: é um dia que não tem o que superar, e a tela precisa
 * dizer isso em vez de parecer quebrada.
 */
export async function painelDoDia(db: Db, turmaId: string, diaId: string): Promise<PainelDoDia> {
  const [contexto] = await db
    .select({
      cursoId: turmas.cursoId,
      diaCursoId: dias.cursoId,
      ordemDoDia: dias.ordem,
      obstaculoId: dias.obstaculoId,
      pergunta: obstaculos.pergunta,
    })
    .from(turmas)
    .innerJoin(dias, eq(dias.id, diaId))
    .leftJoin(obstaculos, eq(obstaculos.id, dias.obstaculoId))
    .where(eq(turmas.id, turmaId))
    .limit(1)

  if (!contexto) throw new PainelIndisponivel('turma ou dia não encontrado')
  if (contexto.cursoId !== contexto.diaCursoId) {
    throw new PainelIndisponivel('o dia não pertence ao curso desta turma')
  }

  const politica = await politicaDoCurso(db, contexto.cursoId)

  // A matrícula vem sempre, o resultado só quando existe. É o `left join` que
  // faz o aluno sem avaliação aparecer como pendente em vez de sumir — e sumir
  // seria a diferença entre "ninguém olhou" e "não superou" desaparecendo da
  // única tela que o instrutor tem tempo de abrir.
  const resultados = contexto.obstaculoId
    ? await db
        .select({
          alunoId: alunos.id,
          grupoId: alunos.grupoId,
          superado: niveisDeAvaliacao.contaComoSuperacao,
        })
        .from(alunos)
        .leftJoin(
          registrosDiarios,
          and(eq(registrosDiarios.alunoId, alunos.id), eq(registrosDiarios.diaId, diaId)),
        )
        .leftJoin(
          avaliacoesDeObstaculo,
          and(
            eq(avaliacoesDeObstaculo.registroDiarioId, registrosDiarios.id),
            eq(avaliacoesDeObstaculo.obstaculoId, contexto.obstaculoId),
          ),
        )
        .leftJoin(niveisDeAvaliacao, eq(niveisDeAvaliacao.id, avaliacoesDeObstaculo.nivelId))
        .where(eq(alunos.turmaId, turmaId))
        .orderBy(asc(alunos.grupoId), asc(alunos.posicaoNoGrupo))
    : []

  return {
    diaId,
    ordemDoDia: contexto.ordemDoDia,
    obstaculoId: contexto.obstaculoId,
    pergunta: contexto.pergunta,
    politica,
    apuracao: apura(resultados, politica),
  }
}

/**
 * A leitura que o instrutor faz andando pela sala: um obstáculo por dia, do
 * primeiro dia até o corrente.
 *
 * Mostra os dias sem obstáculo também, com apuração vazia — o calendário é
 * contínuo, e um buraco na lista pareceria dado faltando.
 */
export async function painelAcumulado(
  db: Db,
  turmaId: string,
  ateDiaId: string,
): Promise<PainelDoDia[]> {
  const [ate] = await db
    .select({ cursoId: dias.cursoId, ordem: dias.ordem })
    .from(dias)
    .where(eq(dias.id, ateDiaId))
    .limit(1)

  if (!ate) throw new PainelIndisponivel('dia não encontrado')

  const doCurso = await db
    .select({ id: dias.id, ordem: dias.ordem })
    .from(dias)
    .where(eq(dias.cursoId, ate.cursoId))
    .orderBy(asc(dias.ordem))

  const paineis: PainelDoDia[] = []
  for (const dia of doCurso.filter((d) => d.ordem <= ate.ordem)) {
    paineis.push(await painelDoDia(db, turmaId, dia.id))
  }
  return paineis
}
