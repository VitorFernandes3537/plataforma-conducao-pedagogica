import { DesafioAtual } from '@/components/desafio-atual'
import { LinhaDeVida } from '@/components/linha-de-vida'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { TarjaEmAcao, TarjaResolvida, type DadosDaTarja } from '@/components/tarja'

export const metadata = {
  title: 'Rumo visual — PCP',
}

// Página de referência de design. Dados fixos, nenhuma consulta ao banco.
// Some quando as telas reais existirem, nas issues 4, 5 e 9.

const RITMO_DE_PAREDE = [
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

function Cabecalho({
  dia,
  titulo,
  marco,
  contexto,
}: {
  dia: number
  titulo: string
  marco?: { nome: string; tipo: 'duro' | 'triagem' }
  contexto?: string
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 pb-2 pt-2.5">
      <div className="flex items-baseline gap-3">
        <span className="dado text-xl leading-none text-clara">D{dia}</span>
        <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
          {titulo}
        </span>
        {marco && (
          <span
            className="border px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.16em]"
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
      {contexto && (
        <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
          {contexto}
        </span>
      )}
    </header>
  )
}

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 max-w-[68ch] font-prosa text-sm leading-relaxed text-clara-fraca">
      {children}
    </p>
  )
}

export default function RumoVisual() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-clara">Rumo visual</h1>
        <Nota>
          Instrumento de condução, não painel de indicadores. Para o aluno, a tela responde uma
          única pergunta: o que eu tenho que vencer agora. Para o instrutor, ela precisa permitir
          diagnóstico em trinta segundos — o Doc 3 §2 fixa esse número como requisito do sintoma
          observável.
        </Nota>
      </div>

      {/* ── Aluno ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
          Aluno · dia de obstáculo
        </h2>
        <Nota>
          O herói é a <strong className="text-clara">pergunta do aluno</strong>, não o rótulo
          “obstáculo 4”. O Doc 3 §2 diz que a parede é enunciada como problema dele e que é isso
          que vai para a plataforma — é o que separa PBL de currículo. Abaixo, o critério de
          superação como checklist binário, e o que está fora de escopo hoje.
        </Nota>

        <div className="border border-regua-fraca bg-quadro-fundo">
          <Cabecalho dia={7} titulo="ritmo de obstáculo" contexto="Turma 2026-1 · Ana e Bruno · Barbearia" />
          <ReguaDoDia blocos={RITMO_DE_PAREDE} blocoCorrente={3} decorridosNoBloco={41} />

          <DesafioAtual
            ordem={4}
            perguntaDoAluno="E se o cliente cancelar depois de o atendimento já ter começado?"
            criterios={[
              { texto: 'O cancelamento não apaga o histórico do atendimento', cumprido: true },
              { texto: 'Cada estado do atendimento recusa as transições impossíveis', cumprido: false },
              { texto: 'Nenhum `if` decide o comportamento pelo tipo do serviço', cumprido: false },
            ]}
            escopoFora={['Reembolso e cálculo de multa', 'Notificação ao cliente', 'Histórico auditável']}
          />

          <div className="grid gap-px bg-regua-fraca lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-4 bg-quadro-fundo px-5 py-4">
              <div>
                <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  antes do fechamento
                </h3>
                <ul className="mt-2 flex flex-col">
                  {[
                    ['Contrato do dia', 'faremos e não faremos', true],
                    ['Log do obstáculo', 'cinco linhas', false],
                    ['Push no repositório', 'no fechamento', false],
                  ].map(([titulo, detalhe, feito]) => (
                    <li
                      key={titulo as string}
                      className="flex items-center justify-between gap-3 border-b border-regua-fraca py-2 last:border-b-0"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 border"
                          style={{
                            borderColor: feito ? 'var(--color-escala-3)' : 'var(--color-regua)',
                            backgroundColor: feito ? 'var(--color-escala-3)' : 'transparent',
                          }}
                        />
                        <span className={feito ? 'text-sm text-clara-fraca' : 'text-sm text-clara'}>
                          {titulo}
                        </span>
                      </span>
                      <span className="dado text-[0.6875rem] text-clara-fraca">{detalhe}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-regua-fraca pt-3">
                <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  para rever
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  <li className="text-clara">Demonstração do obstáculo 3 — liberada</li>
                  <li className="text-clara">Material de referência até o obstáculo 3</li>
                  <li className="text-clara-fraca">
                    Obstáculo 4 <span className="dado text-[0.6875rem]">libera no fechamento</span>
                  </li>
                </ul>
              </div>
            </div>

            <aside className="flex flex-col gap-5 bg-quadro-fundo px-5 py-4">
              <div>
                <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  seu produto público
                </h3>
                <a
                  href="#"
                  className="dado mt-1.5 block truncate text-sm text-clara underline decoration-regua underline-offset-4 hover:decoration-clara"
                >
                  github.com/ana/barbearia
                </a>
                <p className="mt-1 text-[0.6875rem] leading-snug text-clara-fraca">
                  Fica no ar depois do curso. Último push há 19 h.
                </p>
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

              <div
                className="border border-dashed px-3 py-2.5"
                style={{ borderColor: 'var(--color-regua-fraca)' }}
              >
                <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
                  nota
                </h3>
                <p className="mt-1 font-prosa text-[0.8125rem] leading-snug text-clara-fraca">
                  Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para
                  o instrutor.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Instrutor ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[0.6875rem] uppercase tracking-[0.16em] text-clara-fraca">
          Instrutor · marco duro
        </h2>
        <Nota>
          Hierarquia por tamanho: quem exige decisão cresce e mostra o sintoma; quem já está
          aprovado encolhe para uma linha e sai do caminho. O contador de minutos restantes é o
          maior número da tela, porque são onze formulários em noventa e cinco minutos.
        </Nota>

        <div className="border border-regua-fraca bg-quadro-fundo">
          <Cabecalho
            dia={3}
            titulo="escopo"
            marco={{ nome: 'Marco 1', tipo: 'duro' }}
            contexto="Turma 2026-1 · 6 grupos"
          />
          <ReguaDoDia
            blocos={RITMO_DE_MARCO}
            blocoCorrente={2}
            decorridosNoBloco={38}
            marco={{ nome: 'Marco 1', tipo: 'duro' }}
          />

          <div className="px-3 pb-3 pt-4">
            <h3 className="text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
              exigem decisão
              <span className="dado ml-2 normal-case tracking-normal">{FILA.length}</span>
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {FILA.map((tarja) => (
                <TarjaEmAcao key={tarja.integrantes.join()} {...tarja} />
              ))}
            </div>

            <h3 className="mt-5 text-[0.625rem] uppercase tracking-[0.18em] text-clara-fraca">
              fechados
              <span className="dado ml-2 normal-case tracking-normal">{RESOLVIDOS.length}</span>
            </h3>
            <div className="mt-1.5">
              {RESOLVIDOS.map((tarja) => (
                <TarjaResolvida key={tarja.integrantes.join()} {...tarja} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
