type Props = {
  children: React.ReactNode
  /**
   * `leitura` — coluna de leitura ancorada à esquerda, para tela de prosa e
   * formulário. `cheia` — sem teto, para tela que **usa** o monitor.
   *
   * A escolha é por tela e está registrada na ADR 0009. Nenhuma das duas centra.
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
 * **Não centra.** O conteúdo ancora à esquerda e o espaço sobra à direita como
 * margem de caderno, que é a mesma figura de "parede de ateliê" da ADR 0003. O
 * que tem medida é o conteúdo, e a medida se declara em `ch` onde ela é de
 * leitura — 34ch da pergunta do aluno, 62ch da prosa, 46ch do estado vazio.
 */
export function Casca({ children, medida = 'leitura', regua, className = '' }: Props) {
  return (
    <main className={`flex min-h-dvh flex-col ${className}`}>
      {regua}
      <div
        className={`margem flex flex-1 flex-col gap-8 py-10 ${
          // 64rem é o que a grade de dois campos do desafio precisa para não
          // espremer o "fora de escopo" numa coluna de duas palavras. Não é
          // largura de página: é o teto de uma coluna de leitura.
          medida === 'leitura' ? 'max-w-[64rem]' : ''
        }`}
      >
        {children}
      </div>
    </main>
  )
}
