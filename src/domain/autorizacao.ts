/**
 * Matriz de permissão do Doc 7 §3, como função pura.
 *
 * Mora em `src/domain` e não importa framework (ADR 0001 §7): a regra tem
 * que ser a mesma no proxy, na página e na server action. A ADR 0001 §3 é
 * explícita — proxy não é solução de autorização, e cada server action
 * re-verifica.
 *
 * As issues que ainda não existem (11 avaliação, 17 incremento, 18 nota)
 * chamam `podeVer` em vez de reimplementar a regra. Por isso os recursos
 * aqui já cobrem casos cujas entidades ainda não foram criadas.
 */

export type Papel = 'instrutor' | 'aluno'

export type Ator =
  | { papel: 'instrutor'; usuarioId: string }
  | { papel: 'aluno'; usuarioId: string; grupoId: string | null }

export type Recurso =
  /** Qualquer rota sob a área do instrutor. */
  | { tipo: 'rota-de-instrutor' }
  /** Avaliação pertencente a um grupo. */
  | { tipo: 'avaliacao'; grupoId: string }
  /** Envelope de incremento. `liberado` vem da configuração do curso, não de dia fixo. */
  | { tipo: 'incremento'; liberado: boolean }
  /** Nota agregada. Invisível antes do fechamento da agregação. */
  | { tipo: 'nota'; agregacaoFinalizada: boolean }
  /** Produção própria do aluno: log, contrato diário, push, crítica, recuperação. */
  | { tipo: 'producao-propria'; usuarioId: string }
  /** Mural do "Precisamos Saber" — o aluno lê e escreve. */
  | { tipo: 'mural' }
  /** Índice público da turma. */
  | { tipo: 'indice-publico' }

export function podeVer(ator: Ator, recurso: Recurso): boolean {
  // Doc 7 §3: "Instrutor — Tudo."
  if (ator.papel === 'instrutor') return true

  switch (recurso.tipo) {
    case 'rota-de-instrutor':
      return false

    // "Aluno não vê: avaliações de outros grupos."
    case 'avaliacao':
      return ator.grupoId !== null && ator.grupoId === recurso.grupoId

    // "...incrementos antes da liberação."
    case 'incremento':
      return recurso.liberado

    // "...notas antes da agregação."
    case 'nota':
      return recurso.agregacaoFinalizada

    case 'producao-propria':
      return ator.usuarioId === recurso.usuarioId

    case 'mural':
    case 'indice-publico':
      return true
  }
}

/** Erro de autorização. O adaptador HTTP o traduz para 403. */
export class AcessoNegado extends Error {
  readonly status = 403

  constructor(motivo: string) {
    super(`Acesso negado: ${motivo}`)
    this.name = 'AcessoNegado'
  }
}

export function exigeAcesso(ator: Ator, recurso: Recurso): void {
  if (!podeVer(ator, recurso)) {
    throw new AcessoNegado(`${ator.papel} não pode acessar ${recurso.tipo}`)
  }
}

/**
 * Prefixo das rotas restritas ao instrutor. Uma rota nova sob este prefixo
 * fica protegida sem precisar ser cadastrada em lugar nenhum — o inverso
 * (lista de rotas protegidas) falha em silêncio quando alguém esquece.
 */
export const PREFIXO_DE_INSTRUTOR = '/instrutor'

export function ehRotaDeInstrutor(caminho: string): boolean {
  return caminho === PREFIXO_DE_INSTRUTOR || caminho.startsWith(`${PREFIXO_DE_INSTRUTOR}/`)
}
