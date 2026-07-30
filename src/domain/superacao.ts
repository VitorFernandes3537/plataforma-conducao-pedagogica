/**
 * Apuração da superação de um obstáculo numa turma (ADR 0005).
 *
 * Puro por construção — não importa framework nem banco (ADR 0001 §7). O que
 * mora aqui é a política, e a política **é dado**: a plataforma não tem opinião
 * sobre avaliar por aluno ou por grupo, nem sobre o que faz um grupo contar
 * quando um integrante superou e o outro não.
 *
 * Essa recusa não é neutralidade preguiçosa. Aluno falta; um integrante se
 * compromete menos que o outro; um par produz junto e outro divide o trabalho
 * pela metade. Qual desses fatos conta como "superou" depende do objetivo do
 * módulo, e é escolha de quem conduz — embutir uma delas no código seria uma
 * constante pedagógica disfarçada de lógica, que o CLAUDE.md §4.3 proíbe.
 */

export type UnidadeDeSuperacao = 'aluno' | 'grupo'

export type CriterioDeSuperacaoDoGrupo = 'todos_os_integrantes' | 'qualquer_integrante'

export type PoliticaDeSuperacao = {
  unidade: UnidadeDeSuperacao
  /** Só existe quando a unidade é `grupo`. */
  criterioDoGrupo: CriterioDeSuperacaoDoGrupo | null
  /** Proporção de unidades superadas a partir da qual a turma pode adiantar. */
  limiar: number
}

/**
 * O resultado de um aluno num obstáculo.
 *
 * `superado` é `null` quando ainda não houve avaliação — que é diferente de ter
 * sido avaliado e não ter superado. A distinção atravessa o módulo inteiro
 * porque, no painel, o aluno esquecido e o aluno que não superou pedem ações
 * opostas do instrutor.
 */
export type ResultadoDoAluno = {
  alunoId: string
  grupoId: string | null
  superado: boolean | null
}

export type Aferido = {
  /** `alunoId` quando a unidade é aluno; `grupoId` quando é grupo. */
  id: string
  superado: boolean
  /** Ainda sem avaliação suficiente para decidir. */
  pendente: boolean
}

export type Apuracao = {
  unidades: readonly Aferido[]
  superadas: number
  pendentes: number
  total: number
  /** Proporção de unidades superadas sobre o total. */
  proporcao: number
  limiarAtingido: boolean
}

/**
 * Reduz os resultados individuais às unidades da política e apura o limiar.
 *
 * Unidade `aluno`: cada aluno é uma unidade, e não existe regra de agregação —
 * a pergunta que trava o painel quando se avalia por grupo simplesmente não é
 * feita.
 *
 * Unidade `grupo`: os integrantes são reduzidos pelo critério configurado.
 * Aluno sem grupo não some — vira a própria unidade, porque um aluno que ainda
 * não foi alocado continua sendo alguém que o limiar precisa contar.
 */
export function apura(
  resultados: readonly ResultadoDoAluno[],
  politica: PoliticaDeSuperacao,
): Apuracao {
  const unidades =
    politica.unidade === 'aluno' ? porAluno(resultados) : porGrupo(resultados, politica)

  const superadas = unidades.filter((u) => u.superado).length
  const pendentes = unidades.filter((u) => u.pendente).length
  const total = unidades.length
  const proporcao = total === 0 ? 0 : superadas / total

  return {
    unidades,
    superadas,
    pendentes,
    total,
    proporcao,
    // Turma vazia não adianta: sem ninguém aferido, "100% superaram" seria
    // verdade vazia, e o limiar existe para proteger a sincronia de uma turma
    // que existe.
    limiarAtingido: total > 0 && proporcao >= politica.limiar,
  }
}

function porAluno(resultados: readonly ResultadoDoAluno[]): Aferido[] {
  return resultados.map((r) => ({
    id: r.alunoId,
    superado: r.superado === true,
    pendente: r.superado === null,
  }))
}

/**
 * Reduz cada grupo a um veredito, pelo critério configurado.
 *
 * Um grupo é pendente enquanto **algum** integrante ainda não foi avaliado e o
 * resultado ainda pode mudar. Com `todos_os_integrantes`, um único "não
 * superou" já decide o grupo e a pendência dos outros deixa de importar; com
 * `qualquer_integrante`, um único "superou" decide. Tratar como pendente o que
 * já está decidido faria o painel pedir ao instrutor um lançamento que não muda
 * nada — e ele tem 180 minutos para 11 grupos.
 */
function porGrupo(
  resultados: readonly ResultadoDoAluno[],
  politica: PoliticaDeSuperacao,
): Aferido[] {
  const porChave = new Map<string, ResultadoDoAluno[]>()

  for (const resultado of resultados) {
    // Aluno sem grupo é a própria unidade: não foi alocado, mas existe.
    const chave = resultado.grupoId ?? `aluno:${resultado.alunoId}`
    const atual = porChave.get(chave)
    if (atual) atual.push(resultado)
    else porChave.set(chave, [resultado])
  }

  const exigeTodos = politica.criterioDoGrupo === 'todos_os_integrantes'

  return [...porChave].map(([id, integrantes]) => {
    const decidiu = integrantes.some((i) => i.superado === (exigeTodos ? false : true))
    const superado = exigeTodos
      ? integrantes.every((i) => i.superado === true)
      : integrantes.some((i) => i.superado === true)

    return {
      id,
      superado,
      pendente: !superado && !decidiu && integrantes.some((i) => i.superado === null),
    }
  })
}
