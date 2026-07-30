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

/** Painel: superfície sólida sobre a mesa. Todo texto legível vive aqui. */
function Painel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={`painel ${className}`}>{children}</section>
}

export default function RumoVisual() {
  return (
    <div className="mesa min-h-dvh">
      {/* ── Tela do aluno ─────────────────────────────────────────────── */}
      <ReguaDoDia
        dia={7}
        rotuloDoDia="ritmo de obstáculo"
        contexto="turma 2026-1 · ana e bruno · barbearia"
        blocos={RITMO_DE_OBSTACULO}
        blocoCorrente={3}
        decorridosNoBloco={41}
      />

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex flex-col gap-4">
          <Painel>
            <DesafioAtual
              ordem={4}
              perguntaDoAluno="E se o cliente cancelar depois de o atendimento já ter começado?"
              criterios={[
                { texto: 'O cancelamento não apaga o histórico do atendimento', cumprido: true },
                {
                  texto: 'Cada estado do atendimento recusa as transições impossíveis',
                  cumprido: false,
                },
                {
                  texto: 'Nenhum `if` decide o comportamento pelo tipo do serviço',
                  cumprido: false,
                },
              ]}
              escopoFora={[
                'Reembolso e cálculo de multa',
                'Notificação ao cliente',
                'Histórico auditável',
              ]}
            />
          </Painel>

          <Painel className="px-7 py-6">
            <Rotulo>antes do fechamento</Rotulo>
            <ul className="mt-3">
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
                        borderColor: feito ? 'var(--color-escala-3)' : 'var(--color-filete-forte)',
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
          </Painel>
        </div>

        <div className="flex flex-col gap-4">
          <Painel className="px-5 py-5">
            <Rotulo>material do dia</Rotulo>
            <ul className="mt-3">
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
                    className={`text-[0.875rem] ${
                      estado === 'aberto' ? 'text-tinta' : 'text-tinta-fraca'
                    }`}
                  >
                    {nome}
                  </span>
                  <span className="dado shrink-0 text-[0.625rem] text-tinta-fraca">{estado}</span>
                </li>
              ))}
            </ul>
          </Painel>

          <Painel className="px-5 py-5">
            <LinhaDeVida
              passos={[
                { ordem: 1, nota: 3 },
                { ordem: 2, nota: 2 },
                { ordem: 3, nota: 3 },
                { ordem: 4, nota: null },
                { ordem: 5, nota: null },
              ]}
            />
          </Painel>

          <Painel className="px-5 py-5">
            <Rotulo>seu produto público</Rotulo>
            <a
              href="#"
              className="dado mt-2 block truncate text-[0.875rem] text-tinta underline decoration-filete-forte underline-offset-4 hover:decoration-tinta"
            >
              github.com/ana/barbearia
            </a>
            <p className="mt-2 text-[0.8125rem] leading-snug text-tinta-fraca">
              Fica no ar depois do curso. Último push há 19 h.
            </p>
          </Painel>

          {/* Ausência declarada. Sem painel sólido de propósito: ela é a única
              coisa da tela que ainda não existe, e a mesa aparece através. */}
          <section className="border border-dashed border-filete-forte px-5 py-4">
            <Rotulo>nota</Rotulo>
            <p className="mt-2 font-prosa text-[0.8125rem] leading-snug text-tinta-fraca">
              Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para o
              instrutor.
            </p>
          </section>
        </div>
      </div>

      {/* ── Tela do instrutor ─────────────────────────────────────────── */}
      <div className="mt-8">
        <ReguaDoDia
          dia={3}
          rotuloDoDia="escopo"
          contexto="turma 2026-1 · instrutor · 6 grupos"
          blocos={RITMO_DE_MARCO}
          blocoCorrente={2}
          decorridosNoBloco={38}
          marco={{ nome: 'Marco 1', tipo: 'duro' }}
        />

        <div className="flex flex-col gap-4 p-4">
          <Painel className="px-7 py-6">
            <Rotulo contagem={FILA.length}>exigem decisão</Rotulo>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {FILA.map((tarja) => (
                <TarjaEmAcao key={tarja.integrantes.join()} {...tarja} />
              ))}
            </div>
          </Painel>

          <Painel className="max-w-3xl px-7 py-6">
            <Rotulo contagem={RESOLVIDOS.length}>fechados</Rotulo>
            <div className="mt-2">
              {RESOLVIDOS.map((tarja) => (
                <TarjaResolvida key={tarja.integrantes.join()} {...tarja} />
              ))}
            </div>
          </Painel>
        </div>
      </div>
    </div>
  )
}
