/**
 * Agregação da rubrica (`D6-EIXOS` · Doc 6 §1.1 e §0.3).
 *
 * "A nota do D15 é agregação, não correção": toda evidência já foi capturada ao
 * vivo, e o que acontece aqui é aritmética sobre o que existe. Nada nesta
 * função avalia coisa alguma — se um eixo está vazio, a resposta é que falta
 * dado, não que a nota é zero.
 *
 * Puro por construção (ADR 0001 §7). Nenhum peso, nenhuma escala e nenhuma
 * quantidade mora aqui: tudo chega como dado, porque o Doc 6 §13 entrega os
 * pesos ao Doc 7 como configuráveis e a escala é dado desde a ADR 0004.
 */

export type UnidadeDoEixo = 'aluno' | 'grupo'

export type EixoDeclarado = {
  eixoId: string
  nome: string
  peso: number
  unidade: UnidadeDoEixo
}

/** Uma nota que entra num eixo, com o peso do item que a produziu. */
export type ItemPontuado = {
  /** O valor do nível lançado. */
  valor: number
  /** O peso do item. No eixo do modelo, é o peso do obstáculo. */
  peso: number
}

export type ApuracaoDeEixo = {
  eixoId: string
  nome: string
  peso: number
  unidade: UnidadeDoEixo
  /** Proporção de 0 a 1 do máximo possível. Nulo quando não há nota nenhuma. */
  proporcao: number | null
  itens: number
  /**
   * O que a defesa oral registrou para este eixo, quando registrou.
   *
   * Vem ao lado da proporção e **não é aplicado**. O Doc 6 §6 diz que as
   * respostas ajustam "para cima ou para baixo" sem dizer quanto, e inventar o
   * tamanho do ajuste seria inventar fato. A exceção é o copiloto, cujo eixo do
   * modelo já chega aqui vindo da defesa (Doc 6 §9.1).
   */
  proporcaoDaDefesa: number | null
}

export type NotaAgregada = {
  eixos: readonly ApuracaoDeEixo[]
  /** Proporção final de 0 a 1, ponderada pelos pesos dos eixos. */
  proporcao: number | null
  /** Todos os eixos têm nota. Falso significa que falta capturar, não que é zero. */
  completa: boolean
}

/**
 * Média dos itens, ponderada pelo peso de cada um, normalizada pelo teto.
 *
 * É onde "o obstáculo pesa o dobro" acontece — e acontece por dado: o peso vem
 * do obstáculo, e o Doc 7 §2.4 é explícito ao dizer que ele é campo, não flag
 * de "central". Uma flag só conseguiria dizer que existe um item mais
 * importante, e obrigaria o código a saber quanto isso vale.
 *
 * `valorMaximo` também é dado: é o maior nível da escala do curso, e uma escala
 * de cinco níveis normaliza por cinco sem tocar em código.
 */
export function proporcaoDoEixo(
  itens: readonly ItemPontuado[],
  valorMaximo: number,
): number | null {
  if (itens.length === 0) return null
  if (valorMaximo <= 0) return null

  const pesoTotal = itens.reduce((soma, i) => soma + i.peso, 0)
  if (pesoTotal <= 0) return null

  const obtido = itens.reduce((soma, i) => soma + i.valor * i.peso, 0)
  return obtido / (pesoTotal * valorMaximo)
}

/**
 * Combina os eixos numa proporção final.
 *
 * Divide pela soma dos pesos em vez de exigir que ela dê 1. O Doc 6 usa 50, 30 e
 * 20, mas exigir que somem cem seria uma regra que nenhum documento escreveu — e
 * um curso com quatro eixos teria de recalcular os quatro para mexer em um.
 *
 * Eixo sem nota não entra na conta e não vira zero. A diferença importa: zero é
 * uma afirmação sobre o aluno, e "ainda não capturamos" é uma afirmação sobre o
 * instrutor. `completa` diz qual das duas está acontecendo.
 */
export function agrega(apuracoes: readonly ApuracaoDeEixo[]): NotaAgregada {
  const comNota = apuracoes.filter((e) => e.proporcao !== null)
  const pesoTotal = comNota.reduce((soma, e) => soma + e.peso, 0)

  return {
    eixos: apuracoes,
    proporcao:
      comNota.length === 0 || pesoTotal <= 0
        ? null
        : comNota.reduce((soma, e) => soma + e.proporcao! * e.peso, 0) / pesoTotal,
    completa: apuracoes.length > 0 && comNota.length === apuracoes.length,
  }
}
