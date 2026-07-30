# Referências de design — síntese e uso

| | |
|---|---|
| **Natureza** | Curadoria. Não é decisão — decisão é ADR |
| **Como usar** | Ler antes de desenhar tela nova. Interpretar pedido de design contra estas convenções |
| **Fonte** | `styles.refero.design`, extraído por referência |

---

## 1. Onde as três referências concordam

Três sistemas independentes chegando na mesma solução é sinal forte. Isto não é gosto — é convergência.

| Convenção | Notion | User Interviews | Tally |
|---|---|---|---|
| **Canvas nunca é branco puro** | `#f6f5f4` | `#f2f8f7` | `#e0e0df` |
| **Cartão branco sobre canvas morno** | sim | sim (menta) | sim |
| **Hierarquia por tom, não por sombra** | *"do not add shadows to content cards"* | *"elevation is avoided entirely"* | uma pilha sutil, só no produto |
| **Filete de 1px em vez de elevação** | `rgba(0,0,0,.08)` | `#e4f0f1` | `#777672` |
| **Mono caixa-alta com entreletra como sobrancelha de seção** | pouco | *"non-negotiable"* | pouco |
| **Uma cor de ação, e é o único botão preenchido** | `#0075de` | `#1c5d5f`, *"um por viewport"* | `#0070d7` |
| **Serifada para peso editorial, com parcimônia** | Lyon, 4 usos | Mackinac nos títulos | não usa |
| **Cantos arredondados** | cartão 12px · botão 8px | cartão 12px · botão 48px | cartão 10px · botão 7px |
| **Ilustração de linha à mão** | traço 2px, círculos | traço 2px, *"o diferenciador mais forte"* | traço 1.5–2px, rabiscos |

**Nenhuma das três usa malha, grade ou textura.** Elas fazem "papel" por **temperatura de cor**, não por padrão desenhado. Foi exatamente aí que eu errei duas vezes.

---

## 2. A ideia mais afiada, e é do Tally

> **Magenta é a voz. Azul é a ação. Nunca se cruzam.**
>
> Nenhuma tela usa magenta como preenchimento de botão. Nenhuma tela usa azul decorativamente.

Isso resolve um problema que a PCP tem hoje: **não existe cor de ação**. As únicas cores cromáticas do desenho atual são estado de portão — então nada na tela diz "clique aqui", e o vermelhão acaba tendo que fazer dois trabalhos.

A regra transferível: **separar cor de expressão de cor de ação**, e nunca deixar uma fazer o papel da outra.

---

## 3. O que cada uma contribui de único

**Notion** — hierarquia por **alfa sobre uma cor só**: preto a 100%, 95%, 60%, 40%, 20%. Constrói cinco níveis de texto sem inventar cinco cinzas. E o **elenco rotativo de acentos** que pinta fundo de cartão como post-it, em vez de adicionar borda.

**User Interviews** — a **sobrancelha de seção** em IBM Plex Mono caixa-alta com ponto colorido de prefixo. É literalmente o que a PCP já faz com `.legenda`, o que valida a escolha. E a tese: *"a serifada faz a marca parecer uma publicação de pesquisa, não um dashboard"* — que é exatamente o que a PCP quer ser.

**Tally** — a **disciplina de duas cores** acima, e o traço de rabisco de 1.5–2px que fica **na margem**, nunca no meio do conteúdo. *"Doodles são ornamento de margem, não imagem principal."*

---

## 4. O que nenhuma das três resolve

**São todas página de venda.** Nenhuma é sistema denso de informação. A linguagem de superfície vem daqui; a **densidade** tem que vir de outro lugar.

Para a metade que falta — sistema, não landing —, as referências a buscar são de produto em uso:

- **Linear** — densidade com calma, atalho de teclado como cidadão de primeira classe
- **Notion, o aplicativo** (não o site) — tabela, banco de dados, hierarquia de página
- **Height, Basecamp** — fila de trabalho e triagem
- **Craft, Obsidian** — documento como superfície
- **Raycast** — comando e navegação sem mouse

E para educação especificamente, vale saber que o poço é seco: quase tudo é ou infantilizado (Duolingo) ou corporativo genérico (LMS institucional). **Brilliant** e **Sana** são os menos ruins. A PCP não tem referência direta — o que é oportunidade, não problema.

---

## 5. Como isso mede as minhas tentativas anteriores

Honestidade sobre o que já foi construído e descartado:

| O que eu fiz | O que as referências fazem | Veredito |
|---|---|---|
| Raio zero em tudo | cartão 10–12px, botão 7–8px | **errado.** As três arredondam, e o dono do curso pediu arredondado |
| Malha milimetrada como fundo | temperatura de cor, sem padrão | **errado duas vezes.** Textura onde elas usam calor |
| Barra escura slate-900 como cromagem | nenhuma tem faixa escura; Notion usa escuro como *cartão* ilha | **suspeito.** Escuro como ilha, não como moldura |
| Nenhuma cor de ação | uma cor de ação, sempre | **lacuna grave** |
| Canvas cinza-esverdeado frio | canvas **morno**, sempre | **errado.** Frio é o oposto de papel |
| Mono caixa-alta como legenda | idem, e é "non-negotiable" | **certo** |
| Serifada só na prosa longa | idem, com parcimônia | **certo** |
| Filete em vez de sombra | idem | **certo** |

Duas coisas certas de nove. A tipografia e a disciplina de filete sobrevivem; o resto do ambiente não.

---

## 6. Onde o traço à mão se justifica na PCP

O dono do curso gosta de desenho à mão, e o risco é virar enfeite. Ele só entra onde **espelha algo físico**, e a spec dá o lugar exato:

> Doc 7 §6: a plataforma **não substitui o mural físico — espelha**.

O **mural do "Precisamos Saber"** é uma parede de papel na sala de aula. Traço à mão ali não é decoração: é a coisa sendo representada. Mesma lógica para:

- **Estado vazio** — onde a interface fala com uma pessoa, não exibe dado
- **Marca de obstáculo** — o obstáculo é uma parede, e parede desenhada à mão é mais honesta que ícone
- **Margem da tela de fechamento** — momento de reflexão, não de operação

E onde ele **não** entra: fila de aprovação, régua de tempo, qualquer superfície de decisão sob pressão. Ali rótulo escrito ganha de pictograma.

---

## 7. Regras que eu vou seguir daqui

1. Canvas morno, nunca branco puro, nunca frio
2. Cartão branco com filete, raio 10–12px, sem sombra
3. **Uma** cor de ação, e ela é o único preenchimento cromático de botão
4. Cor de expressão separada da cor de ação — nunca se cruzam
5. Estado de portão é terceira categoria, e é raro
6. Sobrancelha de seção em mono caixa-alta com entreletra
7. Serifada só em prosa de aluno, com parcimônia
8. Hierarquia de texto por alfa de uma tinta, não por cinzas novos
9. Traço à mão só onde espelha algo físico
10. Sem malha, sem grade, sem gradiente

---

## Arquivos

| Arquivo | Referência |
|---|---|
| `notion.md` | Notion — *warm paper notebook under afternoon sun* |
| `user-interviews.md` | User Interviews — *hand-drawn research field notes on warm paper* |
| `tally-forms.md` | Tally Forms — *notebook doodles on warm paper* |

Cada um traz tokens em CSS e em Tailwind v4 na seção **Quick Start**, prontos para consulta.
