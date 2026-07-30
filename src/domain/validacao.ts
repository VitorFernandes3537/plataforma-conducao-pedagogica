/**
 * Motor de validação automática do formulário de escopo (Doc 2 §4.6).
 *
 * É um INTERPRETADOR de regras que moram como dado, não um schema. A ADR 0001
 * §5 é explícita sobre isso: as validações são declaradas na pergunta, e
 * escrever a faixa em código seria o literal com significado pedagógico que a
 * regra 4.3 do CLAUDE.md proíbe.
 *
 * Puro por construção — não importa framework nem banco (ADR 0001 §7). O motor
 * recebe as respostas e as regras já carregadas, e devolve as reprovações.
 *
 * Funciona como PRÉ-FILTRO: o formulário só chega ao instrutor depois de
 * passar. Isso preserva o tempo humano para os quatro julgamentos que o
 * Doc 2 §4.6 declara não automatizáveis — se a resposta descreve um evento, se
 * as fórmulas diferem em estrutura, se o recurso é finito, se a imutabilidade
 * é de negócio. Nenhum deles é tentado aqui.
 */

export type Regra = {
  perguntaId: string
  tipo: 'nao_vazio' | 'contagem_de_itens' | 'referencia_declarada' | 'lista_negra'
  minimo: number | null
  maximo: number | null
  perguntaDeReferenciaId: string | null
  termos: readonly string[] | null
  mensagem: string
}

export type RespostaParaValidar = {
  perguntaId: string
  texto: string
}

export type Reprovacao = {
  perguntaId: string
  tipo: Regra['tipo']
  mensagem: string
}

/**
 * Itens de uma resposta: uma linha, um item.
 *
 * É convenção de formato, não quantidade pedagógica — o aluno lista estados,
 * categorias ou exclusões uma por linha. Linha vazia não conta, para que
 * espaçamento não altere contagem.
 */
export function itensDaResposta(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
}

function aplicaNaoVazio(resposta: RespostaParaValidar | undefined): boolean {
  return resposta !== undefined && resposta.texto.trim().length > 0
}

/**
 * Executa as regras contra as respostas.
 *
 * Devolve TODAS as reprovações, não a primeira. O aluno tem 65 minutos para
 * preencher e não pode descobrir um erro por vez.
 */
export function valida(
  respostas: readonly RespostaParaValidar[],
  regras: readonly Regra[],
): Reprovacao[] {
  const porPergunta = new Map(respostas.map((r) => [r.perguntaId, r]))
  const reprovacoes: Reprovacao[] = []

  for (const regra of regras) {
    const resposta = porPergunta.get(regra.perguntaId)

    // Resposta ausente ou em branco reprova qualquer regra: não há o que
    // avaliar, e deixar passar mandaria formulário vazio para a fila.
    if (!aplicaNaoVazio(resposta)) {
      reprovacoes.push({
        perguntaId: regra.perguntaId,
        tipo: regra.tipo,
        mensagem: regra.mensagem,
      })
      continue
    }
  }

  return reprovacoes
}

/** Passou no pré-filtro? É o que decide se o formulário chega ao instrutor. */
export function aprovadoNoPreFiltro(reprovacoes: readonly Reprovacao[]): boolean {
  return reprovacoes.length === 0
}
