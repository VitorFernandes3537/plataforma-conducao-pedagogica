/**
 * Logotipo.
 *
 * É **tipográfico e monocromático**, e as duas coisas são decisão, não falta de
 * desenho (ADR 0008).
 *
 * Não usa nenhuma das seis marcas de `src/components/marcas.tsx`: aquelas vivem
 * na margem e só onde espelham algo físico (ADR 0003 §4.1), e o cabeçalho é
 * superfície de decisão. Promover o muro ou o bilhete a logo violaria a regra
 * de frente.
 *
 * Não usa a pílula de destaque, que é o device tipográfico da casa. O acento
 * azul é escasso por projeto — "acento de rascunho, fim da escala" —, e uma
 * marca que aparece em toda tela gastaria esse acento antes de o conteúdo
 * chegar.
 *
 * A sigla vai em Literata porque a marca é o nome do produto, e nome é voz. A
 * ADR 0003 §4 reserva a serifada a "título de tela e prosa de aluno" e proíbe
 * rótulo — o logotipo é o caso limite: é o título do produto inteiro, e é o
 * único lugar em que a voz nomeia a própria plataforma.
 */

type Props = {
  /** `casca` é a versão de topo de tela; `abertura` abre a tela de entrada. */
  tamanho?: 'casca' | 'abertura'
  /**
   * Nome por extenso sob a sigla. Fora dele a sigla sozinha ainda é anunciada
   * por extenso — quem ouve a tela não decifra três letras.
   */
  extenso?: boolean
  className?: string
}

const NOME_POR_EXTENSO = 'Plataforma de Condução Pedagógica'

export function Logotipo({
  tamanho = 'casca',
  extenso = tamanho === 'abertura',
  className = '',
}: Props) {
  const abertura = tamanho === 'abertura'

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span
        // Caixa-alta em serifada precisa de entreletra POSITIVA: as maiúsculas
        // da Literata já vêm com espaço de texto corrido, e apertá-las como se
        // faz com título em caixa-baixa fecha o contraforma do P.
        className={`font-prosa font-semibold text-tinta ${
          abertura ? 'text-[2.625rem] leading-none tracking-[0.02em]' : 'text-lg leading-none tracking-[0.03em]'
        }`}
      >
        PCP
      </span>
      {extenso ? (
        <span className={`legenda ${abertura ? 'mt-3' : 'mt-1.5'}`}>{NOME_POR_EXTENSO}</span>
      ) : (
        <span className="sr-only">— {NOME_POR_EXTENSO}</span>
      )}
    </span>
  )
}
