import { and, asc, desc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { exigeInstrutor } from './fila-de-aprovacao'
import * as schema from './schema'
import { alunos, atribuicoesDeExtensao, dias, obstaculos, usuarios } from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

export type TipoDeAtribuicao = (typeof schema.tipoDeAtribuicaoEnum.enumValues)[number]

/** Erro de regra da atribuição, distinto de falha de banco. */
export class AtribuicaoDeExtensaoInvalida extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'AtribuicaoDeExtensaoInvalida'
  }
}

/**
 * Atribui extensão ou monitoria a um aluno, no dia.
 *
 * As duas resolvem o mesmo problema: quem vence o obstáculo antes do tempo não
 * pode avançar para o seguinte, porque avançar sozinho quebra a sincronia — e é
 * a sincronia que torna possível um instrutor conduzir a turma inteira
 * (Doc 3 §5 · Doc 5 §1.2).
 *
 * O obstáculo vem por parâmetro e o gatilho confere que é o do dia. Poderia ser
 * derivado do dia, mas obrigar quem chama a dizer qual é torna o erro visível na
 * chamada em vez de silencioso no banco.
 *
 * Reatribuir troca o tipo. O instrutor muda de ideia no meio da tarde, e o
 * caminho de correção não pode ser apagar e recriar — três horas de aula não
 * comportam duas atribuições ao mesmo aluno no mesmo dia.
 */
export async function atribui(
  db: Db,
  alunoId: string,
  obstaculoId: string,
  diaId: string,
  tipo: TipoDeAtribuicao,
  instrutorId: string,
): Promise<{ id: string }> {
  await exigeInstrutor(db, instrutorId)

  const [gravada] = await db
    .insert(atribuicoesDeExtensao)
    .values({ alunoId, obstaculoId, diaId, tipo, atribuidoPorId: instrutorId })
    .onConflictDoUpdate({
      target: [atribuicoesDeExtensao.alunoId, atribuicoesDeExtensao.diaId],
      set: { obstaculoId, tipo, atribuidoPorId: instrutorId, atribuidoEm: new Date() },
    })
    .returning({ id: atribuicoesDeExtensao.id })

  if (!gravada) throw new AtribuicaoDeExtensaoInvalida('não foi possível registrar a atribuição')
  return gravada
}

/** Desfaz a atribuição. Quem terminou antes pode ter terminado errado. */
export async function removeAtribuicao(
  db: Db,
  alunoId: string,
  diaId: string,
  instrutorId: string,
): Promise<{ removidas: number }> {
  await exigeInstrutor(db, instrutorId)

  const removidas = await db
    .delete(atribuicoesDeExtensao)
    .where(
      and(eq(atribuicoesDeExtensao.alunoId, alunoId), eq(atribuicoesDeExtensao.diaId, diaId)),
    )
    .returning({ id: atribuicoesDeExtensao.id })

  return { removidas: removidas.length }
}

export type AtribuicaoDoDia = {
  alunoId: string
  nome: string
  tipo: TipoDeAtribuicao
  obstaculoId: string
  /** O texto pré-escrito do aprofundamento, quando o curso escreveu um. */
  extensao: string | null
}

/**
 * Quem está em extensão e quem está em monitoria num dia, numa turma.
 *
 * É a leitura do painel enquanto a aula acontece. Traz o texto da extensão
 * junto porque ele é pré-escrito justamente para o instrutor não precisar
 * decidir em cima da hora (Doc 3, decisão D3-05).
 */
export async function atribuicoesDoDia(
  db: Db,
  turmaId: string,
  diaId: string,
): Promise<AtribuicaoDoDia[]> {
  return db
    .select({
      alunoId: alunos.id,
      nome: usuarios.nome,
      tipo: atribuicoesDeExtensao.tipo,
      obstaculoId: atribuicoesDeExtensao.obstaculoId,
      extensao: obstaculos.extensao,
    })
    .from(atribuicoesDeExtensao)
    .innerJoin(alunos, eq(alunos.id, atribuicoesDeExtensao.alunoId))
    .innerJoin(usuarios, eq(usuarios.id, alunos.usuarioId))
    .innerJoin(obstaculos, eq(obstaculos.id, atribuicoesDeExtensao.obstaculoId))
    .where(and(eq(alunos.turmaId, turmaId), eq(atribuicoesDeExtensao.diaId, diaId)))
    .orderBy(asc(atribuicoesDeExtensao.tipo), asc(usuarios.nome))
}

export type MonitoriaNoHistorico = {
  diaId: string
  ordemDoDia: number
  obstaculoId: string
  pergunta: string
  atribuidoEm: Date
}

/**
 * O histórico de monitoria de um aluno, do mais recente para o mais antigo.
 *
 * Existe para sustentar a rotatividade, que o Doc 3 §5 declara obrigatória: "se
 * virar rotina fixa, o aluno forte para de codar e vira professor não
 * remunerado".
 *
 * A plataforma **mostra**; quem rotaciona é o instrutor. Sugerir quem monitora
 * quem está fora de escopo por decisão da issue — e a razão é que a escolha
 * depende de quem está travado em quê naquela tarde, que é justamente o que o
 * software não sabe.
 */
export async function historicoDeMonitoria(
  db: Db,
  alunoId: string,
): Promise<MonitoriaNoHistorico[]> {
  return db
    .select({
      diaId: atribuicoesDeExtensao.diaId,
      ordemDoDia: dias.ordem,
      obstaculoId: atribuicoesDeExtensao.obstaculoId,
      pergunta: obstaculos.pergunta,
      atribuidoEm: atribuicoesDeExtensao.atribuidoEm,
    })
    .from(atribuicoesDeExtensao)
    .innerJoin(dias, eq(dias.id, atribuicoesDeExtensao.diaId))
    .innerJoin(obstaculos, eq(obstaculos.id, atribuicoesDeExtensao.obstaculoId))
    .where(
      and(
        eq(atribuicoesDeExtensao.alunoId, alunoId),
        eq(atribuicoesDeExtensao.tipo, 'monitoria'),
      ),
    )
    .orderBy(desc(dias.ordem))
}

/**
 * Quantas monitorias cada aluno da turma já fez.
 *
 * A leitura que torna a rotatividade verificável de relance: quem aparece com
 * muito mais que os outros está virando suporte fixo, e o instrutor vê isso
 * antes de atribuir de novo.
 */
export async function monitoriasPorAluno(
  db: Db,
  turmaId: string,
): Promise<{ alunoId: string; nome: string; monitorias: number }[]> {
  const linhas = await db
    .select({ alunoId: alunos.id, nome: usuarios.nome, tipo: atribuicoesDeExtensao.tipo })
    .from(alunos)
    .innerJoin(usuarios, eq(usuarios.id, alunos.usuarioId))
    .leftJoin(atribuicoesDeExtensao, eq(atribuicoesDeExtensao.alunoId, alunos.id))
    .where(eq(alunos.turmaId, turmaId))

  const contagem = new Map<string, { nome: string; monitorias: number }>()
  for (const linha of linhas) {
    const atual = contagem.get(linha.alunoId) ?? { nome: linha.nome, monitorias: 0 }
    if (linha.tipo === 'monitoria') atual.monitorias += 1
    contagem.set(linha.alunoId, atual)
  }

  // Todos os alunos aparecem, inclusive os que nunca monitoraram — é justamente
  // quem nunca apareceu que a rotatividade precisa alcançar.
  return [...contagem]
    .map(([alunoId, dados]) => ({ alunoId, ...dados }))
    .sort((a, b) => b.monitorias - a.monitorias || a.nome.localeCompare(b.nome))
}
