# ADR 0009 — A largura da casca, e quem tem medida

| | |
|---|---|
| **Estado** | Aceita, revisada (ver §Revisão) |
| **Data** | 2026-07-31 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega design e arquitetura ao desenvolvedor |
| **Decide o que não estava decidido** | Nenhuma ADR falava de largura de casca |
| **Relacionada** | ADR 0003 §7 (a régua), ADR 0006 §8 (desktop-first) |
| **Não altera** | Nenhum documento da série |

---

## Revisão — a casca preenche, e centra no monitor largo

O dono viu a casca num monitor de 1440 e a leu como defeito, não como margem:
a coluna de leitura media 1024px ancorada à esquerda, e sobravam **416px de
vazio assimétrico** à direita. Em várias telas — a entrada do instrutor, a fila,
os espécimes de material — o card não chegava perto da borda, e o resultado
parecia desalinhado.

Isto é exatamente o **argumento contrário #1** desta ADR se realizando: "ancorar
à esquerda pode ser pose… o sinal de que falhou é alguém procurando conteúdo no
lado direito da tela." Foi o que aconteceu.

A correção que a §1 original previa — pôr teto na `cheia` — não resolvia o vazio
da `leitura`. A decisão nova é outra:

- **A casca preenche o monitor comum** (1366–1440): teto de `82rem` na `leitura`,
  `100rem` na `cheia`, e `mx-auto`. Num monitor comum o teto é maior que a
  largura disponível, então a casca ocupa tudo e não há o que centrar.
- **Centra só no monitor muito largo**, onde o teto morde: a margem fica
  simétrica, que é a única leitura sã de um vazio grande.

Não é voltar às colunas estreitas centradas que o dono rejeitou no começo —
aquelas eram `max-w-2xl` (42rem) desperdiçando espaço dos dois lados. Esta
preenche, e só reparte o excesso onde ele é grande demais para ficar de um lado
só. O restante desta ADR — medida de leitura em `ch`, a régua de ponta a ponta,
o `desafio` sem cap inerte — continua valendo.

Consertos que vieram junto, cada um pela mesma causa (medida estreita contra
espaço vazio): a fila ganhou duas colunas de fichas; a pergunta condutora passou
de 62ch para 90ch e alinhou à margem, para a pergunta do curso caber numa linha
em vez de deixar "tudo?" sozinho na segunda; e a barra de controle da
apresentação ganhou `mt-auto`, para ficar no rodapé quando a lâmina é curta em
vez de subir para o meio da tela.

---

## Contexto

Sete telas, nove `mx-auto max-w-*`, e **quatro larguras diferentes** — `2xl`,
`3xl`, `4xl` e `5xl` — sem nada em lugar nenhum que as decidisse. Três delas
estavam num arquivo só, uma por ramo de `if`: os estados de ausência tinham
largura diferente do estado normal, e são justamente os que ninguém abre ao
testar.

Isso não era decisão registrada em lugar nenhum. Era convenção, e convenção que
diverge é só deriva com nome bonito.

Duas leituras precisavam ser desfeitas antes:

- **"Desktop-first" (ADR 0006 §8) se opõe a mobile-first, não a responsivo.**
  Nenhum documento-dono pede celular; nenhum proíbe que a tela se comporte bem
  quando a janela muda.
- **Cap em `ch` dentro de componente não é casca.** Os `30ch`, `34ch`, `46ch`,
  `52ch`, `62ch` e `66ch` são medida de leitura. O `34ch` de `desafio-atual` é a
  implementação literal de "medida curta" da ADR 0003 §5 — decisão registrada,
  não sobra de layout. Nenhum deles saiu.

---

## Decisão

### 1. A casca não centra

O conteúdo ancora à esquerda. O espaço sobra à direita, como margem de caderno.

O motivo não é estético e sim de figura: o sistema é "parede de ateliê" (ADR
0003), e papel com texto tem margem de um lado, não duas sobras simétricas. Uma
coluna centrada é o padrão de todo template, e é a forma mais barata de uma
interface não ter ponto de vista.

Há um motivo prático junto. A marca à mão vive em deslocamento negativo
(`-left-16`), e numa coluna centrada ela cai numa sobra acidental, cujo tamanho
muda com a janela. Ancorada à esquerda, a margem é declarada e a marca tem onde
morar.

### 2. Duas medidas de casca, escolhidas por tela

| Medida | Teto | Para quê |
|---|---|---|
| `leitura` | 64rem | prosa e formulário — o dia do aluno, as listas, o índice público |
| `cheia` | nenhum | tela cujo conteúdo **é** a largura — o dia do instrutor |

`leitura` é o padrão. Tela nova que esquecer de escolher nasce com a segura.

**64rem tem uma razão só, e ela é honesta:** é o que a grade de dois campos do
desafio precisa para não espremer o "fora de escopo" numa coluna de duas
palavras. Não é largura de página nem número redondo de gosto.

De quebra ela mata uma armadilha: `desafio-atual` carregava um `max-w-5xl` —
exatamente 64rem — inerte dentro de um `main` de 896px. Cap adormecido é pior
que cap nenhum, porque volta a morder no dia em que a casca cresce e ninguém o
procura quando o alinhamento quebra. Saiu.

### 3. A margem é uma medida só

`--margem`: 1.5rem, 2.5rem a partir de 48rem, 5rem a partir de 64rem. Com
`.margem` para aplicar e `.sangra` para atravessar.

Larga no desktop de propósito: a marca à mão vive na margem (ADR 0003 §4.1), e
margem estreita não é margem — é sangria.

A sangria existir como classe também conserta um cálculo que estava errado por
premissa: a página do rumo visual sangrava a régua com
`(100vw - 64rem) / 2`, que só fecha com a casca **centrada**.

### 4. Quem tem medida é o conteúdo, e a medida se declara em `ch`

Porque medida de leitura se mede em caracteres, não em pixels — ela sobrevive a
uma mudança de corpo de texto, e um número em pixels não.

Três medidas entraram nesta ADR, todas em componentes que a casca segurava por
acidente e que agora se seguram sozinhos: `Campo` (46ch), `CampoDeProsa` (62ch),
`AusenciaDeclarada` e `EstadoVazio` (62ch). Campo mais largo que o texto que cabe
nele promete espaço que não existe.

### 5. Onde a largura inteira é ganho, e onde é perda

Medido no navegador, não estimado:

| Peça | Efeito | Prova |
|---|---|---|
| **Régua do dia** | ganho | dentro da coluna de leitura ela **corta** "demonstração" (92px de texto em 82px de caixa); com a casca cheia, os três rótulos cabem |
| **Lançamento de nota** | perda se esticado | é `flex justify-between` com alvo de 28px no fim: em viewport inteira o nome e o alvo ficam em extremos opostos, e esse momento se faz circulando pela sala |
| **Pergunta do aluno** | neutro | 34ch já a segura |
| **Pergunta condutora** | neutro | 62ch já a segura |

A régua é o caso que mais importa, porque o corte é exatamente o defeito que a
ADR 0003 §7 declara não existir: bloco estreito **perde** o rótulo em vez de
exibi-lo cortado. Cortado é o que ele estava.

### 6. O dia do instrutor usa a largura, em duas colunas

Largura sem uso só estica. O lançamento e o mural são consultados dentro dos
mesmos 180 minutos, e lado a lado (a partir de `xl`) o instrutor deixa de rolar a
tela entre um e outro — que é tempo olhando para o monitor em vez de para a sala
(ADR 0006 §2).

Empilhados, os dois ganham medida própria, pelo motivo da tabela acima.

---

## Consequências

**Boas**

- Uma tela nova não escolhe largura: ela escolhe *tipo* de tela
- Os ramos de ausência passaram a ter a mesma casca do ramo normal, de graça
- A margem virou um número só, então "deriva de espaçamento entre uma tela e
  outra" deixou de ser possível por descuido

**Custos aceitos**

- Em monitor muito largo a coluna de leitura deixa muito vazio à direita. Vazio
  não é defeito: é margem. Mas é vazio, e alguém vai perguntar
- A régua da tela cheia cresce sem teto. Num monitor de 34" ela fica com
  proporções corretas e leitura de relance ruim, porque o olho tem que percorrer
  a tela inteira para comparar dois blocos

---

## O argumento contrário

**1. Ancorar à esquerda pode ser pose.** Centrar existe por um motivo: em tela
larga, conteúdo encostado numa borda obriga o olho a viajar, e o vazio à direita
lê como página quebrada em vez de margem. O sinal de que isso falhou é concreto —
alguém procurando conteúdo no lado direito da tela. Se acontecer, a correção é
pôr teto na medida `cheia` também, e não voltar a centrar.

**2. `64rem` é decisão em pixels vestida de medida de leitura.** Ela não veio de
contagem de caracteres, veio da necessidade de uma grade específica. No dia em
que a grade do desafio mudar, o número perde a justificativa e vira exatamente o
que esta ADR foi escrita para acabar: convenção não registrada.

**3. A margem de 5rem custa caro na máquina que está na sala.** Num notebook de
1366px ela come 160px — 12% da tela — no momento em que o instrutor mais quer
densidade. E ela é larga por causa da marca à mão, que é `hidden lg:block` e
aparece em dois componentes. Pagar 12% de toda tela por uma decoração que aparece
em dois lugares é troca ruim se a máquina da sala for pequena. A medida certa se
decide vendo o notebook do instrutor, e ele ainda não foi visto.
