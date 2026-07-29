import { ReguaDoDia } from '@/components/regua-do-dia'
import { Tarja } from '@/components/tarja'

export const metadata = {
  title: 'Rumo visual — PCP',
}

// Página de referência de design. Dados fixos, nenhuma consulta ao banco: ela
// existe para olhar as duas telas mais características antes de construí-las
// de verdade nas issues 4 e 5. Some quando as telas reais existirem.

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

function Cabecalho({
  dia,
  titulo,
  marco,
  perguntaCondutora,
}: {
  dia: number
  titulo: string
  marco?: { nome: string; tipo: 'duro' | 'triagem' }
  perguntaCondutora?: string
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-quadro-fundo px-3 pb-2 pt-3">
      <div className="flex items-baseline gap-3">
        <span className="dado text-2xl leading-none text-clara">D{dia}</span>
        <span className="text-sm uppercase tracking-[0.14em] text-clara-fraca">{titulo}</span>
        {marco && (
          <span
            className="border px-1.5 py-0.5 text-[0.625rem] uppercase tracking-[0.14em]"
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
      {perguntaCondutora && (
        <p className="max-w-md text-right font-prosa text-[0.8125rem] italic leading-snug text-clara-fraca">
          {perguntaCondutora}
        </p>
      )}
    </header>
  )
}

function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 max-w-2xl font-prosa text-sm leading-relaxed text-clara-fraca">{children}</p>
  )
}

export default function RumoVisual() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-clara">Rumo visual</h1>
        <Legenda>
          A plataforma é um instrumento de condução de tempo, não um painel de indicadores. A
          referência estrutural é o quadro de tarjas: cada grupo é uma ficha que atravessa portões
          numa régua. Cor significa estado — os dois tons de portão existem porque os documentos
          distinguem marco duro de triagem.
        </Legenda>
      </div>

      {/* ── Tela do instrutor, num dia de marco duro ───────────────────── */}
      <section>
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-clara-fraca">
          Instrutor · dia de marco duro
        </h2>
        <Legenda>
          Onze formulários para aprovar em 95 minutos. O portão tinge a régua e as divisórias; a
          tarja permanece clara, porque é onde se lê e se decide. Grupo bloqueado ganha barra na
          borda, não fundo vermelho.
        </Legenda>

        <div className="border border-regua-fraca">
          <Cabecalho dia={3} titulo="escopo" marco={{ nome: 'Marco 1', tipo: 'duro' }} />
          <ReguaDoDia
            blocos={RITMO_DE_MARCO}
            blocoCorrente={2}
            marco={{ nome: 'Marco 1', tipo: 'duro' }}
          />

          <div className="grid grid-cols-1 gap-3 bg-quadro p-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tarja
              integrantes={['Ana', 'Bruno']}
              tema="Barbearia"
              estado="submetido"
              pendencia="2 divergências mecânicas"
            />
            <Tarja
              integrantes={['Carla']}
              tema="Perícia Criminal"
              trilha="desafio"
              estado="submetido"
            />
            <Tarja integrantes={['Davi', 'Elis']} tema="Oficina mecânica" estado="aprovado" />
            <Tarja
              integrantes={['Fábio', 'Gabi']}
              tema="Escola de música"
              estado="devolvido"
              pendencia="C7 respondida com “a definir”"
              bloqueado
            />
            <Tarja integrantes={['Hugo', 'Iara']} tema={null} estado="rascunho" />
            <Tarja
              integrantes={['Joana', 'Kleber']}
              tema="Estúdio fotográfico"
              estado="submetido"
              pendencia="aguardando leitura"
            />
          </div>

          <footer className="flex items-baseline justify-between border-t border-regua-fraca bg-quadro-fundo px-3 py-2">
            <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-clara-fraca">
              fila de aprovação
            </span>
            <span className="dado text-[0.6875rem] text-clara-fraca">
              3 aguardando · 1 devolvido · 1 aprovado
            </span>
          </footer>
        </div>
      </section>

      {/* ── Tela do aluno, num dia comum ──────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-clara-fraca">
          Aluno · dia comum
        </h2>
        <Legenda>
          A pergunta condutora fica fixa, em serifada, porque é a única prosa permanente da tela. O
          que o dia cobra aparece como lista curta, e a nota é uma ausência declarada — não um card
          vazio dizendo “sem dados”.
        </Legenda>

        <div className="border border-regua-fraca">
          <Cabecalho
            dia={7}
            titulo="obstáculo 4"
            perguntaCondutora="Como um sistema representa um negócio que muda de regra sem reescrever tudo?"
          />
          <ReguaDoDia blocos={RITMO_DE_PAREDE} blocoCorrente={3} />

          <div className="grid grid-cols-1 gap-3 bg-quadro p-3 lg:grid-cols-[1fr_18rem]">
            <div className="flex flex-col gap-3">
              <Tarja
                integrantes={['Ana', 'Bruno']}
                tema="Barbearia"
                estado="aprovado"
                pendencia="contrato do dia não registrado"
              />

              <div className="bg-tarja px-4 py-3 text-tinta">
                <h3 className="text-[0.6875rem] uppercase tracking-[0.14em] text-tinta-fraca">
                  Hoje o dia cobra
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  <li>Contrato do dia — faremos e não faremos</li>
                  <li>Log do obstáculo 4</li>
                  <li>Push no repositório, no fechamento</li>
                </ul>
              </div>
            </div>

            <aside className="flex flex-col gap-3">
              <div className="bg-quadro-fundo px-3 py-3">
                <h3 className="text-[0.6875rem] uppercase tracking-[0.14em] text-clara-fraca">
                  Obstáculos superados
                </h3>
                <div className="mt-2 flex items-end gap-1" aria-hidden="true">
                  {[3, 2, 3, 1, 0, 0, 0].map((nota, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full"
                        style={{
                          height: `${8 + nota * 10}px`,
                          backgroundColor: `var(--color-escala-${nota})`,
                        }}
                      />
                      <span className="dado text-[0.625rem] text-clara-fraca">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <p className="dado mt-2 text-[0.6875rem] text-clara-fraca">
                  4 de 7 · superado é 1 ou mais
                </p>
              </div>

              {/* Ausência declarada, não card vazio. */}
              <div
                className="border border-dashed px-3 py-3"
                style={{ borderColor: 'var(--color-regua-fraca)' }}
              >
                <h3 className="text-[0.6875rem] uppercase tracking-[0.14em] text-clara-fraca">
                  Nota
                </h3>
                <p className="mt-1 font-prosa text-[0.8125rem] leading-snug text-clara-fraca">
                  Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para o
                  instrutor.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Tokens ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-clara-fraca">Paleta</h2>
        <div className="grid grid-cols-2 gap-px bg-regua-fraca sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['quadro', '#1F2A2E'],
            ['tarja', '#E8E4DA'],
            ['tinta', '#16201F'],
            ['régua', '#5C6B6E'],
            ['portão duro', '#C2352B'],
            ['portão triagem', '#C98A1E'],
          ].map(([nome, hex]) => (
            <div key={nome} className="bg-quadro-fundo p-3">
              <div className="mb-2 h-12 w-full" style={{ backgroundColor: hex }} />
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-clara-fraca">{nome}</p>
              <p className="dado text-[0.6875rem] text-clara-fraca">{hex}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
