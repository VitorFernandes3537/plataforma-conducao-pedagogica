import { DesafioAtual } from '@/components/desafio-atual'
import { LinhaDeVida } from '@/components/linha-de-vida'
import { PerguntaCondutora } from '@/components/pergunta-condutora'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { TarjaEmAcao, TarjaResolvida, type DadosDaTarja } from '@/components/tarja'

export const metadata = { title: 'Design system — PCP' }

// Apresentação do design system. Dados fixos, nenhuma consulta ao banco.
// Deriva de docs/referencias-de-design/LEIA-PRIMEIRO.md §7 e da ADR 0003.

const RITMO = [
  { tipo: 'abertura', duracaoMinutos: 20 },
  { tipo: 'tentativa', duracaoMinutos: 40 },
  { tipo: 'demonstração', duracaoMinutos: 30 },
  { tipo: 'implementação', duracaoMinutos: 75 },
  { tipo: 'fechamento', duracaoMinutos: 15 },
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
]

function Secao({
  numero,
  titulo,
  regra,
  children,
}: {
  numero: string
  titulo: string
  regra?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-filete pt-8">
      <div className="flex items-baseline gap-3">
        <span className="dado text-[0.6875rem] text-tinta-tenue">{numero}</span>
        <h2 className="text-base font-semibold tracking-tight text-tinta">{titulo}</h2>
      </div>
      {regra && (
        <p className="mt-1.5 max-w-[68ch] font-prosa text-sm leading-relaxed text-tinta-media">
          {regra}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Amostra({ nome, valor, cor, escura }: { nome: string; valor: string; cor: string; escura?: boolean }) {
  return (
    <div>
      <div
        className="flex h-16 items-end justify-end rounded-[var(--radius-controle)] border border-filete p-2"
        style={{ backgroundColor: cor }}
      >
        <span
          className={`dado text-[0.5625rem] ${escura ? 'text-superficie' : 'text-tinta-fraca'}`}
        >
          {valor}
        </span>
      </div>
      <p className="legenda mt-1.5">{nome}</p>
    </div>
  )
}

export default function DesignSystem() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header>
        <p className="legenda">design system</p>
        <h1 className="mt-2 max-w-[30ch] font-prosa text-3xl leading-tight text-tinta">
          Plataforma de Condução Pedagógica
        </h1>
        <p className="mt-3 max-w-[68ch] font-prosa text-[0.9375rem] leading-relaxed text-tinta-media">
          Dez regras, e nenhuma delas é gosto: todas vêm de convergência entre Notion, User
          Interviews e Tally. A interface conduz — tem jeito próprio, mas não disputa atenção com o
          conteúdo. Quem tem que ser lido é a pergunta do aluno.
        </p>
      </header>

      {/* ── 01 · Superfície ─────────────────────────────────────────── */}
      <Secao
        numero="01"
        titulo="Superfície"
        regra="Canvas morno, nunca branco puro e nunca frio. Cartão branco por cima. A hierarquia é por tom — nenhuma sombra existe no sistema."
      >
        <div className="grid grid-cols-3 gap-4">
          <Amostra nome="canvas" valor="#F7F5F1" cor="#f7f5f1" />
          <Amostra nome="superfície" valor="#FFFFFF" cor="#ffffff" />
          <Amostra nome="superfície fraca" valor="#F1EFE9" cor="#f1efe9" />
        </div>
      </Secao>

      {/* ── 02 · Tinta ──────────────────────────────────────────────── */}
      <Secao
        numero="02"
        titulo="Tinta"
        regra="Quatro níveis de uma tinta só. Nenhum cinza novo entra no sistema — hierarquia se constrói por alfa da mesma cor, não por inventar tons."
      >
        <div className="grid grid-cols-4 gap-4">
          <Amostra nome="tinta" valor="#1A1917" cor="#1a1917" escura />
          <Amostra nome="média" valor="#56534D" cor="#56534d" escura />
          <Amostra nome="fraca" valor="#86827A" cor="#86827a" escura />
          <Amostra nome="tênue" valor="#B0ABA2" cor="#b0aba2" />
        </div>
        <div className="cartao mt-4 px-5 py-4">
          <p className="text-[0.9375rem] text-tinta">Texto primário — decisão e conteúdo</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-media">Secundário — apoio e detalhe</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-fraca">Fraco — rótulo e meta</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-tenue">Tênue — numeração e divisa</p>
        </div>
      </Secao>

      {/* ── 03 · As três cores com função ───────────────────────────── */}
      <Secao
        numero="03"
        titulo="Ação, expressão e portão"
        regra="Cor significa função, e as três nunca se cruzam. Ação é o único preenchimento cromático de botão — uma por tela. Expressão nunca preenche botão nem colore link. Portão é estado bloqueante, e é raro."
      >
        <div className="grid grid-cols-3 gap-4">
          <Amostra nome="ação · teal" valor="#1C5D5F" cor="#1c5d5f" escura />
          <Amostra nome="expressão · âmbar" valor="#C4831F" cor="#c4831f" escura />
          <Amostra nome="portão · vermelho" valor="#B3321F" cor="#b3321f" escura />
        </div>

        <div className="cartao mt-4 flex flex-wrap items-center gap-3 px-5 py-4">
          <button type="button" className="botao botao-acao">
            Aprovar escopo
          </button>
          <button type="button" className="botao botao-fantasma">
            Ver formulário
          </button>
          <button type="button" className="botao botao-texto">
            Cancelar
          </button>
          <button type="button" className="botao botao-portao">
            Devolver
          </button>
        </div>
        <p className="legenda mt-2">
          um preenchimento cromático por tela · o resto defere
        </p>
      </Secao>

      {/* ── 04 · Escala de obstáculo ────────────────────────────────── */}
      <Secao
        numero="04"
        titulo="Escala de obstáculo"
        regra="D6-ESCALA. Rampa sequencial que enche, não semáforo que alerta. Zero é o estado antes da tentativa, não reprovação — por isso não é vermelho. Termina na cor de ação, porque o fim da escala é domínio."
      >
        <div className="grid max-w-md grid-cols-4 gap-4">
          <Amostra nome="0" valor="#E5E2DA" cor="#e5e2da" />
          <Amostra nome="1" valor="#A8C4BE" cor="#a8c4be" />
          <Amostra nome="2" valor="#5E938E" cor="#5e938e" escura />
          <Amostra nome="3" valor="#1C5D5F" cor="#1c5d5f" escura />
        </div>
        <div className="cartao mt-4 max-w-sm px-5 py-4">
          <LinhaDeVida
            passos={[
              { ordem: 1, nota: 3 },
              { ordem: 2, nota: 2 },
              { ordem: 3, nota: 3 },
              { ordem: 4, nota: null },
              { ordem: 5, nota: null },
            ]}
          />
        </div>
      </Secao>

      {/* ── 05 · Tipografia ────────────────────────────────────────── */}
      <Secao
        numero="05"
        titulo="Tipografia"
        regra="Três registros com três trabalhos. Nenhum faz o trabalho do outro."
      >
        <div className="flex flex-col gap-4">
          <div className="cartao px-5 py-4">
            <p className="legenda">archivo · corpo de interface</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-tinta">
              Fila de aprovação
            </p>
            <p className="mt-1 text-[0.9375rem] text-tinta-media">
              Rótulo, título, botão e tabela. O trabalho invisível.
            </p>
          </div>

          <div className="cartao px-5 py-4">
            <p className="legenda">ibm plex mono · legenda técnica e todo número</p>
            <p className="dado mt-2 text-2xl font-medium tracking-tight text-tinta">
              20 · 40 · 30 · 75 · 15
            </p>
            <p className="mt-1 text-[0.9375rem] text-tinta-media">
              Numeral tabular é requisito, não estilo: coluna que dança é ilegível sob pressão.
            </p>
          </div>

          <div className="cartao px-5 py-4">
            <p className="legenda">literata · prosa de aluno, com parcimônia</p>
            <p className="mt-2 max-w-[34ch] font-prosa text-2xl leading-tight text-tinta">
              E se o cliente cancelar depois de o atendimento já ter começado?
            </p>
            <p className="mt-2 text-[0.9375rem] text-tinta-media">
              A pergunta do aluno, o log, a reflexão, o briefing. Nunca rótulo de interface.
            </p>
          </div>
        </div>
      </Secao>

      {/* ── 06 · Forma ─────────────────────────────────────────────── */}
      <Secao
        numero="06"
        titulo="Forma"
        regra="Cartão 10px, controle 8px, etiqueta redonda. Filete de 1px em vez de sombra — a profundidade vem do contraste de superfície, não de elevação. Sem gradiente, sem malha."
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="cartao flex h-20 w-32 items-center justify-center">
            <span className="legenda">cartão 10px</span>
          </div>
          <div className="flex h-10 items-center rounded-[var(--radius-controle)] border border-filete bg-superficie px-4">
            <span className="legenda">controle 8px</span>
          </div>
          <span className="etiqueta border border-filete-forte text-tinta-media">etiqueta</span>
          <span className="etiqueta bg-acao-tenue text-acao">desafio</span>
          <span
            className="etiqueta border"
            style={{ borderColor: 'var(--color-portao)', color: 'var(--color-portao)' }}
          >
            bloqueado
          </span>
        </div>
      </Secao>

      {/* ── 07 · Marca binária e ausência ──────────────────────────── */}
      <Secao
        numero="07"
        titulo="Marca binária e ausência declarada"
        regra="Critério de superação é binário (Doc 3 §2), então a marca é binária: cheia ou vazia, sem porcentagem. E o que ainda não existe recebe forma própria — filete tracejado — em vez de card vazio dizendo “sem dados”. Card vazio parece defeito; ausência declarada parece regra."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="cartao px-5 py-4">
            <p className="legenda">marca binária</p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {[
                ['O cancelamento não apaga o histórico', true],
                ['Cada estado recusa transições impossíveis', false],
              ].map(([texto, feito]) => (
                <li key={texto as string} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.3rem] size-[0.875rem] shrink-0 rounded-[2px] border"
                    style={{
                      borderColor: feito ? 'var(--color-escala-3)' : 'var(--color-filete-forte)',
                      backgroundColor: feito ? 'var(--color-escala-3)' : 'transparent',
                    }}
                  />
                  <span
                    className={`text-[0.875rem] leading-snug ${feito ? 'text-tinta-media' : 'text-tinta'}`}
                  >
                    {texto}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-cartao)] border border-dashed border-filete-forte px-5 py-4">
            <p className="legenda">nota</p>
            <p className="mt-1.5 font-prosa text-[0.875rem] leading-snug text-tinta-fraca">
              Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para o
              instrutor.
            </p>
          </div>
        </div>
      </Secao>

      {/* ── 08 · A régua do dia ────────────────────────────────────── */}
      <Secao
        numero="08"
        titulo="A régua do dia"
        regra="A peça de assinatura. As larguras SÃO as durações: 75 minutos ocupam cinco vezes o espaço de 15, sem largura mínima. O marcador de decorrido é o que a faz instrumento e não legenda. Mostrada em largura cheia porque é assim que ela vive no aplicativo — é a largura real que faz o rótulo do bloco curto caber."
      >
        {/* Sangra fora do contêiner: a régua é de largura cheia no aplicativo,
            e apertá-la aqui truncaria o rótulo de 15 min — mentindo sobre ela. */}
        <div className="-mx-6 flex flex-col gap-4 lg:-mx-[max(1.5rem,calc((100vw-64rem)/2))]">
          <ReguaDoDia
            dia={7}
            rotuloDoDia="ritmo de obstáculo"
            contexto="ana e bruno · barbearia"
            blocos={RITMO}
            blocoCorrente={3}
            decorridosNoBloco={41}
          />
          <ReguaDoDia
            dia={3}
            rotuloDoDia="escopo"
            contexto="6 grupos"
            blocos={[
              { tipo: 'abertura', duracaoMinutos: 20 },
              { tipo: 'preenchimento', duracaoMinutos: 65 },
              { tipo: 'aprovação', duracaoMinutos: 95 },
            ]}
            blocoCorrente={2}
            decorridosNoBloco={38}
            marco={{ nome: 'Marco 1', tipo: 'duro' }}
          />
          <p className="legenda">
            marco duro usa filete sólido · triagem usa tracejado · a cor de portão é uma só
          </p>
        </div>
      </Secao>

      {/* ── 09 · Composições ───────────────────────────────────────── */}
      <Secao
        numero="09"
        titulo="Composições"
        regra="O herói da tela do aluno é a pergunta dele, não o rótulo “obstáculo 4” (Doc 3 §2). Na fila do instrutor a hierarquia é por tamanho: quem exige decisão cresce e mostra o sintoma, quem fechou encolhe para uma linha."
      >
        <div className="flex flex-col gap-4">
          <div className="cartao overflow-hidden">
            <PerguntaCondutora texto="Como um sistema representa um negócio que muda de regra sem reescrever tudo?" />
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FILA.map((tarja) => (
              <TarjaEmAcao key={tarja.integrantes.join()} {...tarja} />
            ))}
          </div>

          <div className="cartao max-w-2xl px-5 py-4">
            <p className="legenda">fechados</p>
            <div className="mt-1.5">
              <TarjaResolvida
                integrantes={['Davi', 'Elis']}
                tema="Oficina mecânica"
                estado="aprovado"
              />
              <TarjaResolvida
                integrantes={['Joana', 'Kleber']}
                tema="Estúdio fotográfico"
                estado="aprovado"
              />
            </div>
          </div>
        </div>
      </Secao>

      {/* ── 10 · O que fica de fora ────────────────────────────────── */}
      <Secao
        numero="10"
        titulo="O que fica de fora"
        regra="Um sistema é também o que ele recusa."
      >
        <ul className="flex max-w-[68ch] flex-col gap-2 text-[0.9375rem] text-tinta-media">
          {[
            'Sombra em cartão de conteúdo — a separação é por tom e filete',
            'Gradiente, vidro, brilho',
            'Malha, grade ou textura de fundo — “papel” se faz por temperatura de cor',
            'Um segundo botão cromático na mesma tela',
            'Expressão preenchendo botão, ou ação decorando',
            'Ícone em superfície de decisão — rótulo escrito é mais preciso sob pressão',
            'Traço à mão onde não espelha algo físico',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-filete-forte" />
              {item}
            </li>
          ))}
        </ul>
      </Secao>
    </main>
  )
}
