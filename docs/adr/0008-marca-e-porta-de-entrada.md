# ADR 0008 — A marca, e a porta por onde se entra

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-31 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega design visual ao desenvolvedor |
| **Fecha pendência de** | ADR 0002, "Identidade visual — continua pendente desde a ADR 0001". A ADR 0003 fechou metade dela: paleta e tipografia, não marca |
| **Esclarece** | ADR 0003 §7, sem alterar a decisão que ela tomou |
| **Não altera** | Nenhum documento da série |

---

## Contexto

Duas ausências, e a segunda é maior que a primeira.

**Não havia marca.** `public/` vazio, nenhum logotipo, nenhum símbolo, e o
`favicon.ico` do `create-next-app` intocado desde o scaffold.

**Não havia tela de login.** `src/lib/auth.ts` não configurava a chave `pages`,
então o Auth.js servia a página padrão dele: fora do layout raiz, com
`<html lang="en">`, um botão escrito "Sign in with GitHub", nenhuma das fontes do
projeto, e um `@media (prefers-color-scheme: dark)` que o `color-scheme: light`
do `globals.css` não alcança — é outro documento. O proxy mandava o instrutor
para lá, e a tela do aluno também. **Todo mundo passava por ali.**

E é caro passar por ali. O Doc 4 §3 reserva um bloco do D1 para tour da
plataforma e cadastro, e a ADR 0006 §4 lista o momento: é o primeiro contato de
uma turma inteira com o produto. Uma tela em inglês que só diz "Sign in" gasta
esse bloco fazendo o instrutor explicar o que a tela devia ter dito sozinha.

---

## Decisão

### 1. O logotipo é tipográfico, monocromático, e não tem símbolo

`PCP` em Literata semibold, com o nome por extenso embaixo em `.legenda`. Duas
medidas: `casca` para topo de tela e `abertura` para a porta.

Literata e não Archivo, e não a monoespaçada. A ADR 0003 §4 dá a serifada a
"título de tela e prosa de aluno" e proíbe rótulo — o logotipo é o caso limite,
porque é o título do produto inteiro. A monoespaçada faria a marca ler como
etiqueta de sistema, que é exatamente o que a §4 reserva para legenda e número.

As duas fontes de texto do projeto entram sem peso declarado em `layout.tsx`,
então são variáveis e o eixo inteiro está disponível. A Caveat não: ela vem com
400 e 600 só, e pedir 700 sintetizaria peso em silêncio. Ela também não entraria
por outro motivo — mão nunca é interface.

### 2. A régua do dia continua sendo a assinatura. O logotipo não é assinatura

A ADR 0003 §7 chama-se "Signature: a régua do dia". A frase **fica como está**, e
a razão é que as duas peças não disputam o mesmo lugar:

| | O que faz | Carrega informação? |
|---|---|---|
| **Régua do dia** | torna o produto reconhecível de longe e **mostra a forma do dia** | sim: as larguras são as durações |
| **Logotipo** | nomeia o produto | não |

Assinatura, no sentido em que a §7 usa a palavra, é o elemento de interface que
se reconhece antes de ler — e que ainda assim está trabalhando. Um logotipo não
trabalha: ele identifica. Um produto pode ter os dois, e este tem.

O que precisa ficar escrito é a **ordem**, porque logotipo cresce sozinho:

1. Onde há régua, o logotipo é `casca` e nunca disputa peso com ela.
2. A medida `abertura` só existe onde **não** há régua — a porta pública e a tela
   de entrada. São as duas únicas telas em que o produto precisa dizer o próprio
   nome, porque são as duas únicas em que a pessoa ainda não entrou no dia.
3. Se um dia as duas aparecerem juntas em tamanho comparável, a régua ganha.

**Nota de fato, não decisão:** a ADR 0003 afirma em dois pontos que a régua fica
"no topo de toda tela" e é "largura cheia no aplicativo". Hoje ela é renderizada
em **uma** tela, e em nenhuma do aluno. A afirmação está adiante do código. Quem
resolve isso é a fila de telas da ADR 0006, não esta ADR — mas quem ler a §7
esperando encontrar a régua em toda parte precisa saber que ainda não encontra.

### 3. Nenhuma das seis marcas à mão vira logotipo

A ADR 0003 §4.1 põe as marcas de `src/components/marcas.tsx` **na margem**, fora
da coluna de texto, nunca em superfície de decisão sob pressão, e só onde
espelham algo físico.

Promover o muro ou o bilhete a logotipo violaria as três partes de uma vez. O
cabeçalho é superfície de decisão; ele está no meio, não na margem; e — o pior —
um muro no topo de uma tela de login não espelha nada que exista na sala. A marca
à mão diz "isto aqui tem um correspondente físico". Como logotipo ela diria isso
de um produto, e seria falso.

Então o logotipo **não tem símbolo nenhum**. É consistente com a ADR 0003, que já
registrou a ausência de ícone como deliberada: "rótulo escrito é mais preciso que
pictograma".

### 4. O logotipo não usa o acento

A pílula atrás de uma palavra é o device tipográfico da casa, e um `P` `C` `P`
com o `C` em pílula é a aplicação óbvia dele. **Descartado.**

O azul de destaque é escasso por projeto — "acento de rascunho, fim da escala"
(ADR 0003 §3). Uma marca aparece em toda tela. Ela gastaria o acento antes de o
conteúdo chegar, e no dia em que uma tela precisasse destacar de verdade já
haveria azul na página.

### 5. O ícone do aplicativo é monograma, e não a régua comprimida

A tentação era boa: a régua é a assinatura, e as proporções dela são a coisa mais
reconhecível que o produto tem. Comprimir 20/40/30/75/15 em 32 pixels daria um
ícone bonito e verdadeiro.

**É proibido, e a regra é a mais dura do projeto.** Aquelas cinco durações são o
ritmo de um curso específico (Doc 4 §2). Um ícone com cinco barras congelaria
"cinco blocos, nestas proporções" dentro de um arquivo binário — quantidade com
significado pedagógico virando constante, que é precisamente o que o CLAUDE.md
§3.2 proíbe. E congelada num lugar onde nenhum teste olha.

O ícone é então um `P` desenhado em traço, sobre papel, com o filete de 1px que é
o átomo de forma do cartão. Nada inverte: papel não inverte, então em barra
escura ele lê como um pedaço de papel — que é o certo.

É `src/app/icon.svg`, arquivo, e é a única exceção ao "todo SVG do projeto é JSX
inline": o navegador busca o ícone antes de existir React.

### 6. `pages.signIn` com rota própria, não `theme.logo` do Auth.js

O slot `theme` do Auth.js aceita uma logo, e não resolve nada: ele **mantém** a
página do Auth.js. Continuaria em inglês, continuaria escurecendo, continuaria
sem as fontes do projeto — e ainda exigiria transformar o logotipo em arquivo de
imagem.

`pages: { signIn: '/entrar', error: '/entrar' }`. A rota própria herda o layout
raiz, os tokens, as fontes e a decisão de não inverter.

`error` apontando para a mesma rota é decisão separada e vale explicar. O desfecho
mais provável do primeiro dia é a recusa: a pessoa autoriza o aplicativo no
GitHub e mesmo assim não entra, porque só entra quem foi matriculado (ADR 0002
§1). Essa frase tem de cair **ao lado do botão de tentar de novo**, com o que
fazer a seguir, e não numa página sem saída.

A cor de portão aparece nessa recusa, e é o único uso dela fora de marco
pedagógico. Justifica-se pelo contrato do próprio componente: `Aviso` define
`portao` como bloqueio, o que impede prosseguir. Uma pessoa barrada na porta está
bloqueada no sentido literal.

### 7. As duas telas de porta ancoram à esquerda

Nem `/` nem `/entrar` centram o conteúdo. O texto começa à esquerda porque é lá
que a leitura começa, e o espaço sobra à direita como margem de caderno — que é a
mesma figura de "parede de ateliê" da ADR 0003.

Isto decide **estas duas telas**. A largura da casca das telas de aplicativo é
outro assunto, e não está decidido em lugar nenhum ainda.

---

## Consequências

**Boas**

- A marca não custa arquivo: é texto em fontes que o `layout.tsx` já carrega, e
  escala sem asset
- A tela de entrada passou a ser um lugar onde cabe explicar a matrícula, que é
  a regra que mais confunde no D1
- O `callbackUrl` deixou de ser um valor solto: ele passa por `destinoSeguro`,
  com teste. Redirecionamento aberto **na tela de login** é o degrau clássico do
  phishing, porque a origem que a pessoa confere antes de clicar é a nossa

**Custos aceitos**

- Sem `favicon.ico`. Navegador que não lê SVG fica sem ícone, e isso é aceito:
  o custo de manter um segundo formato binário é maior que o ganho
- O logotipo não tem versão para fundo escuro. Enquanto ele só existir dentro do
  produto, "papel não inverte" resolve
- Uma tela a mais no caminho de todo mundo. É tela de fato, não de conveniência:
  ela serve um momento que o Doc 4 §3 orça

---

## O argumento contrário

Três, e o primeiro é o que mais provavelmente vai vencer.

**1. Logotipo tipográfico não sobrevive fora da tela.** Três letras em serifada
não se distinguem de qualquer outro produto num crachá, num slide de abertura do
D1 ou na capa do repositório-espelho. O sinal de que isso virou problema é
concreto: alguém pedindo "o logo" para colar em algo que não é a interface. Se
esse pedido chegar, a resposta certa é desenhar um símbolo **para fora**, e
manter a marca tipográfica dentro do produto — não trocar uma pela outra.

**2. A distinção entre "assinatura" e "logotipo" só se sustenta lendo esta ADR.**
Se numa revisão futura alguém olhar o cabeçalho e perguntar "cadê a marca?", a
distinção falhou na prática, e o certo será renomear a ADR 0003 §7 para "elemento
de assinatura" e deixar a palavra *signature* com o logotipo.

**3. Recusar o acento no logotipo pode ser economia mal colocada.** O argumento é
que a marca gastaria o azul em toda tela — mas isso só é verdade se ela aparecer
em toda tela. Se a casca acabar sem logotipo, e ele ficar só nas duas portas, o
custo de uma pílula some e o ganho de distinção volta. A decisão deve ser
revisitada quando a casca das telas de aplicativo estiver desenhada.
