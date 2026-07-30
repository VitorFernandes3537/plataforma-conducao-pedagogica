import { DesafioAtual } from '@/components/desafio-atual'
import { LinhaDeVida } from '@/components/linha-de-vida'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { TarjaEmAcao, TarjaResolvida, type DadosDaTarja } from '@/components/tarja'

export const metadata = { title: 'Rumo visual — PCP' }

// Referência de design em largura real. Dados fixos, nenhuma consulta ao
// banco. Some quando as telas reais existirem, nas issues 4, 5 e 9.

const RITMO_DE_OBSTACULO = [
  { tipo: 'abertura', duracaoMinutos: 20 },
  { tipo: 'tentativa', duracaoMinutos: 40 },
  { tipo: 'demonstração', duracaoMinutos: 30 },
  { tipo: 'implementação', duracaoMinutos: 75 },
  { tipo: 'fechamento', duracaoMinutos: 15 },
] as const

const RITMO_DE_MARCO = [
  { tipo: 'abertura', duracaoMinutos: 20 },
  { tipo: 'preenchimento', duracaoMinutos: 65 },
  { tipo: 'aprovação', duracaoMinutos: 95 },
] as const

const FILA: readonly DadosDaTarja[] = [
  {
    integrantes: ['Fábio', 'Gabi'],
    tema: 'Escola de música',
    estado: 'devolvido',
    sintoma: 'C7 respondida com “a definir”. Sem o que fica fora, o escopo cresce no D5.',
    bloqueado: true,
  },
  {
    integrantes: ['Ana', 'Bruno'],
    tema: 'Barbearia',
    estado: 'submetido',
    sintoma: 'C2 e C5 descrevem a mesma grandeza. Uma das duas não é variável.',
  },
  {
    integrantes: ['Carla'],
    tema: 'Perícia Criminal',
    trilha: 'desafio',
    estado: 'submetido',
    sintoma: 'Briefing lido. Prazo legal por tipo de exame está em C5, como esperado.',
  },
  { integrantes: ['Hugo', 'Iara'], tema: null, estado: 'rascunho' },
]

const RESOLVIDOS: readonly DadosDaTarja[] = [
  { integrantes: ['Davi', 'Elis'], tema: 'Oficina mecânica', estado: 'aprovado' },
  { integrantes: ['Joana', 'Kleber'], tema: 'Estúdio fotográfico', estado: 'aprovado' },
]

/** Barra de identidade. Fina de propósito: não é o assunto da tela. */
function Barra({ contexto }: { contexto: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-filete bg-papel-alto px-8 py-2.5">
      <span className="dado text-[0.8125rem] font-medium tracking-[0.16em] text-tinta">PCP</span>
      <span className="legenda">{contexto}</span>
    </div>
  )
}

function CabecalhoDoDia({
  dia,
  titulo,
  marco,
  direita,
}: {
  dia: number
  titulo: string
  marco?: { nome: string; tipo: 'duro' | 'triagem' }
  direita: string
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-8 py-4">
      <div className="flex items-baseline gap-4">
        <span className="dado text-2xl font-medium leading-none tracking-tight text-tinta">
          D{dia}
        </span>
        <span className="legenda">{titulo}</span>
        {marco && (
          <span
            className="dado border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em]"
            style={{
              borderColor:
                marco.tipo === 'duro'
                  ? 'var(--color-portao-duro)'
                  : 'var(--color-portao-triagem)',
              color:
                marco.tipo === 'duro'
                  ? 'var(--color-portao-duro)'
                  : 'var(--color-portao-triagem)',
            }}
          >
            {marco.nome} · {marco.tipo === 'duro' ? 'go/no-go' : 'triagem'}
          </span>
        )}
      </div>
      <span className="legenda">{direita}</span>
    </header>
  )
}

function Rotulo({ children, contagem }: { children: React.ReactNode; contagem?: number }) {
  return (
    <h3 className="legenda flex items-baseline gap-2">
      {children}
      {contagem !== undefined && (
        <span className="dado normal-case tracking-normal text-tinta">{contagem}</span>
      )}
    </h3>
  )
}

export default function RumoVisual() {
  return (
    <div className="malha min-h-dvh">
      {/* ── Tela do aluno ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-filete-forte">
        <Barra contexto="turma 2026-1 · ana e bruno" />
        <CabecalhoDoDia dia={7} titulo="ritmo de obstáculo" direita="barbearia" />
        <ReguaDoDia blocos={RITMO_DE_OBSTACULO} blocoCorrente={3} decorridosNoBloco={41} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <DesafioAtual
              ordem={4}
              perguntaDoAluno="E se o cliente cancelar depois de o atendimento já ter começado?"
              criterios={[
                { texto: 'O cancelamento não apaga o histórico do atendimento', cumprido: true },
                {
                  texto: 'Cada estado do atendimento recusa as transições impossíveis',
                  cumprido: false,
                },
                { texto: 'Nenhum `if` decide o comportamento pelo tipo do serviço', cumprido: false },
              ]}
              escopoFora={[
                'Reembolso e cálculo de multa',
                'Notificação ao cliente',
                'Histórico auditável',
              ]}
            />

            <div className="border-t border-filete px-8 py-6">
              <Rotulo>antes do fechamento</Rotulo>
              <ul className="mt-2.5 max-w-2xl">
                {[
                  ['Contrato do dia', 'faremos e não faremos', true],
                  ['Log do obstáculo', 'cinco linhas', false],
                  ['Push no repositório', 'no fechamento', false],
                ].map(([titulo, detalhe, feito]) => (
                  <li
                    key={titulo as string}
                    className="flex items-center justify-between gap-4 border-b border-filete py-2.5 last:border-b-0"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="size-[0.875rem] shrink-0 border"
                        style={{
                          borderColor: feito
                            ? 'var(--color-escala-3)'
                            : 'var(--color-filete-forte)',
                          backgroundColor: feito ? 'var(--color-escala-3)' : 'transparent',
                        }}
                      />
                      <span
                        className={`text-[0.9375rem] ${feito ? 'text-tinta-media' : 'text-tinta'}`}
                      >
                        {titulo}
                      </span>
                    </span>
                    <span className="dado text-[0.6875rem] text-tinta-fraca">{detalhe}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="flex flex-col gap-7 border-l border-filete bg-papel-alto px-6 py-6">
            <div>
              <Rotulo>material do dia</Rotulo>
              <ul className="mt-2.5 flex flex-col">
                {[
                  ['Slides do obstáculo 4', 'aberto'],
                  ['Demonstração gravada', 'aberto'],
                  ['Gabarito', 'libera no fechamento'],
                ].map(([nome, estado]) => (
                  <li
                    key={nome}
                    className="flex items-baseline justify-between gap-3 border-b border-filete py-2 last:border-b-0"
                  >
                    <span
                      className={`text-[0.875rem] ${estado === 'aberto' ? 'text-tinta' : 'text-tinta-fraca'}`}
                    >
                      {nome}
                    </span>
                    <span className="dado shrink-0 text-[0.625rem] text-tinta-fraca">{estado}</span>
                  </li>
                ))}
              </ul>
            </div>

            <LinhaDeVida
              passos={[
                { ordem: 1, nota: 3 },
                { ordem: 2, nota: 2 },
                { ordem: 3, nota: 3 },
                { ordem: 4, nota: null },
                { ordem: 5, nota: null },
              ]}
            />

            <div>
              <Rotulo>seu produto público</Rotulo>
              <a
                href="#"
                className="dado mt-1.5 block truncate text-[0.875rem] text-tinta underline decoration-filete-forte underline-offset-4 hover:decoration-tinta"
              >
                github.com/ana/barbearia
              </a>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-tinta-fraca">
                Fica no ar depois do curso. Último push há 19 h.
              </p>
            </div>

            {/* Ausência declarada, não card vazio. */}
            <div className="border border-dashed border-filete-forte px-3.5 py-3">
              <Rotulo>nota</Rotulo>
              <p className="mt-1.5 font-prosa text-[0.8125rem] leading-snug text-tinta-fraca">
                Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para o
                instrutor.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Tela do instrutor ─────────────────────────────────────────── */}
      <section>
        <Barra contexto="turma 2026-1 · instrutor" />
        <CabecalhoDoDia
          dia={3}
          titulo="escopo"
          marco={{ nome: 'Marco 1', tipo: 'duro' }}
          direita="6 grupos"
        />
        <ReguaDoDia
          blocos={RITMO_DE_MARCO}
          blocoCorrente={2}
          decorridosNoBloco={38}
          marco={{ nome: 'Marco 1', tipo: 'duro' }}
        />

        <div className="px-8 py-6">
          <Rotulo contagem={FILA.length}>exigem decisão</Rotulo>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FILA.map((tarja) => (
              <TarjaEmAcao key={tarja.integrantes.join()} {...tarja} />
            ))}
          </div>

          <div className="mt-8 max-w-3xl">
            <Rotulo contagem={RESOLVIDOS.length}>fechados</Rotulo>
            <div className="mt-1.5">
              {RESOLVIDOS.map((tarja) => (
                <TarjaResolvida key={tarja.integrantes.join()} {...tarja} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
