type Props = {
  children: React.ReactNode
  /**
   * `leitura` — coluna de leitura, para tela de prosa e formulário. `cheia` —
   * para a tela que usa o monitor: dashboard, apresentação, o dia do instrutor.
   *
   * As duas **preenchem a largura** num monitor comum e só ganham margem
   * simétrica no monitor muito largo (ADR 0009, revisada). O que muda entre elas
   * é o teto: a de leitura para antes, para a linha de texto não virar faixa.
   */
  medida?: 'leitura' | 'cheia'
  /**
   * A régua do dia. Entra fora da margem, de ponta a ponta — as larguras dela
   * são as durações, e apertá-la faz o bloco curto perder o rótulo e mentir
   * sobre a proporção (ADR 0003 §7).
   */
  regua?: React.ReactNode
  className?: string
}

/**
 * A casca de toda tela de aplicativo.
 *
 * Ela existe porque não existia: cada página escolhia o próprio `mx-auto
 * max-w-*`, havia quatro larguras diferentes entre sete telas, e três delas
 * numa página só — uma por ramo, então os estados de ausência tinham largura
 * diferente do estado normal, e são justamente os que ninguém abre ao testar.
 *
 * **Preenche a largura.** A primeira versão ancorava à esquerda e deixava a
 * sobra à direita como "margem de caderno" — e num monitor de 1440 isso eram
 * 416px de vazio assimétrico que liam como defeito, não como margem (ADR 0009,
 * revisada pela leitura no monitor). Agora a casca ocupa o monitor comum e
 * centra só no muito largo, onde margem simétrica é a única saída sã.
 *
 * A medida de leitura continua vindo do conteúdo, em `ch`, dentro dos
 * componentes — a casca dá a largura, o texto dá o próprio limite.
 */
export function Casca({ children, medida = 'leitura', regua, className = '' }: Props) {
  return (
    <main className={`flex min-h-dvh flex-col ${className}`}>
      {regua}
      <div
        className={`margem mx-auto flex w-full flex-1 flex-col gap-8 py-10 ${
          // O teto preenche o monitor comum (1366–1440) e só aparece no muito
          // largo. `leitura` para antes porque prosa numa faixa de 1600px é
          // ilegível; `cheia` vai mais longe porque tabela e grade aproveitam.
          medida === 'leitura' ? 'max-w-[82rem]' : 'max-w-[100rem]'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
