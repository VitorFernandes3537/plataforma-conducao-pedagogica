import { ReguaDoDia } from '@/components/regua-do-dia'

export const metadata = { title: 'Esboços de cor — PCP' }

// Comparação de direções de cor. A MESMA marcação em três ambientes: cada
// direção só sobrescreve as variáveis de tema no elemento que a envolve, o que
// prova que o sistema de tokens aguenta a troca sem tocar em componente.

const RITMO = [
  { tipo: 'abertura', duracaoMinutos: 20 },
  { tipo: 'tentativa', duracaoMinutos: 40 },
  { tipo: 'demonstração', duracaoMinutos: 30 },
  { tipo: 'implementação', duracaoMinutos: 75 },
  { tipo: 'fechamento', duracaoMinutos: 15 },
] as const

type Direcao = {
  chave: string
  nome: string
  tese: string
  vars: Record<string, string>
}

const DIRECOES: readonly Direcao[] = [
  {
    chave: 'caderno',
    nome: 'A · Caderno e marcador',
    tese:
      'Releitura do caderno quadriculado. Fundo de papel, malha tênue, e um marcador de verdade como único acento. Clean por construção, e lê “estudo” antes de qualquer rótulo.',
    vars: {
      '--color-quadro': '#ffffff',
      '--color-quadro-fundo': '#f4f2ed',
      '--color-tarja': '#ffffff',
      '--color-tarja-sombra': '#e0dcd2',
      '--color-tinta': '#1b1a17',
      '--color-tinta-fraca': '#6f6b62',
      '--color-clara': '#1b1a17',
      '--color-clara-fraca': '#6f6b62',
      '--color-regua': '#c9c4b7',
      '--color-regua-fraca': '#e5e1d7',
      '--color-portao-duro': '#c8412f',
      '--color-portao-triagem': '#c98a1e',
      '--color-escala-0': '#e5e1d7',
      '--color-escala-1': '#d9e08a',
      '--color-escala-2': '#b9d152',
      '--color-escala-3': '#8dbf2e',
    },
  },
  {
    chave: 'lousa',
    nome: 'B · Lousa saturada',
    tese:
      'O padrão mais antigo do ramo, relido com saturação de verdade em vez do cinza-esverdeado morto. Verde de lousa profundo, giz quente, acentos de giz colorido.',
    vars: {
      '--color-quadro': '#123a30',
      '--color-quadro-fundo': '#0c2a23',
      '--color-tarja': '#f4efe2',
      '--color-tarja-sombra': '#ddd6c4',
      '--color-tinta': '#12211c',
      '--color-tinta-fraca': '#5d6b62',
      '--color-clara': '#eef5ef',
      '--color-clara-fraca': '#8fb6a5',
      '--color-regua': '#3f7a66',
      '--color-regua-fraca': '#1c5244',
      '--color-portao-duro': '#ef6a5a',
      '--color-portao-triagem': '#f0b84a',
      '--color-escala-0': '#1c5244',
      '--color-escala-1': '#6fa98c',
      '--color-escala-2': '#a8d3a0',
      '--color-escala-3': '#e2f0a8',
    },
  },
  {
    chave: 'oficina',
    nome: 'C · Oficina com console',
    tese:
      'Superfície clara e ampla onde o aluno constrói, e a faixa de tempo como console escuro — o instrumento fica onde ele se justifica. Acento tangerina, não o azul de sempre.',
    vars: {
      '--color-quadro': '#ffffff',
      '--color-quadro-fundo': '#f7f5f2',
      '--color-tarja': '#ffffff',
      '--color-tarja-sombra': '#e6e1da',
      '--color-tinta': '#171412',
      '--color-tinta-fraca': '#6d665e',
      '--color-clara': '#171412',
      '--color-clara-fraca': '#6d665e',
      '--color-regua': '#cdc6bc',
      '--color-regua-fraca': '#e8e3db',
      '--color-portao-duro': '#d4442a',
      '--color-portao-triagem': '#e08a12',
      '--color-escala-0': '#e8e3db',
      '--color-escala-1': '#f2c48a',
      '--color-escala-2': '#ef9d46',
      '--color-escala-3': '#e0700f',
    },
  },
  {
    chave: 'mista',
    nome: 'D · Lousa com superfície de leitura clara',
    tese:
      'A recomendação: o verde saturado da B como moldura, cromagem e régua, e cama clara onde vive a prosa longa. Vida na estrutura, calma na leitura, instrumento onde ele se justifica.',
    vars: {
      '--color-quadro': '#123a30',
      '--color-quadro-fundo': '#0c2a23',
      '--color-tarja': '#f4efe2',
      '--color-tarja-sombra': '#ddd6c4',
      '--color-tinta': '#12211c',
      '--color-tinta-fraca': '#5d6b62',
      '--color-clara': '#eef5ef',
      '--color-clara-fraca': '#8fb6a5',
      '--color-regua': '#3f7a66',
      '--color-regua-fraca': '#1c5244',
      '--color-portao-duro': '#ef6a5a',
      '--color-portao-triagem': '#f0b84a',
      '--color-escala-0': '#1c5244',
      '--color-escala-1': '#6fa98c',
      '--color-escala-2': '#a8d3a0',
      '--color-escala-3': '#e2f0a8',
    },
  },
]

/**
 * Direção D: a lousa da B como moldura, com a superfície de leitura clara.
 *
 * O verde saturado fica na cromagem — cabeçalho, régua, divisórias, lateral —
 * e o painel onde vive a pergunta e o checklist recebe cama clara, porque é
 * prosa longa e prosa longa quer calma.
 */
const LEITURA_CLARA: Record<string, string> = {
  '--color-quadro': '#f7f4ec',
  '--color-clara': '#12211c',
  '--color-clara-fraca': '#5d6b62',
  '--color-regua': '#c3c9bd',
  '--color-regua-fraca': '#dfe2d6',
  '--color-escala-1': '#8fbb95',
  '--color-escala-2': '#5d9e6d',
  '--color-escala-3': '#2f7d4f',
}

/** Console escuro para a direção C: o instrumento tem ambiente próprio. */
const CONSOLE_ESCURO: Record<string, string> = {
  '--color-quadro': '#1b1815',
  '--color-quadro-fundo': '#131110',
  '--color-clara': '#f5f1ea',
  '--color-clara-fraca': '#a09789',
  '--color-regua': '#4b443c',
  '--color-regua-fraca': '#332e29',
}

function Amostra({ direcao }: { direcao: Direcao }) {
  const ehOficina = direcao.chave === 'oficina'
  const ehMista = direcao.chave === 'mista'

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight text-clara">{direcao.nome}</h2>
      <p className="mb-3 mt-1 max-w-[64ch] font-prosa text-[0.8125rem] leading-relaxed text-clara-fraca">
        {direcao.tese}
      </p>

      <div style={direcao.vars as React.CSSProperties} className="border border-regua-fraca">
        <div
          className="bg-quadro-fundo"
          // Malha do caderno: só na direção A, e tênue o suficiente para ser
          // textura e não grade de planilha.
          style={
            direcao.chave === 'caderno'
              ? {
                  backgroundImage:
                    'linear-gradient(var(--color-regua-fraca) 1px, transparent 1px), linear-gradient(90deg, var(--color-regua-fraca) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }
              : undefined
          }
        >
          <header className="flex items-baseline justify-between px-4 pb-2 pt-3">
            <div className="flex items-baseline gap-3">
              <span className="dado text-xl leading-none text-clara">D7</span>
              <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
                ritmo de obstáculo
              </span>
            </div>
            <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
              Ana e Bruno · Barbearia
            </span>
          </header>

          {/* Na direção C a faixa de tempo vira console escuro. Precisa de
              fundo próprio: sem ele, só os blocos com background escurecem e o
              contador fica texto escuro sobre claro — ilegível. */}
          <div
            className={ehOficina ? 'bg-quadro-fundo' : undefined}
            style={ehOficina ? (CONSOLE_ESCURO as React.CSSProperties) : undefined}
          >
            <ReguaDoDia blocos={RITMO} blocoCorrente={3} decorridosNoBloco={41} />
          </div>

          <div
            className="grid gap-px bg-regua-fraca lg:grid-cols-[minmax(0,1fr)_15rem]"
            // Na direção D só a área de leitura e a lateral clareiam. A moldura
            // e a régua continuam na lousa saturada.
            style={ehMista ? (LEITURA_CLARA as React.CSSProperties) : undefined}
          >
            <div className="bg-quadro px-4 py-4">
              <span className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                o que vencer agora
              </span>
              <h3 className="mt-1.5 max-w-[34ch] font-prosa text-xl leading-[1.25] text-clara">
                E se o cliente cancelar depois de o atendimento já ter começado?
              </h3>

              <ul className="mt-4 flex flex-col gap-2">
                {[
                  ['O cancelamento não apaga o histórico', true],
                  ['Cada estado recusa transições impossíveis', false],
                  ['Nenhum `if` decide pelo tipo do serviço', false],
                ].map(([texto, feito]) => (
                  <li key={texto as string} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[0.3rem] size-3 shrink-0 border"
                      style={{
                        borderColor: feito ? 'var(--color-escala-3)' : 'var(--color-regua)',
                        backgroundColor: feito ? 'var(--color-escala-3)' : 'transparent',
                      }}
                    />
                    <span
                      className={`text-sm leading-snug ${feito ? 'text-clara-fraca' : 'text-clara'}`}
                    >
                      {texto}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="flex flex-col gap-4 bg-quadro px-4 py-4">
              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  material do dia
                </span>
                <ul className="mt-1.5 flex flex-col gap-1 text-[0.8125rem]">
                  <li className="text-clara">Slides do obstáculo 4</li>
                  <li className="text-clara">Demonstração gravada</li>
                  <li className="text-clara-fraca">Gabarito · libera no fechamento</li>
                </ul>
              </div>

              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  obstáculos
                </span>
                <ol className="mt-1.5 flex gap-1">
                  {[3, 2, 3, null, null].map((nota, i) => (
                    <li key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="flex h-8 w-full items-center justify-center"
                        style={
                          nota === null
                            ? { border: '1px dashed var(--color-regua)' }
                            : { backgroundColor: `var(--color-escala-${nota})` }
                        }
                      >
                        <span className="dado text-[0.6875rem] text-tinta">{nota ?? '·'}</span>
                      </div>
                      <span className="dado text-[0.625rem] text-clara-fraca">{i + 1}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  seu produto
                </span>
                <p className="dado mt-1 truncate text-[0.8125rem] text-clara underline decoration-regua underline-offset-4">
                  github.com/ana/barbearia
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Esbocos() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-clara">Direções de cor</h1>
        <p className="mt-1 max-w-[68ch] font-prosa text-sm leading-relaxed text-clara-fraca">
          Mesma marcação, três ambientes. Cada direção sobrescreve apenas as variáveis de tema no
          elemento que a envolve — nenhum componente foi tocado. A régua agora é proporcional de
          verdade: 75 minutos ocupam cinco vezes o espaço de 15.
        </p>
      </div>

      {DIRECOES.map((direcao) => (
        <Amostra key={direcao.chave} direcao={direcao} />
      ))}
    </main>
  )
}
