# ADR 0003 — Design system

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-29 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega design visual ao desenvolvedor |
| **Fecha pendência de** | ADR 0001, "Identidade visual, tipografia e paleta — próxima ADR, depois que existir uma tela real" |
| **Não altera** | Nenhum documento da série |

---

## Contexto

A ADR 0001 adiou identidade visual até existir tela real. As issues 4 e 5 são as primeiras telas, então a decisão vence agora.

Correção de premissa registrada: uma versão anterior deste raciocínio tratou a plataforma como mobile-first, apoiada em `D2-SEM-PREVIO`. Errado — aquela restrição fala de **trabalho fora de sala**. O estudo, as ferramentas e o desenvolvimento acontecem no navegador de um PC. **Desktop primeiro; responsivo como cortesia, não como direção.**

---

## Decisão

### 1. A plataforma é um instrumento de condução de tempo

Não é um painel de indicadores. O que a spec descreve é operação ao vivo, sob relógio: ritmo diário fixo de 20/40/30/75/15 minutos (Doc 4 §2), marcos que são **portões** e não etapas — o D3 é go/no-go duro e sem aprovação não se escreve código (Doc 4 §4) —, captura contínua nos momentos que já existem (Doc 6), e um mural que **espelha** uma parede física (Doc 7 §6).

Referência estrutural adotada: **quadro de tarjas de despacho**. Cada `Grupo` é uma ficha que atravessa portões numa régua de tempo. O mapeamento não é metáfora decorativa — é a mesma operação.

### 2. Dez regras vindas de convergência, não de gosto

Derivadas de `docs/referencias-de-design/LEIA-PRIMEIRO.md` §7, onde Notion, User Interviews e Tally chegam à mesma solução de forma independente.

1. Canvas morno, nunca branco puro, nunca frio
2. Cartão branco com filete, raio 10–12px, sem sombra
3. **Uma** cor de ação, e ela é o único preenchimento cromático de botão
4. Cor de expressão separada da de ação — nunca se cruzam
5. Estado de portão é terceira categoria, e é raro
6. Sobrancelha de seção em mono caixa-alta com entreletra
7. Serifada só em prosa de aluno, com parcimônia
8. Hierarquia de texto por alfa de **uma** tinta, não por cinzas novos
9. Traço à mão só onde espelha algo físico
10. Sem malha, sem grade, sem gradiente

### 3. Paleta — v2, depois de duas rejeitadas

| Token | Valor | Função |
|---|---|---|
| `papel` | `#FCFBF6` | marfim **claro**, não bege lavado |
| `superficie` | `#FFFFFF` | cartão |
| `recuo` | `#F4F2EA` | apoio |
| `tinta` · `-media` · `-fraca` · `-tenue` | `#17150F` → `#ADA79A` | quatro níveis de **uma** tinta |
| `linha` · `-forte` | `#E6E2D6` · `#C9C4B4` | filete |
| **`acao`** | `#17150F` | **tinta cheia**. Botão preto resolve "uma cor de ação" sem gastar cromia, e deixa o acento livre para ser expressivo |
| **`destaque`** | `#2A5FD6` | azul **saturado**. Pílula atrás de palavra, anel, acento de rascunho, fim da escala. **Nunca** preenche botão |
| **`portao`** | `#DC4B1E` | laranja-tijolo. Bloqueante e raro. `duro` e `triagem` se separam por **forma** — sólido contra tracejado |
| `escala-0` a `-3` | `#EAE6DA` → `#2A5FD6` | `D6-ESCALA`. Enche, não alerta. Termina no destaque porque o fim da escala é domínio |

**As duas paletas anteriores foram rejeitadas pelo dono do curso, e o motivo foi o mesmo nas duas:** bege lavado e pastel desbotado, com tons vizinhos fingindo hierarquia. Na v1 o `papel` e o `recuo` eram quase idênticos, então o decorrido da régua virava mancha suja e invisível.

### 4. Três registros tipográficos

- **Archivo** — corpo de interface: rótulo, título, botão, tabela
- **IBM Plex Mono** (`.legenda`, `.dado`) — sobrancelha de seção e todo número, com numeral tabular. Requisito, não estilo: coluna que dança é ilegível sob pressão
- **Literata** — voz: título de tela e prosa de aluno. Nunca rótulo
- **Caveat** — anotação à mão, **só na margem**. Nunca em interface, e nunca carregando informação que só exista ali

Auto-hospedadas via `next/font/google`. Descartado o `Geist` do scaffold: é a fonte-padrão do ecossistema e não carrega ponto de vista.

### 4.1 Traço à mão, e onde ele mora

Desenhado em SVG (`src/components/marcas.tsx`), não ícone de biblioteca: as curvas têm assimetria proposital, porque traço perfeito lê como ícone e traço torto lê como mão.

Seis marcas: obstáculo (um muro), mural (bilhete pregado), produto (caixa aberta), seta, laço e faísca.

**Regra de uso, e eu já a violei uma vez:** a marca vive na **margem**, fora da coluna de texto. A primeira tentativa jogou o muro e a seta por cima do parágrafo de abertura — exatamente o que a regra proíbe. E só entra onde espelha algo físico: o mural é uma parede de papel na sala (Doc 7 §6), o obstáculo é um muro.

Nunca em superfície de decisão sob pressão, e nunca carregando informação que só exista ali.

### 5. Design de informação antes de cromagem

A primeira versão desta ADR decidiu paleta e tipografia e deixou o conteúdo cair em caixas de peso igual. O resultado não comunicava: estado virava **cor**, mas nunca **forma**.

O Doc 3 §2 resolve isso, porque especifica nove campos do obstáculo e diz quais vão para a plataforma:

| Campo | O que o Doc 3 §2 determina | Consequência de layout |
|---|---|---|
| **Pergunta do aluno** | *"enunciada como problema dele, não como aula numerada. É o que vai no mural e na plataforma. Separa PBL de currículo"* | É o **herói** da tela do aluno. Serifada, grande, medida curta. O ordinal "obstáculo 4" é referência, nunca título |
| **Critério de superação** | *"comportamento verificável, binário. Vira checklist na plataforma"* | Lista com marca binária — preenchida ou vazia. Nada de porcentagem |
| **Escopo fora** | *"impede que a aula cresça no calor do momento"* | Painel visível de **o que não fazer hoje** |
| **Sintoma observável** | *"10 duplas, 3h: o diagnóstico precisa levar 30 segundos"* | Vai na ficha do instrutor. Trinta segundos é requisito de projeto, não meta |

**Hierarquia por tamanho, não por rótulo.** Na fila do instrutor, quem exige decisão cresce e mostra o sintoma; quem está aprovado encolhe para uma linha e sai do caminho. Seis fichas de peso idêntico não trocam informação com quem precisa triar.

**Mostrar o que não fazer é o movimento mais incomum daqui**, e é carga pedagógica, não estilo: o `Escopo fora` existe justamente para conter o crescimento da aula.

### 6. O repositório aparece como produto, não como link

Doc 5 §6.2 enquadra o repositório como **produto público** do curso: declarado no D1, compartilhado no D15, e permanece no ar depois. A primeira versão não o mostrava em lugar nenhum — a tela do aluno era só cobrança. Agora ele tem lugar próprio, com a frase que diz o que ele é.

### 7. Signature: a régua do dia

Uma faixa só, ~40px. A primeira versão tinha o dobro da altura e ocupava muito mais espaço do que a informação pedia.

As larguras **são** as durações — 75 minutos ocupam cinco vezes o espaço de 15, sem largura mínima, porque bloco curto deve parecer curto. `flex-basis: 0` é o que torna isso verdadeiro: com a base vinda do conteúdo, o rótulo empurrava a caixa.

**O decorrido não preenche caixa.** Era bloco bege sobre fundo bege — mancha suja e invisível. Agora é fio de tinta de 2px na base: contraste de verdade em um sexto da altura.

Bloco estreito **perde o rótulo** em vez de exibi-lo cortado. "FECHAME…" não informa nada; a duração fica e o nome segue acessível pelo `title`.

### 8. Ausência é projetada, não é card vazio

"Aluno não vê nota antes da agregação" (Doc 7 §3) virou **ausência declarada**: borda tracejada e uma frase dizendo quando aparece e por quê. Card vazio dizendo "sem dados" parece defeito; ausência declarada parece regra.

---

## Consequências

**Boas**

- A régua reusa direto o modelo da issue 2: `Bloco` já tem `ordem`, `duracaoMinutos` e `tipo`
- Tokens em `@theme` do Tailwind v4, então shadcn/ui monta sobre eles sem briga
- `blocos.tipo` sendo texto (issue 3) permite qualquer taxonomia de bloco sem tocar no CSS

**Custos aceitos**

- Sem tema escuro. Foi decisão, não omissão: o sistema é papel, e papel não inverte
- Três famílias tipográficas custam peso. Mitigado por `subsets` e `display: swap`
- Uma só cor de ação limita o vocabulário de botão. É o ponto: limite é o que faz a ação ser encontrada
- A régua ocupa altura fixa no topo de toda tela. Espaço caro, gasto de propósito

**Descartado no caminho, e por que**

- **Malha milimetrada de fundo** — nenhuma das três referências usa grade; elas fazem papel por temperatura de cor. Tentei textura duas vezes e o conteúdo ficou sem contraste
- **Barra escura slate-900 como cromagem** — nenhuma referência tem faixa escura de moldura; Notion usa escuro como *cartão ilha*
- **Raio zero** — as três arredondam, e o dono do curso pediu arredondado
- **Canvas cinza-esverdeado frio** — frio é o oposto de papel
- **Estado pedagógico tingindo a tela inteira** — virou semáforo. O marco agora se declara por filete no topo do cartão e etiqueta, sólido para duro e tracejado para triagem

---

## Achado para a issue do obstáculo

O design tornou explícito que `Obstaculo` precisa de quatro campos que o modelo ainda não tem, todos vindos do Doc 3 §2: `perguntaDoAluno`, `criterioDeSuperacao` (lista, binária), `escopoFora` (lista) e `sintomaObservavel`.

Isto não é decisão desta ADR — é insumo para quando a issue do obstáculo for construída. Registrado aqui porque foi descoberto desenhando, e se perderia.

## O que esta ADR não decide

- Componentes de formulário e tabela — entram com as issues 6, 7 e 9, sobre shadcn/ui
- Comportamento de movimento. Nada de animação até existir uma tela real que peça
- Ícones. Nenhum foi introduzido, e a ausência é deliberada: rótulo escrito é mais preciso que pictograma em interface de decisão
