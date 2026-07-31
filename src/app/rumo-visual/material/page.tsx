import { Bloco, type TipoDeBloco } from '@/components/material/blocos'
import { Casca, Etiqueta } from '@/components/ui'

export const metadata = { title: 'Material — espécimes de bloco' }

/**
 * Espécimes dos nove tipos de bloco.
 *
 * **Não é tela de produto.** É a continuação de `/rumo-visual`: a página onde o
 * sistema visual se mostra para ser julgado antes de entrar em aula. Quem abre
 * isto está decidindo layout, não conduzindo turma.
 *
 * O conteúdo é real, tirado do `docs/doc-11-paradigmas.md`, e por dois motivos.
 * Conteúdo inventado esconde exatamente os problemas que aparecem em aula —
 * tabela de cinco colunas, código longo, frase que não cabe. E os tipos existem
 * porque o padrão foi extraído dos decks que já existem (Doc 11 §10): julgá-los
 * com outro conteúdo julgaria outra coisa.
 *
 * Onde o documento usa vocabulário do curso, aqui está traduzido — a fronteira
 * do CLAUDE.md §3.1 vale para prosa também.
 */

type Especime = {
  tipo: TipoDeBloco
  funcao: string
  conteudo: string
  conteudoRevelado?: string
  nota?: string
}

const ESPECIMES: readonly Especime[] = [
  {
    tipo: 'tese',
    funcao: 'A afirmação central, em uma frase. Título + subtítulo',
    conteudo: `# O lugar onde o comportamento mora determina o custo da mudança

Não existe paradigma melhor. Existe paradigma melhor para um tipo de problema — e a escolha se paga, ou se cobra, na primeira vez que o requisito muda.`,
  },
  {
    tipo: 'ancoragem',
    funcao: '"Você já usa sem saber" — repertório do aluno',
    conteudo: `- \`map\` e \`filter\` numa lista de alunos — isso é funcional
- \`document.querySelector\` e um \`addEventListener\` — isso é imperativo
- \`new Date().getFullYear()\` — isso é uma pergunta feita a um objeto
- \`SELECT nome FROM alunos WHERE nota >= 7\` — isso é declarativo

Nenhum destes trechos foi escrito para esta aula.`,
  },
  {
    tipo: 'mecanismo',
    funcao: 'Como funciona, com analogia',
    conteudo: `No imperativo, você descreve **cada passo**: abre o laço, acumula, decide, formata. O programa é a receita.

No declarativo, você descreve **o resultado**, e quem decide como chegar lá é o sistema.

> A diferença aparece quando o pedido muda. Numa receita, mudar o prato é reescrever os passos. Numa descrição, é dizer outro prato.`,
  },
  {
    tipo: 'conceitos-2x2',
    funcao: 'Os conceitos que sustentam, em grid',
    conteudo: `## Onde o estado vive

Solto entre funções, ou guardado dentro do objeto que responde por ele.

## Quem decide o caminho

Você, passo a passo — ou o sistema, a partir do que você descreveu.

## O que muda no tempo

Os dados mudam, ou são substituídos por novos a cada transformação.

## Onde se procura o defeito

Linha a linha, por objeto, por função, ou no que foi declarado.`,
  },
  {
    tipo: 'codigo-anotado',
    funcao: 'Bloco de código com chamadas laterais',
    conteudo: `\`\`\`ts
function relatorio(alunos: Aluno[]) {
  let soma = 0
  for (let i = 0; i < alunos.length; i++) {
    soma += alunos[i].nota
  }
  const media = soma / alunos.length
  return alunos.map((a) =>
    a.nota >= 7 ? \`\${a.nome}: aprovado\` : \`\${a.nome}: reprovado\`
  )
}
\`\`\`

1. O laço acumula — e é aqui que a exceção vai ter de entrar
2. A média divide por todos, sem exceção declarada
3. O critério de aprovação está escrito aqui
4. E aparece de novo na formatação, com outro nome`,
  },
  {
    tipo: 'forcas-limites',
    funcao: 'Pontos fortes e limitações, lado a lado',
    conteudo: `## Onde ele ganha

- Transformar uma lista em outra
- Cálculo puro, sem estado
- Rastrear defeito por função isolada

## Onde ele custa

- Passar contexto por toda a cadeia de transformações
- Regra de negócio com ciclo de vida
- Restrição que precisa valer sempre, em qualquer ponto`,
  },
  {
    tipo: 'matriz-comparativa',
    funcao: 'Tabela de comparação entre abordagens',
    nota: 'É este que vira o comparador de quatro lentes: encoste numa linha.',
    conteudo: `| | Imperativo | OO | Funcional | Declarativo |
|---|---|---|---|---|
| **Controle** | Cada passo | Cada objeto | Cada transformação | Só o resultado |
| **Os dados** | Mudam no tempo | Vivem no objeto | Nunca são alterados | Você só descreve |
| **Local da lógica** | Funções e laços soltos | Métodos do objeto | Funções puras encadeadas | Regras declaradas |
| **Rastreabilidade** | Linha a linha | Por objeto | Por função | O sistema decide |
| **Onde já usaram** | JS inicial | DOM, React, \`class\` | \`map\`, \`filter\` | SQL, HTML, CSS, JSX |`,
  },
  {
    tipo: 'predicao',
    funcao: 'Pergunta com aposta registrada antes da revelação',
    conteudo: `> Na versão imperativa, quantos lugares do código você precisa abrir para atender esse pedido?

- 1
- 2
- 3
- mais de 3`,
    conteudoRevelado: `São quatro, e o critério de aprovação acaba escrito em dois lugares.

1. O laço que soma as notas
2. A condição de aprovação, que agora depende de dois dados
3. Um caminho novo para o critério de recuperação
4. A formatação da saída, que precisa distinguir três casos`,
  },
  {
    tipo: 'classificador',
    funcao: 'Cartões atribuídos a categorias',
    nota: 'A interação de arrastar cartão para alvo ainda não está desenhada.',
    conteudo: `| # | Trecho |
|---|---|
| 1 | \`itens.filter(i => i.ativo).map(i => i.nome)\` |
| 2 | \`for (let i = 0; i < lista.length; i++) { soma += lista[i]; }\` |
| 3 | \`turma.gerarRelatorio()\` |
| 4 | \`document.querySelector("#btn").addEventListener("click", salvar)\` |

Categorias: imperativo · orientado a objetos · funcional · declarativo`,
  },
]

export default function EspecimesDeMaterial() {
  return (
    <Casca>
      <header>
        <p className="legenda">rumo visual · material</p>
        <h1 className="mt-3 max-w-[24ch] font-prosa text-[2.5rem] leading-[1.1] tracking-tight text-tinta">
          Os nove tipos de <span className="pilula">bloco</span>
        </h1>
        <p className="mt-4 max-w-[62ch] text-[1.0625rem] leading-relaxed text-tinta-media">
          O conteúdo destes espécimes é real, tirado do documento de paradigmas.
          O tipo decide só a renderização — a plataforma não gera conteúdo, e não
          sabe qual resposta é a certa.
        </p>
        <p className="mao mt-5 -rotate-1">é o layout que se julga aqui, não o texto</p>
      </header>

      {ESPECIMES.map((especime) => (
        <section key={especime.tipo} className="border-t border-linha pt-9">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <Etiqueta tom="tinta">{especime.tipo}</Etiqueta>
            <p className="legenda">{especime.funcao}</p>
          </div>
          {especime.nota && (
            <p className="mao mt-3 -rotate-1 text-destaque">{especime.nota}</p>
          )}

          {/* Antes da revelação: o revelado vai NULO de propósito, para o
              espécime mostrar o que a sala vê enquanto ainda está apostando. */}
          <div className="cartao mt-6 px-6 py-7">
            <Bloco tipo={especime.tipo} conteudo={especime.conteudo} conteudoRevelado={null} />
          </div>

          {especime.conteudoRevelado && (
            <>
              <p className="legenda mt-5">o mesmo bloco, depois da revelação</p>
              <div className="cartao mt-2 px-6 py-7">
                <Bloco
                  tipo={especime.tipo}
                  conteudo={especime.conteudo}
                  conteudoRevelado={especime.conteudoRevelado}
                />
              </div>
            </>
          )}
        </section>
      ))}
    </Casca>
  )
}
