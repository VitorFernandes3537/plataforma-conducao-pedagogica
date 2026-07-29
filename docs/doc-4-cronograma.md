# DOC 4 — CRONOGRAMA

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.2 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | Doc 2 (Chassi de Domínio) · Doc 3 (Mapa de Paredes) |
| **É consumido por** | Doc 5 (Protocolos) · Doc 6 (Avaliação) · Doc 7 (Plataforma) |

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- O que acontece em cada um dos 15 dias
- Qual é o ritmo interno de cada aula
- Onde ficam os marcos e qual é a natureza de cada um
- Para onde vai o tempo que sobra, e o que é cortado quando falta
- Onde a recuperação mora no calendário

### 0.2 O que este documento NÃO responde

| Pergunta | Documento dono |
|---|---|
| O conteúdo de cada parede | Doc 3 |
| Como conduzir o aluno até bater na parede, e como apoiar | Doc 5 |
| Protocolo da crítica entre pares e da recuperação | Doc 5 |
| Como avaliar e quanto vale cada coisa | Doc 6 |

### 0.3 Constraints herdadas que foram revogadas

Três restrições geradas durante a construção dos docs anteriores não sobreviveram à revisão e ficam registradas como canceladas:

| Constraint | Status | Motivo |
|---|---|---|
| "45h efetivas" como número único de planejamento | **Substituída** | Planejar em 3h/dia fixas é planejar para o pior caso todos os dias. A perda é irregular. Ver seção 1 |
| "O D2 ganhou 45 min do contrato quebrado e algo tem que sair de lá" | **Cancelada** | Falso problema. O exercício pertence ao início do D3, imediatamente antes do preenchimento do Contrato real. Resolvido por realocação |
| "O D4 está sobrecarregado" | **Cancelada** | O gargalo real é D1–D3. O D4 fecha com folga depois do corte de herança e polimorfismo do bloco de TS (D4-02) |

---

## 1. Aritmética do tempo

| Grandeza | Valor |
|---|---|
| Tempo nominal | 60h — 15 dias × 4h |
| Tempo de planejamento | **45h** — 15 dias × 3h |
| Banco de tempo | **15h**, distribuídas de forma irregular |

O curso é planejado inteiramente sobre as 45h. As 15h restantes existem, mas não são planejáveis: aparecem em dias bons e desaparecem em dias ruins. O D1 perde muito; o D7 quase nada.

**Regra:** nenhum item do cronograma depende do banco de tempo. O banco tem destino pré-definido (seção 5) para que não evapore em conversa.

**Restrição dura:** nenhum item deste cronograma pressupõe trabalho feito em casa. Aplicação de `D2-SEM-PREVIO` (Doc 2, §3.3), que é o dono desta restrição.

---

## 2. Ritmo interno das 3h

Fixo, todo dia igual, dos dias de parede (D4 a D11). Previsibilidade libera carga cognitiva para o conteúdo.

| Bloco | Tempo | Conteúdo |
|---|---|---|
| **Abertura** | 20 min | Mural do "Precisamos Saber" + janela de recuperação por dupla (seção 6) |
| **Parede** | 40 min | A dupla tenta e falha. O instrutor **não** demonstra, mesmo com a sala travada |
| **Demonstração** | 30 min | Live coding no domínio-espelho (Biblioteca) |
| **Implementação** | 75 min | A dupla resolve no domínio dela |
| **Fechamento** | 15 min | Log de parede + push no GitHub |

**Total: 180 min.**

O push diário acontece dentro do fechamento — não é ritual à parte e não consome tempo extra.

Os dias D1, D2, D3, D12, D13, D14 e D15 têm estrutura própria, detalhada na seção 3.

---

## 3. Cronograma D1–D15

### D1 — Abertura

| Bloco | Tempo |
|---|---|
| Conversa de abertura e contrato de turma | 45 min |
| Tour da plataforma e cadastro | 25 min |
| Paradigmas de programação | 60 min |
| **Afixação da pergunta condutora** na parede da sala | 5 min |
| Apresentação do banco de domínios + entrega dos 3 briefings da trilha desafio | 35 min |
| Fechamento | 10 min |

**Objetivo:** acalmar os ânimos, explicar a metodologia de verdade, e firmar o contrato do que será e do que não será feito.

**Pergunta condutora (Doc 1, §1):** *Como escrever um sistema que sobrevive a uma mudança de regra que eu não previ?* Fica na parede do D1 ao D15.

**Enquadramento do produto público (Doc 5, §6.2):** o repositório é público, é o produto do curso, e permanece no ar depois dele. Declarado aqui, no primeiro dia.

**Nota:** este é o primeiro contato com a turma. Nada foi publicado antes. O banco de domínios e os briefings entram aqui e a turma leva a escolha para pensar até o D3.

---

### D2 — POO em TypeScript

| Bloco | Tempo |
|---|---|
| Abertura e mural | 15 min |
| Objeto: estado + comportamento juntos | 45 min |
| Prática, domínio descartável | 45 min |
| Encapsulamento: o objeto protege o próprio estado | 30 min |
| Prática | 30 min |
| Fechamento + primeiro push | 15 min |

**Escopo do bloco de TS — decisão D4-02.** Ensina **apenas** objeto com estado e comportamento, encapsulamento e (no D3) máquina de estados. **Herança e polimorfismo ficam de fora.**

O motivo não é tempo, é pedagógico: se eles ensaiarem polimorfismo em TS aqui, chegam na P3 já sabendo a resposta, e a parede mais importante do curso vira revisão.

**Domínio da prática:** descartável, fora do banco. Não pode ser nenhum dos 18.

---

### D3 — Contrato de Domínio · Marco 1

| Bloco | Tempo |
|---|---|
| Abertura | 10 min |
| **Exercício do contrato quebrado** | 45 min |
| Negociação e alocação de domínio entre as duplas | 25 min |
| Preenchimento do Contrato, com aprovação rolling | 95 min |
| Fechamento | 5 min |

**Exercício do contrato quebrado (D3-04 do Doc 3).** Um Contrato já preenchido de domínio fictício, fora do banco, com defeitos plantados: estados `Ativo`/`Inativo`, uma condição derivada listada como estado, uma transição declarada ilegal que na verdade é legal, e nenhum estado final. A dupla tem 30 min para achar e reescrever; 15 min de fechamento coletivo.

É assim que a máquina de estados entra no curso — pela mesma porta que todos os outros conceitos, sem abrir exceção ao método.

**Aprovação rolling.** O instrutor circula e aprova conforme as duplas terminam. A validação automática da plataforma (Doc 2, §4.6) já filtrou 7 dos 11 critérios; restam 4 julgamentos humanos por Contrato, cerca de 3 a 4 minutos cada.

**Contratos não aprovados no D3** vão para a janela de abertura do D4. Enquanto os aprovados começam a P1, a dupla pendente faz o setup do ambiente. **Nenhuma linha de código do projeto antes da aprovação.**

---

### D4 — Setup · Tradução · P1

| Bloco | Tempo |
|---|---|
| Abertura + pendências do Contrato | 15 min |
| Setup .NET e template de projeto pronto | 30 min |
| Tradução TS → C#, tabela lado a lado | 20 min |
| **P1 — parede** | 40 min |
| **P1 — demonstração** | 25 min |
| **P1 — implementação** | 45 min |
| Fechamento + push | 5 min |

**P1:** *Por que meu programa aceita um estado que não existe?* — Doc 3.

O template de projeto é entregue pronto: `namespace`, `Main`, estrutura de pastas. Cerimônia de linguagem não é conteúdo do curso.

---

### D5 — P2

Ritmo padrão (seção 2). **P2:** *Por que consigo cancelar algo que já terminou?*

---

### D6 — P2 conclusão · Crítica 1

| Bloco | Tempo |
|---|---|
| Abertura | 20 min |
| P2 — conclusão da implementação | 90 min |
| **Crítica 1** | 55 min |
| Fechamento + push | 15 min |

Protocolo da crítica: Doc 5.

---

### D7 — P3

Ritmo padrão. **P3:** *Por que meu `if` não para de crescer?* — a parede central do curso.

**Na abertura:** verificação do gatilho de rebaixamento da trilha desafio (Doc 5, §5.3). O D6 não tem tempo livre para essa decisão; ela cabe nos 20 min de abertura do D7.

---

### D8 — P3 conclusão · Marco 2

| Bloco | Tempo |
|---|---|
| Abertura | 20 min |
| P3 — conclusão da implementação | 105 min |
| **Marco 2 — verificação ao vivo** | 40 min |
| Fechamento + push | 15 min |

**Verificação do Marco 2:** o instrutor pede, dupla por dupla, a adição de uma 4ª categoria de cálculo. Se exigir alterar qualquer classe existente, a P3 não foi vencida.

É o critério mais revelador do curso inteiro e o único que se executa na frente da dupla.

---

### D9 — P4

Ritmo padrão. **P4:** *Os dois estão certos. Por que juntos estão errados?*

LINQ liberado nesta parede, restrito a `Any`, `Where`, `Count`.

---

### D10 — P5

Ritmo padrão. **P5:** *Por que mudar onde os dados moram quebrou minha regra de negócio?*

Construção da interface de repositório e da implementação em memória.

---

### D11 — P5 prova

| Bloco | Tempo |
|---|---|
| Abertura | 20 min |
| Segunda implementação: repositório em arquivo texto | 60 min |
| **Prova: troca em uma linha**, demonstrada ao vivo | 40 min |
| Consolidação e limpeza do projeto | 45 min |
| Fechamento + push | 15 min |

Este dia tem folga proposital. A P5 é a parede arquitetural mais difícil e é a que mais transborda. Se não transbordar, a folga vai para consolidação — que o projeto vai precisar antes do incremento.

---

### D12 — Envelope de incremento · Marco 3

| Bloco | Tempo |
|---|---|
| Abertura | 20 min |
| **Marco 3 — triagem:** quem está pronto para receber o incremento | 25 min |
| Entrega e leitura do envelope | 20 min |
| Trabalho de absorção | 100 min |
| Fechamento + push | 15 min |

**Envelope de mudança de regra:** específico ao domínio de cada dupla, escrito pelo instrutor entre o D4 e o D11. Ver Doc 6.

Dupla que não passar na triagem do Marco 3 recebe um envelope reduzido — o protocolo é do Doc 5.

---

### D13 — Absorção · Crítica 2

| Bloco | Tempo |
|---|---|
| Abertura | 20 min |
| Absorção do incremento | 85 min |
| **Crítica 2** | 60 min |
| Fechamento + push | 15 min |

**Crítica 2** revisa **como o colega absorveu o incremento** — não a arquitetura dele. Cada dupla precisa explicar a regra de negócio alheia e a mudança que ela sofreu antes de comentar qualquer linha de código.

É o teste de transferência mais puro do curso: não dá para gerar, não dá para copiar, e só passa quem entendeu o núcleo em vez do vocabulário.

---

### D14 — Python espelho · Recuperação

| Bloco | Tempo |
|---|---|
| **Python — espelho comparativo** | 90 min |
| Recuperação assistida e conclusão da absorção | 75 min |
| Fechamento + push | 15 min |

**Escopo do Python:** porta **apenas a hierarquia de cálculo variável** da P3. Nada mais.

A aula inteira responde a uma pergunta: *"o compilador sumiu — quem garante o contrato agora?"*. `ABC`, `@property` e type hints entram como **resposta a um problema**, não como sintaxe a decorar.

Os outros 75 min são a única reserva formal de recuperação do calendário, e o D14 é estatisticamente o dia em que ela mais será necessária.

---

### D15 — Entrega

| Bloco | Tempo |
|---|---|
| Abertura e preparação | 45 min |
| **Apresentações internas** | 90 min |
| Retrospectiva | 35 min |
| Encerramento | 10 min |

**Formato da apresentação — 5 min por dupla:**

1. O domínio e a Tabela de Tradução
2. A parede mais difícil e como foi vencida
3. O incremento do D12 e quanto precisou ser reescrito para absorvê-lo

Audiência: a própria turma. Ao fim de cada apresentação, o instrutor faz **2 perguntas sobre uma decisão de design específica daquele código**, e a dupla compartilha o link do repositório.

**Retrospectiva:** inclui a pergunta de reflexão sobre a tese (Doc 6, §5.1) — *o que mudou no jeito que você pensa antes de escrever a primeira classe?*

---

## 4. Marcos

| Marco | Dia | Natureza | Consequência |
|---|---|---|---|
| **1 — Contrato aprovado** | D3 | **Go/no-go duro** | Sem aprovação, não começa o código. Refaz no mesmo dia ou na abertura do D4 |
| **2 — Estados e polimorfismo** | D8 | Triagem com consequência | Dispara recuperação e realocação de trilha |
| **3 — Pronto para o incremento** | D12 | Triagem com consequência | Define envelope integral ou reduzido |

**Por que o D3 é duro:** contrato ruim contamina os 12 dias seguintes, e a consequência é barata — refazer custa uma hora.

**O D3 precisa reprovar alguém pelo menos uma vez.** Se nenhum contrato for recusado, os marcos seguintes não serão levados a sério.

**Por que D8 e D12 não são duros:** reprovar um iniciante no meio do curso desmoraliza e não há plano B disponível. O instrumento correto ali é recuperação, não reprovação.

---

## 5. Banco de tempo e regra de adiantamento

### 5.1 Destino do tempo excedente

Quando o dia render mais que 180 min, o tempo vai nesta ordem, sem renegociação no momento:

1. Dupla atrasada na parede do dia
2. Segunda rodada de implementação para todos
3. Extensão da parede (Doc 3, §5)
4. Adiantamento — **somente sob a regra 5.2**

### 5.2 Regra de adiantamento

Adiantar material é permitido, com uma distinção que não se negocia:

| Cenário | Permitido | Razão |
|---|---|---|
| **Turma inteira adianta** | Sim | É deslocamento de calendário. Não quebra nada |
| **Algumas duplas adiantam** | **Não** | Destrói a sincronia, que é a fundação do método |

**Limiar:** a turma adianta quando **ao menos 80% dos grupos** cumpriram os critérios de superação do dia (Doc 3), arredondado para cima. Com 11 grupos, são 9. Abaixo disso, quem terminou pega extensão e ninguém avança.

O limiar é **proporção configurável**, não número absoluto — o curso pode rodar com 8 ou com 14 grupos.

**Por que o limiar existe:** com 11 duplas em paredes diferentes, o instrutor está sozinho conduzindo quatro aulas simultâneas. As extensões existem exatamente para absorver a dupla rápida sem pagar esse preço.

---

## 6. Recuperação

Não existe dia reserva. 45h não comportam um.

**A recuperação é a dupla.** Os dois membros têm o mesmo domínio, em repositórios separados. Quem faltou no D5 é reposto pelo parceiro nos 20 minutos de abertura do D6 — sem instrutor, sem aula repetida.

Esta é a razão operacional mais forte para a dupla compartilhar domínio, e ela vale ser dita à turma no D1.

**O que o calendário reserva:**

| Reserva | Quando |
|---|---|
| Janela de abertura de 20 min | Todo dia, D4 a D13 |
| Recuperação assistida de 75 min | D14 |

O protocolo de recuperação — quem repõe, o que é reposto, qual o teto — é do **Doc 5**.

---

## 7. Ordem de sacrifício

Pré-comprometida. Quando o curso atrasar — e vai, por volta do D9 — corte nesta ordem e não invente outra no momento:

1. **Python (D14)** — libera 90 min
2. **Crítica 2 (D13)** — libera 60 min
3. **Prova da P5 (D11)** vira demonstração do instrutor — libera 60 min

**Nunca cortável, em nenhuma circunstância:**

- A ordem parede → demonstração → implementação
- O time-box de 40 min de tentativa
- O Marco 1 do D3
- O envelope de incremento do D12

O instinto sob atraso é voltar a expor primeiro para ganhar tempo. É a morte do método, e é por isso que esta lista existe escrita, com antecedência.

---

## 8. Registro de decisões

| ID | Decisão | Resolução |
|---|---|---|
| **D4-01** | Tempo do Python | 90 min no D14. Os outros 75 min viram recuperação assistida |
| **D4-02** | TS ensina herança e polimorfismo? | Não. O bloco de TS ensina apenas objeto, encapsulamento e máquina de estados |
| **D4-03** | Dia do envelope de incremento | D12, com D13 e D14 para absorção |
| **D4-04** | Ritmo interno das 3h | 20 / 40 / 30 / 75 / 15, fixo nos dias de parede |
| **D4-05** | Natureza dos marcos | D3 go/no-go duro; D8 e D12 triagem com consequência |
| **D4-06** | Destino do tempo excedente | Ordem fixa de 4 destinos. Adiantamento só para a turma inteira, com limiar de 80% dos grupos |
| **D4-07** | Recuperação | É a dupla. O calendário reserva a janela de abertura e 75 min no D14 |

---

## 9. SSOT — fonte de verdade única

| ID | Conteúdo |
|---|---|
| `D4-CALENDARIO` | A distribuição D1–D15 |
| `D4-RITMO` | O ritmo interno das 3h |
| `D4-MARCOS` | Os 3 marcos, dias e natureza |
| `D4-BANCO` | Destino do tempo excedente e regra de adiantamento |
| `D4-SACRIFICIO` | Ordem de corte e a lista do que nunca se corta |
| `D4-RESERVA` | O que o calendário reserva para recuperação |

Referenciado aqui, dono é outro:

| Fato | Dono |
|---|---|
| Conteúdo das paredes e critérios de superação | Doc 3 |
| Protocolo da crítica, da recuperação e da escada de suporte | Doc 5 |
| Conteúdo do envelope de incremento e formato da avaliação | Doc 6 |

---

## 10. Notas cross-doc geradas por este documento

| Destino | Nota |
|---|---|
| **Doc 5** | Protocolo da janela de abertura de 20 min: o que a dupla repõe, como registra, qual o teto |
| **Doc 5** | Protocolo das Críticas 1 (D6, arquitetura) e 2 (D13, absorção do incremento) — são exercícios diferentes e precisam de roteiros diferentes |
| **Doc 5** | Protocolo do envelope reduzido para quem não passar no Marco 3 |
| **Doc 5** | Protocolo de reprovação no Marco 1, incluindo o caso de contrato ainda pendente na abertura do D4 |
| **Doc 6** | O envelope de incremento precisa estar escrito entre o D4 e o D11, por domínio. É o item de maior custo de preparo do curso |
| **Doc 6** | As 2 perguntas do instrutor ao fim de cada apresentação do D15 precisam de critério |
| **Doc 6** | Avaliar Python de forma não estruturalmente óbvia — como revisão e incremento sobre a codificação real, não como prova de sintaxe |
| **Doc 7** | Checklist de superação por aluno e por dia, alimentando o limiar de adiantamento (80% dos grupos) |
| **Doc 7** | Registro da janela de recuperação: quem repôs o quê, em que dia |
| **Doc 7** | O mural do "Precisamos Saber" é consultado na abertura de todo dia — precisa ser a primeira tela |

---

## 11. Changelog

| Versão | Mudança |
|---|---|
| 1.1 | D1 recebe a afixação da pergunta condutora e o enquadramento do produto público. D15 recebe a pergunta de reflexão sobre a tese na retrospectiva |
| 1.2 | Correções de consistência: janela dos envelopes passa de D3–D11 para **D4–D11** (dono: Doc 6). Limiar de adiantamento deixa de ser "9 em 11" e passa a proporção configurável de 80%. Verificação do rebaixamento realocada para a abertura do D7, que no D6 não tinha tempo. §1 deixa de repetir `D2-SEM-PREVIO` |
| 1.0 | Documento fechado. Decisões D4-01 a D4-07 resolvidas. Três constraints herdadas revogadas (ver 0.3). Herança e polimorfismo cortados do bloco de TS. Crítica 2 movida do D11 para o D13, passando a revisar a absorção do incremento em vez da arquitetura. Python reduzido a 90 min, com 75 min convertidos em recuperação assistida |
