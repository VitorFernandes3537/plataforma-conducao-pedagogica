# DOC 6 — AVALIAÇÃO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.2 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | Doc 2 (Chassi) · Doc 3 (Mapa de Paredes) · Doc 4 (Cronograma) · Doc 5 (Protocolos) |
| **É consumido por** | Doc 7 (Plataforma) |

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- Quais são os eixos de avaliação e seus pesos
- Como os critérios binários do Doc 3 viram nota
- O que é o envelope de incremento e como ele é produzido
- Como funciona a defesa oral do D15
- Quando cada evidência é capturada

### 0.2 O que este documento NÃO responde

| Pergunta | Documento dono |
|---|---|
| Se a parede foi superada (critério binário) | Doc 3 |
| Em que dia cada momento de captura acontece | Doc 4 |
| O que acontece com quem não passa em um marco | Doc 5 |
| Como isso vira tela, registro e agregação | Doc 7 |

### 0.3 Premissa — não existe sessão de correção final

São 22 repositórios. Avaliação que não é capturada **durante** o curso obriga a um fim de semana de correção — e corrige mal, porque nada do que importa (como a dupla chegou lá, quanto apanhou, o que tentou) sobrevive no código final.

**Toda evidência é capturada ao vivo, nos momentos que já existem no cronograma.** Nenhum momento novo é criado. A nota do D15 é agregação, não correção.

Consequência: o Doc 7 é **dependência dura** deste documento, não apoio.

---

## 1. Eixos e pesos

| Eixo | Conteúdo | Peso |
|---|---|---|
| **1 — Modelo de domínio** | As 5 paredes | **50%** |
| **2 — Absorção da mudança** | O envelope do D12 | **30%** |
| **3 — Prática de trabalho** | Entrega, crítica, log, contrato diário | **20%** |

### 1.1 Unidade de avaliação

Declaração necessária: os eixos não têm todos a mesma unidade.

| Eixo | Unidade | Razão |
|---|---|---|
| **1 — Modelo** | **Aluno** | Cada aluno tem repositório próprio. Avaliar por grupo faria um aluno ausente herdar a nota do parceiro |
| **2 — Absorção** | **Grupo** | O envelope é um por domínio, absorvido em conjunto |
| **3 — Prática** | **Aluno** | Push, log e recuperação são individuais |

**Exceção declarada:** a verificação ao vivo do Marco 2 (D8) é **por grupo**. São 40 minutos para 11 grupos (3,6 min cada); por aluno seria inviável.

**Operação:** a avaliação diária do Eixo 1 é lançada por aluno, com o mesmo valor aplicado aos dois membros por padrão. O instrutor diverge apenas quando observa diferença real entre os repositórios.

---

**Por que a Absorção tem eixo próprio.** É a única evidência **independente** de que o modelo prestou. Um projeto bonito que não absorve mudança falhou exatamente naquilo que o curso ensina — e sem eixo separado, esse fracasso ficaria diluído dentro de uma nota alta de "modelo".

---

## 2. Escala

Aplicada a cada item avaliado. Superação é **portão**; qualidade é **nota**.

| Nível | Descritor |
|---|---|
| **0** | Não superou o critério do Doc 3 |
| **1** | Superou com apoio direto do instrutor |
| **2** | Superou de forma autônoma |
| **3** | Superou e generalizou — pegou a extensão, ou aplicou o padrão em outro ponto sem ser pedido |

> **Superado = nível ≥ 1.** Esta é a definição usada pelo painel de superação e pelo limiar de adiantamento (Doc 4, §5.2). Nível 0 é o único que não conta como superação.

Isso preserva a fronteira entre os documentos: o **Doc 3 diz se passou**, o **Doc 6 diz como**. Nenhum critério é definido em dois lugares.

---

## 3. Eixo 1 — Modelo de domínio (50%)

### 3.1 Composição

Cada parede recebe uma nota de 0 a 3, com peso:

| Parede | Pergunta do aluno | Peso |
|---|---|---|
| P1 | *Por que meu programa aceita um estado que não existe?* | 1× |
| P2 | *Por que consigo cancelar algo que já terminou?* | 1× |
| **P3** | *Por que meu `if` não para de crescer?* | **2×** |
| P4 | *Os dois estão certos. Por que juntos estão errados?* | 1× |
| P5 | *Por que mudar onde os dados moram quebrou minha regra?* | 1× |

Total: 6 unidades × 3 = **18 pontos**, normalizados para os 50%.

**Por que P3 pesa o dobro:** é a parede central do curso (Doc 3), é a única com verificação executada ao vivo pelo instrutor (Marco 2, D8), e é o pré-requisito estrutural da Mudança 1 do envelope. Um aluno que não venceu a P3 não tem como pontuar no Eixo 2.

### 3.2 Captura

- **Diária**, no fechamento de cada dia de parede, contra o critério de superação do Doc 3
- **Marco 2 (D8)**: verificação ao vivo da P3 — o instrutor pede a 4ª categoria de cálculo. Se exigir alterar qualquer classe existente, P3 recebe 0
- **D15**: as perguntas da defesa oral podem ajustar a nota de qualquer parede, para cima ou para baixo

---

## 4. Eixo 2 — Absorção da mudança (30%)

### 4.1 O envelope de incremento

Entregue no D12. Específico ao domínio de cada dupla. É o instrumento central da avaliação do curso.

**Regra de produção: o envelope não se escreve — ele se deriva do Contrato de Domínio da dupla.**

| Mudança | Testa | Deriva de |
|---|---|---|
| **M1 — nova regra de cálculo** | P3 (polimorfismo) | **C5** |
| **M2 — novo estado no fluxo** | P2 e P1 (invariantes, máquina de estados) | **C2 e C3** |

**As duas mudanças são as mesmas para toda a turma**, instanciadas por domínio. Variar os tipos torna os resultados incomparáveis e triplica o custo de autoria.

### 4.2 Gabarito

```
ENVELOPE — <domínio>

De: <interessado nomeado do domínio>
Contexto: <uma frase de negócio>

MUDANÇA 1 — nova regra de cálculo
<categoria> passa a calcular <grandeza> assim:
<fórmula estruturalmente diferente das 3 declaradas em C5>

MUDANÇA 2 — novo estado
<atendimento> passa a ter o estado <novo>, entre <X> e <Y>.
Transição ilegal nova: <origem> -> <destino>, porque <razão>.

O QUE NÃO MUDA
- <item 1>
- <item 2>
```

**Exemplo — Biblioteca**

> **Contexto:** a direção decidiu endurecer a política de atraso e permitir renovação presencial.
>
> **M1:** acervo geral passa a ter multa progressiva por faixa — R$ 0,50/dia nos primeiros 7 dias, R$ 1,50/dia a partir do 8º. *(Antes era linear: forma nova, não constante nova.)*
>
> **M2:** novo estado `Em renovação`, entre `Emprestado` e `Devolvido`. Transição ilegal nova: `Em renovação` → `Cancelado`, porque um empréstimo em renovação já está vigente.
>
> **O QUE NÃO MUDA:** as regras de periódico e multimídia · o conflito de exemplar único.

### 4.2.1 O envelope tem remetente

O envelope vem assinado por um **interessado nomeado do domínio** — *a direção da biblioteca*, *o dono da oficina*, *a coordenação da clínica*.

É o reforço de autenticidade adotado pelo Doc 1, §4.1: a mudança deixa de ser tarefa do professor e passa a ser pedido de alguém. Custo: uma linha.

### 4.3 A seção "O QUE NÃO MUDA" é obrigatória

Sem ela, metade da turma entra em pânico e reescreve o projeto inteiro. O instrumento mede **absorção**, não reação ao susto.

### 4.4 Custo de produção

O instrutor abre o Contrato da dupla, lê C2, C3 e C5, e preenche quatro lacunas.

**~10 minutos por envelope · ~2 horas no total**, distribuídas entre o D4 e o D11.

### 4.5 Critérios de nota

| Critério | Escala |
|---|---|
| M1 absorvida sem alterar classe existente | 0–3 |
| M2 absorvida com as invariantes preservadas | 0–3 |
| Respeito ao "O QUE NÃO MUDA" | Penalidade se violado |

Nota do eixo = média de M1 e M2, ajustada pelo respeito ao escopo.

### 4.6 Versão reduzida

Para a dupla que não passar na triagem do Marco 3 (Doc 5, §5.2): apenas M1.

Mesma escala, mesma exigência de qualidade, menos superfície. Não há teto de nota diferente — a dupla é avaliada pelo que entregou.

---

## 5. Eixo 3 — Prática de trabalho (20%)

| Item | O que se verifica |
|---|---|
| Push diário | Frequência. Existência do push, não granularidade |
| Log de paredes | 5 linhas por parede, 5 paredes |
| Registro das críticas | Ambas as rodadas, ambas as direções |
| Contrato diário | Participação no fechamento |
| Reflexão do Python | As 5 linhas do D14 (§7) |
| Reflexão sobre a tese | A resposta da retrospectiva do D15 (§5.1) |
| Histórico de commits | **Peso baixo** — ver abaixo |

### 5.1 Reflexão sobre a tese — retrospectiva do D15

Uma pergunta, respondida por escrito na retrospectiva:

> *O que mudou no jeito que você pensa antes de escrever a primeira classe?*

A tese do curso é que POO é uma orientação mental (Doc 1, §2). Todos os demais instrumentos de reflexão — log de paredes, reflexão do Python — capturam o **código**. Este é o único que captura o **pensamento**, e sem ele a tese central não é avaliada em lugar nenhum.

Não há resposta certa. Avalia-se se a resposta demonstra consciência da mudança, não se ela usa o vocabulário correto.

---

**Sobre commits:** não se exige granularidade nem convenção perfeita. Iniciante trava tentando fazer o commit "certo" e para de codar. O que conta é a existência do registro diário; a qualidade do histórico entra com peso baixo dentro deste eixo.

---

## 6. Defesa oral — D15

Ao fim de cada apresentação de 5 minutos, o instrutor faz **2 perguntas sobre aquele código específico**, instanciadas na hora a partir deste banco:

1. *Por que essa regra está aqui e não ali?*
2. *O que quebra se eu mudar `<X>`?*
3. *Me mostre onde a regra `<Y>` mora. É só um lugar?*
4. *Se o cliente pedisse `<Z>` amanhã, o que você abriria?*
5. *Por que esse dado não pode ser alterado?*
6. *Qual foi a decisão que você mais demorou a tomar, e por quê?*

As respostas ajustam os Eixos 1 e 2, para cima ou para baixo.

---

## 7. Python

**Nenhuma prova. Nenhum entregável de código avaliado.**

O que se avalia são 5 linhas no log, respondendo a uma pergunta única:

> *O que o compilador estava fazendo por você, que agora você precisa fazer sozinho?*

Peso pequeno, dentro do Eixo 3.

É a única forma de cobrar Python sem transformar 90 minutos conceituais em avaliação de sintaxe — que é precisamente o que o desenho do curso quis evitar.

**Cobrança aprofundada fica para o módulo seguinte**, como revisão e incremento sobre o sistema real já em contexto de nuvem. Ver §11.

---

## 8. Resistência a IA

O curso não policia o uso de IA. Não precisa: **o problema é resolvido na saída, não na entrada.**

Três camadas, todas já existentes no desenho, nenhuma criada para este fim:

| Camada | Por que funciona |
|---|---|
| **Envelope do D12** | Específico ao domínio da dupla, não existe em lugar nenhum. Quem terceirizou as paredes 1–5 não tem base para absorver |
| **Crítica 2 do D13** | Exige explicar o domínio **do colega** e a mudança que ele sofreu, sem olhar o código |
| **Defesa oral do D15** | Duas perguntas sobre decisões de design daquele código específico |

Custo adicional: zero horas. Nenhuma vigilância, nenhuma acusação, nenhum conflito com o aluno.

---

## 9. Casos especiais

### 9.1 Aluno-copiloto

Convertido segundo o Doc 5, §3.4.

| Eixo | Como avaliar |
|---|---|
| 1 — Modelo | Pela **defesa oral**, não pelo repositório |
| 2 — Absorção | Normal — participa da absorção no repositório do parceiro |
| 3 — Prática | Normal |

**Sem teto de nota.** Um copiloto que responde bem às perguntas entendeu o conteúdo. Punir a ausência de repositório próprio pune a falta, não o aprendizado — e a falta já foi tratada no Doc 5.

### 9.2 Trilha desafio podada

Dupla rebaixada por poda de escopo (Doc 5, §5.3) é avaliada pelo **Contrato vigente após a poda**, não pelo original.

O rebaixamento não carrega penalidade de nota. Ele já custou tempo e reescrita.

---

## 10. Calendário de captura

Nenhum momento novo. Todos já existem no Doc 4.

| Momento | O que captura | Eixo |
|---|---|---|
| **D3** — Marco 1 | Contrato aprovado | Portão |
| **Fechamento diário** (D4–D11) | Superação da parede do dia, 0–3 | 1 |
| **D6** — Crítica 1 | Registro escrito de ambas as partes | 3 |
| **D8** — Marco 2, verificação ao vivo | A 4ª categoria sem tocar em classe existente | 1 |
| **D12** — Marco 3 | Triagem: envelope integral ou reduzido | Portão |
| **D12–D14** | Absorção do envelope | 2 |
| **D13** — Crítica 2 | Registro escrito | 3 |
| **D14** | Reflexão do Python | 3 |
| **Diário** | Push, log, contrato diário | 3 |
| **D15** — defesa | As 2 perguntas | 1 e 2 |

---

## 11. Registro de decisões

| ID | Decisão | Resolução |
|---|---|---|
| **D6-01** | Gabarito do envelope | Deriva do Contrato (C2, C3, C5). Duas mudanças fixas para todos, ~10 min por envelope |
| **D6-02** | Eixos da rubrica | 3 eixos — Modelo 50% · Absorção 30% · Prática 20% |
| **D6-03** | Binário → nota | Superação é portão, qualidade é nota. Escala 0–3 |
| **D6-04** | Perguntas do D15 | Banco de 6 formatos, instanciados no código do aluno |
| **D6-05** | Aluno-copiloto | Eixo 1 pela defesa oral. Sem teto de nota |
| **D6-06** | Python | 5 linhas de reflexão no log. Sem prova. Aprofundamento no módulo seguinte |
| **D6-07** | Momento da captura | Contínua, nos momentos que já existem. Sem sessão de correção final |

---

## 12. SSOT — fonte de verdade única

| ID | Conteúdo |
|---|---|
| `D6-EIXOS` | Os 3 eixos e os pesos |
| `D6-ESCALA` | A escala 0–3 e os descritores |
| `D6-PESOS-PAREDE` | Peso relativo de cada parede no Eixo 1 |
| `D6-ENVELOPE` | Gabarito, regra de derivação, versão reduzida, critérios de nota |
| `D6-DEFESA` | O banco de 6 perguntas do D15 |
| `D6-CAPTURA` | O calendário de captura de evidência |
| `D6-IA` | As três camadas de resistência |

Referenciado aqui, dono é outro:

| Fato | Dono |
|---|---|
| Critérios binários de superação | Doc 3 |
| Dias e janelas de cada captura | Doc 4 |
| Contrato de emergência, poda, copiloto | Doc 5 |

---

## 13. Notas cross-doc geradas por este documento

| Destino | Nota |
|---|---|
| **Doc 2** | O Contrato de Domínio ganha uma quarta função: **fonte de derivação do envelope de incremento**. Requer v1.2 |
| **Doc 4** | A produção dos envelopes ocupa ~2h do instrutor entre o D4 e o D11, fora do horário de aula |
| **Doc 7** | Três agregações distintas, com pesos configuráveis |
| **Doc 7** | O checklist diário é **escala 0–3**, não caixa de seleção |
| **Doc 7** | Gerador de envelope a partir do Contrato: as lacunas do gabarito são campos, não texto livre |
| **Doc 7** | Registro da defesa oral do D15, com as perguntas usadas |
| **Módulo seguinte (Nuvem)** | Cobrança aprofundada de Python como revisão e incremento sobre o sistema real |

---

## 14. Changelog

| Versão | Mudança |
|---|---|
| 1.2 | Unidade de avaliação declarada (§1.1): Eixos 1 e 3 por aluno, Eixo 2 por grupo, com o Marco 2 como exceção por grupo. Definição de "superado = nível ≥ 1" adicionada ao §2 |
| 1.1 | Envelope ganha remetente nomeado (§4.2.1), reforçando autenticidade. Reflexão sobre a tese adicionada à retrospectiva do D15 (§5.1), fechando a última lacuna de aderência ao PBL |
| 1.0 | Documento fechado. Decisões D6-01 a D6-07 resolvidas. Envelope de incremento redefinido como derivação do Contrato em vez de artefato autoral, reduzindo o custo de ~11 redações para ~2h totais. P3 recebe peso dobrado no Eixo 1. Resistência a IA consolidada como propriedade emergente de três instrumentos já existentes |
