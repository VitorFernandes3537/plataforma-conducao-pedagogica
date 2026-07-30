/**
 * Máquina de estados do formulário de escopo (Doc 2 §4.5).
 *
 * Puro por construção — não importa framework nem banco (ADR 0001 §7). O que
 * mora aqui é a única cópia do mapa de transições: a camada de banco derive dele
 * o `where` do UPDATE em vez de repetir a lista, porque duas listas divergem na
 * primeira mudança de regra.
 */

export const ESTADOS_DO_ESCOPO = ['rascunho', 'submetido', 'aprovado', 'devolvido'] as const

export type EstadoDoEscopo = (typeof ESTADOS_DO_ESCOPO)[number]

/**
 * Para onde cada estado pode ir.
 *
 * A aprovação é **rolling**: o instrutor circula e decide conforme os grupos
 * terminam (Doc 2 §4.5). Daí `submetido` ter dois destinos e `devolvido` voltar
 * para a fila — devolver existe para o grupo corrigir e entregar de novo.
 *
 * `aprovado` não tem saída. A única mudança admitida depois dele é a poda da
 * issue 10, que edita o conteúdo mantendo o estado: rebaixamento de trilha é
 * poda de escopo, não troca de tema (Doc 5 §5.3).
 */
const TRANSICOES: Record<EstadoDoEscopo, readonly EstadoDoEscopo[]> = {
  rascunho: ['submetido'],
  submetido: ['aprovado', 'devolvido'],
  devolvido: ['submetido'],
  aprovado: [],
}

export function transicaoPermitida(de: EstadoDoEscopo, para: EstadoDoEscopo): boolean {
  return TRANSICOES[de].includes(para)
}

/**
 * De quais estados se chega a `para`.
 *
 * É isto que a camada de banco usa como filtro do UPDATE: gravar
 * `where estado in (<origens legais>)` transforma a legalidade da transição em
 * condição atômica. Ler o estado e decidir depois perderia a corrida entre o
 * instrutor aprovando e o grupo reenviando — que no D3 acontece, porque os dois
 * estão com a tela aberta ao mesmo tempo.
 */
export function estadosQueLevamA(para: EstadoDoEscopo): readonly EstadoDoEscopo[] {
  return ESTADOS_DO_ESCOPO.filter((de) => transicaoPermitida(de, para))
}

/** Descreve a recusa em português, para a mensagem chegar pronta à tela. */
export function motivoDaRecusa(de: EstadoDoEscopo, para: EstadoDoEscopo): string {
  const destinos = TRANSICOES[de]
  if (destinos.length === 0) {
    return `escopo ${de} não muda mais de estado`
  }
  return `escopo ${de} não pode ir para ${para}; daqui só ${destinos.join(' ou ')}`
}

/**
 * Em que estados o grupo ainda escreve no formulário.
 *
 * É exatamente de onde ainda se pode entregar — e a coincidência não é acidente:
 * o grupo edita enquanto a entrega está pendente, e para de editar quando a
 * decisão do instrutor passa a valer. Derivar em vez de listar mantém a regra
 * com um dono só.
 */
export function estadosEditaveisPeloGrupo(): readonly EstadoDoEscopo[] {
  return estadosQueLevamA('submetido')
}
