import { DesafioAtual } from '@/components/desafio-atual'
import { LinhaDeVida } from '@/components/linha-de-vida'
import {
  MarcaBilhete,
  MarcaFaisca,
  MarcaLaco,
  MarcaObstaculo,
  MarcaProduto,
  MarcaSeta,
} from '@/components/marcas'
import { PerguntaCondutora } from '@/components/pergunta-condutora'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { TarjaEmAcao, TarjaResolvida, type DadosDaTarja } from '@/components/tarja'

export const metadata = { title: 'Design system — PCP' }

// Apresentação do design system. Dados fixos, nenhuma consulta ao banco.
// Deriva de docs/referencias-de-design/LEIA-PRIMEIRO.md e da ADR 0003.

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
    <section className="border-t border-linha pt-9">
      <div className="flex items-baseline gap-3">
        <span className="dado text-[0.6875rem] text-tinta-tenue">{numero}</span>
        <h2 className="text-base font-semibold tracking-tight text-tinta">{titulo}</h2>
      </div>
      {regra && (
        <p className="mt-2 max-w-[66ch] font-prosa text-sm leading-relaxed text-tinta-media">
          {regra}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Amostra({
  nome,
  valor,
  clara,
}: {
  nome: string
  valor: string
  clara?: boolean
}) {
  return (
    <div>
      <div
        className="flex h-16 items-end justify-end rounded-[var(--radius-controle)] border border-linha p-2"
        style={{ backgroundColor: valor }}
      >
        <span className={`dado text-[0.5625rem] ${clara ? 'text-tinta-fraca' : 'text-superficie'}`}>
          {valor.toUpperCase()}
        </span>
      </div>
      <p className="legenda mt-1.5">{nome}</p>
    </div>
  )
}

export default function DesignSystem() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-11 px-6 py-14">
      {/* ── Abertura, com as marcas na margem ────────────────────────── */}
      {/* As marcas ficam FORA da coluna de texto, na margem de verdade. A
          versão anterior as jogava por cima do parágrafo — exatamente o que a
          regra do sistema proíbe. */}
      <header className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -right-40 hidden w-36 xl:block">
          <MarcaFaisca className="absolute right-16 top-1 w-6 text-destaque" />
          <MarcaSeta className="absolute right-0 top-16 w-24 -scale-x-100 text-tinta-tenue" />
          <MarcaObstaculo className="absolute bottom-2 right-4 w-24 text-tinta-tenue" />
        </div>

        <p className="legenda">design system</p>
        <h1 className="mt-3 max-w-[26ch] font-prosa text-[2.5rem] leading-[1.1] tracking-tight text-tinta">
          Uma plataforma que <span className="pilula">conduz</span>
        </h1>
        <p className="mt-4 max-w-[62ch] font-prosa text-base leading-relaxed text-tinta-media">
          Parede de ateliê: marfim claro, traço de lápis na margem, serifada com voz e acento
          saturado. Educacional sem ser corporativo, autoral sem ser infantil. A interface tem jeito
          próprio, mas quem tem que ser lido é o aluno.
        </p>
        <p className="mao mt-5 -rotate-2">o desenho conduz, não desfila</p>
      </header>

      {/* ── 01 · Superfície ─────────────────────────────────────────── */}
      <Secao
        numero="01"
        titulo="Superfície"
        regra="Marfim claro, nunca bege lavado. A diferença entre papel e cartão é sutil de propósito — mas o cartão tem filete, então a separação nunca depende só do tom. Nenhuma sombra existe no sistema."
      >
        <div className="grid grid-cols-3 gap-4">
          <Amostra nome="papel" valor="#fcfbf6" clara />
          <Amostra nome="superfície" valor="#ffffff" clara />
          <Amostra nome="recuo" valor="#f4f2ea" clara />
        </div>
      </Secao>

      {/* ── 02 · Tinta ──────────────────────────────────────────────── */}
      <Secao
        numero="02"
        titulo="Tinta"
        regra="Quatro níveis de uma tinta só. Nenhum cinza novo entra no sistema — hierarquia se constrói por alfa da mesma cor, não por inventar tons."
      >
        <div className="grid grid-cols-4 gap-4">
          <Amostra nome="tinta" valor="#17150f" />
          <Amostra nome="média" valor="#4a4640" />
          <Amostra nome="fraca" valor="#7c776d" />
          <Amostra nome="tênue" valor="#ada79a" />
        </div>
        <div className="cartao mt-4 px-5 py-4">
          <p className="text-[0.9375rem] text-tinta">Texto primário — decisão e conteúdo</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-media">Secundário — apoio e detalhe</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-fraca">Fraco — rótulo e meta</p>
          <p className="mt-1 text-[0.9375rem] text-tinta-tenue">Tênue — numeração e traço</p>
        </div>
      </Secao>

      {/* ── 03 · Cor com função ─────────────────────────────────────── */}
      <Secao
        numero="03"
        titulo="Ação, destaque e portão"
        regra="Três funções, e nunca se cruzam. A ação é tinta cheia: botão preto resolve “uma cor de ação” sem gastar cromia, e deixa o acento livre para ser expressivo. O destaque é azul saturado e nunca preenche botão. O portão é laranja-tijolo, e é raro."
      >
        <div className="grid grid-cols-3 gap-4">
          <Amostra nome="ação · tinta" valor="#17150f" />
          <Amostra nome="destaque · azul" valor="#2a5fd6" />
          <Amostra nome="portão · tijolo" valor="#dc4b1e" />
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
        <p className="legenda mt-2.5">uma ação por tela · o resto defere</p>
      </Secao>

      {/* ── 04 · Traço à mão ────────────────────────────────────────── */}
      <Secao
        numero="04"
        titulo="Traço à mão"
        regra="Desenhado em SVG, não ícone de biblioteca — as curvas têm assimetria proposital, porque traço perfeito lê como ícone e traço torto lê como mão. Vive na margem, e só onde espelha algo físico: o mural é uma parede de papel na sala (Doc 7 §6), o obstáculo é um muro. Nunca em superfície de decisão sob pressão."
      >
        <div className="cartao grid grid-cols-3 gap-6 px-6 py-7 sm:grid-cols-6">
          {[
            [MarcaObstaculo, 'obstáculo'],
            [MarcaBilhete, 'mural'],
            [MarcaProduto, 'produto'],
            [MarcaSeta, 'seta'],
            [MarcaLaco, 'laço'],
            [MarcaFaisca, 'faísca'],
          ].map(([Marca, nome]) => {
            const Componente = Marca as typeof MarcaObstaculo
            return (
              <div key={nome as string} className="flex flex-col items-center gap-3">
                <Componente className="h-14 w-auto text-tinta-media" />
                <span className="legenda">{nome as string}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-8">
          <p className="mao -rotate-1">anotação de margem</p>
          <p className="mao rotate-1 text-destaque">isto libera no fechamento!</p>
          <div className="relative">
            <span className="text-[0.9375rem] text-tinta">envolve o que importa</span>
            <MarcaLaco className="pointer-events-none absolute -inset-x-4 -inset-y-3 h-auto w-[calc(100%+2rem)] text-destaque" />
          </div>
        </div>
      </Secao>

      {/* ── 05 · Tipografia ────────────────────────────────────────── */}
      <Secao
        numero="05"
        titulo="Tipografia"
        regra="Quatro registros com quatro trabalhos. Nenhum faz o trabalho do outro, e a mão só anota."
      >
        <div className="flex flex-col gap-4">
          <div className="cartao px-5 py-4">
            <p className="legenda">literata · voz — título de tela e prosa de aluno</p>
            <p className="mt-2 max-w-[32ch] font-prosa text-2xl leading-tight text-tinta">
              E se o cliente cancelar depois de o atendimento já ter começado?
            </p>
          </div>
          <div className="cartao px-5 py-4">
            <p className="legenda">archivo · corpo de interface</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-tinta">Fila de aprovação</p>
            <p className="mt-1 text-[0.9375rem] text-tinta-media">
              Rótulo, botão, tabela. O trabalho invisível.
            </p>
          </div>
          <div className="cartao px-5 py-4">
            <p className="legenda">ibm plex mono · legenda e todo número</p>
            <p className="dado mt-2 text-xl font-medium tracking-tight text-tinta">
              20 · 40 · 30 · 75 · 15
            </p>
            <p className="mt-1 text-[0.9375rem] text-tinta-media">
              Numeral tabular é requisito: coluna que dança é ilegível sob pressão.
            </p>
          </div>
          <div className="cartao px-5 py-4">
            <p className="legenda">caveat · mão — só anotação de margem</p>
            <p className="mao mt-2 -rotate-1 text-xl">rever isso antes do fechamento</p>
          </div>
        </div>
      </Secao>

      {/* ── 06 · Forma ─────────────────────────────────────────────── */}
      <Secao
        numero="06"
        titulo="Forma"
        regra="Cartão 12px, controle 8px, etiqueta redonda. Filete de 1px em vez de sombra. A pílula atrás de uma palavra é o device tipográfico da casa — envolve uma palavra do título, como marca-texto."
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="cartao flex h-20 w-32 items-center justify-center">
            <span className="legenda">cartão 12px</span>
          </div>
          <div className="flex h-10 items-center rounded-[var(--radius-controle)] border border-linha bg-superficie px-4">
            <span className="legenda">controle 8px</span>
          </div>
          <span className="etiqueta border border-linha-forte text-tinta-media">etiqueta</span>
          <span className="etiqueta bg-destaque-tenue text-destaque">desafio</span>
          <span
            className="etiqueta border"
            style={{ borderColor: 'var(--color-portao)', color: 'var(--color-portao)' }}
          >
            bloqueado
          </span>
        </div>
      </Secao>

      {/* ── 07 · Escala de obstáculo ───────────────────────────────── */}
      <Secao
        numero="07"
        titulo="Escala de obstáculo"
        regra="D6-ESCALA. Rampa que enche, não semáforo que alerta. Zero não é vermelho: é o estado antes da tentativa, não reprovação (Doc 6 §2). Termina no azul de destaque porque o fim da escala é domínio."
      >
        <div className="grid max-w-md grid-cols-4 gap-4">
          <Amostra nome="0" valor="#eae6da" clara />
          <Amostra nome="1" valor="#a9bee8" clara />
          <Amostra nome="2" valor="#5c86d8" />
          <Amostra nome="3" valor="#2a5fd6" />
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

      {/* ── 08 · A régua do dia ────────────────────────────────────── */}
      <Secao
        numero="08"
        titulo="A régua do dia"
        regra="Uma faixa só. As larguras SÃO as durações: 75 minutos ocupam cinco vezes o espaço de 15. O decorrido não preenche caixa — antes era bloco bege sobre fundo bege, mancha suja e invisível. Agora é fio de tinta na base, com contraste de verdade em 2px."
      >
        {/* Sangra fora do contêiner: no aplicativo ela é de largura cheia, e
            apertá-la truncaria o rótulo de 15 min, mentindo sobre a proporção. */}
        <div className="-mx-6 flex flex-col gap-5 lg:-mx-[max(1.5rem,calc((100vw-64rem)/2))]">
          <ReguaDoDia
            dia={7}
            contexto="ana e bruno · barbearia"
            blocos={RITMO}
            blocoCorrente={3}
            decorridosNoBloco={41}
          />
          <ReguaDoDia
            dia={3}
            contexto="6 grupos · escopo"
            blocos={[
              { tipo: 'abertura', duracaoMinutos: 20 },
              { tipo: 'preenchimento', duracaoMinutos: 65 },
              { tipo: 'aprovação', duracaoMinutos: 95 },
            ]}
            blocoCorrente={2}
            decorridosNoBloco={38}
            marco={{ nome: 'Marco 1', tipo: 'duro' }}
          />
        </div>
        <p className="legenda mt-4">marco duro é filete sólido · triagem é tracejado</p>
      </Secao>

      {/* ── 09 · Composições ───────────────────────────────────────── */}
      <Secao
        numero="09"
        titulo="Composições"
        regra="O herói da tela do aluno é a pergunta dele, não o rótulo “obstáculo 4” (Doc 3 §2). Na fila do instrutor a hierarquia é por tamanho: quem exige decisão cresce e mostra o sintoma, quem fechou encolhe para uma linha."
      >
        <div className="flex flex-col gap-5">
          <div className="cartao relative overflow-hidden">
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
            <MarcaObstaculo className="pointer-events-none absolute -bottom-2 right-5 w-24 text-tinta-tenue/60" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {FILA.map((tarja) => (
              <TarjaEmAcao key={tarja.integrantes.join()} {...tarja} />
            ))}
          </div>

          <div className="cartao max-w-2xl px-5 py-4">
            <p className="legenda">fechados</p>
            <div className="mt-2">
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

          <div className="relative max-w-sm rounded-[var(--radius-cartao)] border border-dashed border-linha-forte px-5 py-4">
            <p className="legenda">nota</p>
            <p className="mt-2 font-prosa text-[0.875rem] leading-snug text-tinta-fraca">
              Aparece no D15, depois da agregação. Até lá não existe — nem para você, nem para o
              instrutor.
            </p>
            <p className="mao absolute -right-2 -top-5 rotate-3">ausência é regra, não defeito</p>
          </div>
        </div>
      </Secao>

      {/* ── 10 · O que fica de fora ────────────────────────────────── */}
      <Secao numero="10" titulo="O que fica de fora" regra="Um sistema é também o que ele recusa.">
        <ul className="flex max-w-[66ch] flex-col gap-2 text-[0.9375rem] text-tinta-media">
          {[
            'Bege lavado, pastel desbotado, dois tons vizinhos fingindo hierarquia',
            'Sombra em cartão de conteúdo — a separação é filete e tom',
            'Gradiente, vidro, brilho',
            'Malha, grade ou textura de fundo',
            'Um segundo preenchimento de botão na mesma tela',
            'Destaque preenchendo botão, ou ação decorando',
            'Ícone de biblioteca em superfície de decisão — rótulo escrito é mais preciso',
            'Traço à mão onde não espelha algo físico, ou carregando informação única',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-linha-forte" />
              {item}
            </li>
          ))}
        </ul>
      </Secao>
    </main>
  )
}
