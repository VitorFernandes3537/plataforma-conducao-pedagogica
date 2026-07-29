# DOC 5 — PROTOCOLOS DE EXECUÇÃO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.2 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | Doc 2 (Chassi) · Doc 3 (Mapa de Paredes) · Doc 4 (Cronograma) |
| **É consumido por** | Doc 6 (Avaliação) · Doc 7 (Plataforma) |

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- Como o instrutor conduz o aluno até a parede sem entregar a resposta
- Como o apoio é distribuído para que um instrutor atenda 11 duplas
- Como um aluno recupera o que perdeu
- Como funcionam as duas rodadas de crítica entre pares
- O que acontece com quem não passa em um marco
- Quais são as regras de entrega

### 0.2 O que este documento NÃO responde

| Pergunta | Documento dono |
|---|---|
| O conteúdo das paredes e os critérios de superação | Doc 3 |
| Em que dia cada coisa acontece e quanto tempo tem | Doc 4 |
| Conteúdo do envelope de incremento, pesos e notas | Doc 6 |
| Como isso vira tela e registro | Doc 7 |

### 0.3 A aritmética que justifica este documento

180 minutos de aula. 11 duplas. Um instrutor.

Se cada dupla consumir 3 intervenções de 4 minutos, são **132 dos 180 minutos** — e isso ignorando os 30 minutos em que você está demonstrando ao vivo.

A escada de suporte não é refinamento pedagógico. É a única coisa que faz a conta fechar.

---

## 1. Escada de suporte

### 1.1 Dois regimes

A escada não pode ser a mesma o dia inteiro. Durante o bloco de parede, ajuda entre duplas vaza a resposta — e falhar é o produto do exercício. Durante a implementação, ajuda é exatamente o que se quer.

#### Regime A — bloco de parede (40 min)

**Ajuda para no limite da dupla.** Sem consulta a outras duplas. Sem instrutor respondendo.

O instrutor circula para **diagnosticar**, não para resolver. As respostas permitidas estão na seção 2.2.

#### Regime B — bloco de implementação (75 min)

Escada completa. O instrutor é o **último** recurso, não o primeiro.

| Degrau | Tempo mínimo antes de subir |
|---|---|
| 1. Parceiro de dupla | 5 min |
| 2. Mural do "Precisamos Saber" + log de paredes próprio | 3 min |
| 3. Qualquer outra dupla da turma | 7 min |
| 4. Instrutor | — |

São 15 minutos de escada antes de chegar em você. Aluno iniciante presencial pergunta ao professor por reflexo; a escada existe para quebrar o reflexo, não para dificultar a vida dele.

### 1.2 Regra do degrau 3

A dupla consultada **orienta, não resolve**. Teto de 5 minutos, e volta ao próprio código.

Sem esse teto, uma dupla forte vira suporte técnico não remunerado e para de avançar — que é o mesmo problema da monitoria virar rotina fixa (Doc 3, §5).

### 1.3 Proposta avaliada e rejeitada — dupla-irmã

Foi considerado parear cada dupla com outra, fixamente, por nível cruzado.

**Rejeitado.** O pareamento por nível cruzado exige dispersão de nível suficiente na turma. Sendo a turma majoritariamente iniciante e razoavelmente homogênea, o resultado prático seriam pares frágil-frágil por falta de duplas fortes para casar — pior do que não parear.

Substituições adotadas:

| Função que a dupla-irmã cumpriria | Substituto |
|---|---|
| Degrau 3 da escada | Qualquer outra dupla, aberto (§1.1) |
| Pareamento das críticas | Sorteio por rodada, pareamento diferente em C1 e C2 (§4.1) |
| Cobertura quando os dois da dupla faltam | Material de recuperação + qualquer colega (§3) |

---

## 2. Condução até a parede

### 2.1 O enunciado é sempre de negócio, nunca técnico

O requisito sai na linguagem do Contrato de Domínio. Nunca na linguagem do Doc 3.

| Enunciado | Efeito |
|---|---|
| *"Faça o sistema cobrar multa diferente por tipo de acervo"* | Convida ao `if/else`. **A parede acontece** |
| *"Crie uma hierarquia de tipos de acervo"* | A resposta foi entregue. Não há parede |

Vale para as cinco paredes, sem exceção. É o mecanismo mais simples e o mais fácil de quebrar sem perceber.

### 2.2 Roteiro de respostas durante o bloco de parede

Três respostas permitidas, e apenas estas:

1. Repetir o requisito com outras palavras
2. *"Me mostra o que vocês tentaram."*
3. Apontar para o mural

Improvisar aqui é como o instrutor vaza a resposta sem perceber. O roteiro existe para que não haja improviso.

### 2.3 Exceção obrigatória — travamento acidental

Se a dupla está parada por algo que **não é a parede** — erro de compilação, ponto e vírgula, projeto que não roda, ambiente quebrado — o instrutor **desbloqueia imediatamente**.

Isso não é a parede. É atrito, e atrito não ensina nada.

> **Habilidade crítica do instrutor:** distinguir *travado na parede* de *travado no acidente*. Sob pressão de tempo, a tendência é tratar tudo como parede e deixar a dupla sofrendo por um erro de sintaxe durante 40 minutos. É a falha mais provável do dia e a mais cara.

---

## 3. Recuperação

### 3.1 Princípio

A recuperação acontece pelo **material**, não por aula repetida. O instrutor não reexplica.

Isso é viável porque o repositório-espelho do instrutor é liberado ao fim de cada dia, com um commit por parede. O aluno que faltou no D5 recupera pelo repositório do D5, que já é público.

**Não há conflito com a regra de atraso deliberado** (o repositório do dia só sai no fechamento): ela protege o dia corrente, não os anteriores.

### 3.2 Fontes de recuperação

| Fonte | Conteúdo |
|---|---|
| Repositório-espelho do instrutor | Um commit por parede, no domínio Biblioteca |
| Materiais do dia na plataforma | Enunciado, mural, contrato diário |
| Parceiro de dupla | Mesmo domínio, contexto idêntico. **Indisponível para aluno solo** (Doc 2, §2.4.1) |
| Qualquer colega da turma | Sem designação prévia |

**Janela reservada:** os 20 minutos de abertura, do **D4 ao D13** (Doc 4, §6, dono do calendário). Fora dessa janela, apenas os 75 min do D14.

### 3.3 Registro

Obrigatório, na plataforma, por aluno e por dia do curso:

- O que foi perdido
- O que foi reposto
- Por quem

É a única visibilidade do instrutor sobre quem está de fato acompanhando. Custa 30 segundos ao aluno e é o que alimenta a triagem dos Marcos 2 e 3.

### 3.4 Último recurso

Um aluno que acumule ausências a ponto de não conseguir sustentar o próprio repositório pode ser convertido em **copiloto no repositório do parceiro**, com apresentação conjunta no D15.

**Este recurso não tem gatilho automático.** Não existe número de faltas que o dispare. É julgamento do instrutor, alimentado pelo registro de §3.3, e reservado a casos extremamente específicos.

A razão de não haver gatilho: um limiar numérico transformaria uma exceção humana em regra burocrática, e a maioria dos alunos que perde dois dias recupera bem pelo material.

---

## 4. Crítica entre pares

### 4.1 Pareamento

**Sorteio por rodada**, com pareamento **diferente** na Crítica 1 e na Crítica 2.

Efeito: cada dupla enxerga dois domínios alheios ao longo do curso, em vez de um.

**Custo de contexto é baixo** porque o `README.md` de cada repositório contém a Tabela de Tradução e o Contrato de Domínio está em `/docs` (§6). O revisor se orienta em cerca de 3 minutos, sem precisar conhecer o domínio de antes.

### 4.2 Regra comum às duas rodadas

> Antes de comentar qualquer linha de código, o revisor precisa **explicar o domínio do colega em uma frase**.
>
> E precisa entregar **pelo menos um cenário concreto que quebra** — não uma opinião. *"Achei confuso"* não conta. *"E se o cliente cancelar depois de já ter começado?"* conta.

Sem essa regra, crítica entre iniciantes vira elogio mútuo e o curso perde 115 minutos.

### 4.3 Crítica 1 — D6, 55 min, sobre arquitetura

Acontece depois da P2, quando já existe máquina de estados implementada.

1. Quais são os estados, e qual transição vocês tentaram fazer que o código recusou?
2. Onde mora a regra da transição? Ela existe em mais de um lugar?
3. Se eu pedisse um estado novo, quantos arquivos vocês abririam?

### 4.4 Crítica 2 — D13, 60 min, sobre absorção do incremento

Acontece depois do envelope do D12. Revisa **como o colega absorveu a mudança**, não a arquitetura dele.

1. Sem olhar o código: qual era a regra de negócio deles, e o que mudou?
2. Quantos arquivos foram tocados para absorver? Quais?
3. O que no design anterior fez essa mudança ser fácil — ou difícil?

**Por que esta é a rodada mais importante:** a pergunta 1 não pode ser respondida por quem não entendeu o domínio alheio, e não pode ser gerada por ferramenta alguma. É o teste de transferência mais puro do curso.

### 4.5 Formato

- 25 minutos por direção
- Plenária de fechamento com o restante do tempo
- Registro escrito na plataforma, por ambas as partes

---

## 5. Não-aprovação

### 5.1 Marco 1 — Contrato de Domínio (D3, go/no-go duro)

| Etapa | Tratamento |
|---|---|
| Contrato reprovado no D3 | Refaz no mesmo dia, aprovação rolling |
| Ainda pendente no fim do D3 | Vai para a janela de abertura do D4. A dupla faz setup enquanto os demais começam a P1 |
| Ainda pendente no fim do D4 | Recebe um **contrato de emergência** |

**Contrato de emergência.** O instrutor mantém **2 Contratos pré-aprovados** de domínios de nível Fácil, escritos antes do D1.

Por que existe: sem essa rede, o instrutor cede e aprova um contrato ruim — e contrato ruim contamina os 12 dias seguintes. O contrato de emergência é o que permite o D3 ser genuinamente duro sem risco de deixar uma dupla encalhada.

> **Nenhuma linha de código do projeto antes da aprovação do Contrato.** Vale inclusive para quem recebe o contrato de emergência.

### 5.2 Marco 3 — prontidão para o incremento (D12, triagem)

| Versão do envelope | Conteúdo |
|---|---|
| **Integral** | 2 mudanças: uma regra de cálculo nova + um estado novo no fluxo |
| **Reduzida** | 1 mudança: apenas a regra de cálculo |

Mesma estrutura, menos superfície. A dupla continua sendo avaliada pelo mesmo critério, em escala menor.

### 5.3 Rebaixamento da trilha desafio — verificado na abertura do D7

Se uma dupla da trilha desafio não cumpriu os critérios de superação da P2 até o fechamento do D6, ela é rebaixada.

**A verificação acontece na abertura do D7**, não no D6 — o D6 fecha em 180 min exatos (Doc 4) e não tem tempo livre para a decisão.

**Rebaixamento é poda, não troca de domínio.**

O instrutor reescreve o Contrato reduzindo o escopo: de 5 estados para 3, conflito mais simples, fórmulas mais diretas. O domínio permanece o mesmo e o código já escrito continua valendo.

**Solução rejeitada:** trocar o domínio por um da trilha padrão. Descarta 3 dias de trabalho e desmoraliza mais do que ajuda.

*Nota para o Doc 2:* isto implica que o Contrato de Domínio é **editável pelo instrutor após a aprovação**, em caso de rebaixamento.

---

## 6. Entrega e GitHub

| Item | Regra |
|---|---|
| Repositório | Público, individual, `poo-<dominio>-<usuario>` |
| Push | Mínimo 1 por dia, no fechamento da aula |
| Commits | Convenção já praticada no CajuHub |
| `README.md` | Contém a **Tabela de Tradução** |
| `/docs/contrato.md` | O Contrato de Domínio aprovado |
| `/docs/log-de-paredes.md` | 5 linhas por parede |

### 6.1 Granularidade de commit

**Não exigida.** Iniciante trava tentando fazer o commit "certo" e para de codar.

O que se verifica é a **existência do push do dia**. Qualidade do histórico é assunto do Doc 6, e mesmo lá com peso baixo.

### 6.2 O repositório é o produto público

O repositório não é apenas entrega — é o **produto público** do curso, no sentido que o PBL dá ao termo.

| Regra | Conteúdo |
|---|---|
| Enquadramento | Declarado no D1: o repositório é público, é o produto, e permanece no ar depois do curso |
| Índice da turma | Página única listando os domínios e os repositórios da coorte |
| D15 | A apresentação termina com o link sendo compartilhado com a turma |

Custo: zero. O requisito já existia; faltava o enquadramento.

### 6.3 Por que a Tabela de Tradução vai no README

Resolve o problema de navegação do instrutor: um arquivo aberto e o vocabulário inteiro daquele projeto fica claro antes de qualquer classe ser lida.

Também é o que torna barato o sorteio de pareamento das críticas (§4.1) — o revisor não precisa conhecer o domínio de antes.

---

## 7. Contrato diário

**Formato:** 2 minutos na abertura, duas linhas registradas na plataforma.

> **Hoje faremos:** _____
> **Hoje NÃO faremos:** _____

**Fechamento:** 1 minuto — cumpriu ou não, e por quê.

### 7.1 Por que a segunda linha é a que importa

É a vacina contra scope creep diário, e cumpre a mesma função que a **C7** cumpre no Contrato de Domínio.

A turma vê a mesma disciplina operando em duas escalas: no projeto inteiro e no dia. Isso não é redundância — é o que faz a ideia pegar.

### 7.2 Custo e retorno

3 minutos por dia, 45 minutos no curso inteiro. O histórico acumulado vira insumo direto da retrospectiva do D15.

É **feature da plataforma**, não anotação de quadro.

---

## 8. Mural do "Precisamos Saber"

Artefato canônico do PBL. É o que torna visível o *need to know* que as paredes produzem, em vez de deixá-lo presumido.

### 8.1 Especificação

| Item | Regra |
|---|---|
| **Suporte** | Físico na parede da sala **e** espelhado na plataforma |
| **Organização** | Por **pergunta de parede** (Doc 3, D3-07), não por número |
| **Quem escreve** | A dupla, sempre que trava. Escreve a dúvida, não a solução |
| **Quando** | Durante o bloco de parede e o de implementação |
| **Quem risca** | O instrutor, quando a demonstração resolve o item |
| **Quando é consultado** | Na abertura de todo dia, e como **degrau 2 da escada** (§1.1) |

### 8.2 Por que físico e digital

O físico é o que funciona no calor da aula: a dupla levanta, escreve, e a sala inteira vê que não está sozinha travando. O digital é o que sobrevive ao dia e alimenta a retrospectiva do D15.

O espelhamento é responsabilidade do instrutor, no fechamento.

### 8.3 Regra de escrita

A dupla escreve **a pergunta, não o pedido de solução**.

| Aceito | Rejeitado |
|---|---|
| *"Como impedir que um estado mude de qualquer lugar?"* | *"Como faço private set?"* |
| *"Dá para ter uma lista com tipos diferentes juntos?"* | *"Me passa o código da classe abstrata"* |

O mural registra o problema sentido. A segunda coluna é o próprio mural virando cola.

---

## 9. Registro de decisões

| ID | Decisão | Resolução |
|---|---|---|
| **D5-01** | Escada de suporte | Dois regimes. Degrau 3 aberto a qualquer dupla, teto de 5 min. **Dupla-irmã rejeitada** (§1.3) |
| **D5-02** | Condução até a parede | Enunciado de negócio + 3 respostas permitidas + exceção de travamento acidental |
| **D5-03** | Recuperação | Pelo material, na janela de 20 min. Registro obrigatório por aluno e dia. Copiloto sem gatilho automático |
| **D5-04** | Roteiros de crítica | Duas rodadas, roteiros distintos, sorteio por rodada com pareamento diferente |
| **D5-05** | Não-aprovação | Contrato de emergência (Marco 1) · envelope reduzido (Marco 3) · poda, não troca (trilha desafio) |
| **D5-06** | Entrega e GitHub | Repositório público individual, push diário, README com Tabela de Tradução, sem exigência de granularidade |
| **D5-07** | Contrato diário | 2 min na abertura + 1 min no fechamento, registrado na plataforma |

---

## 10. SSOT — fonte de verdade única

| ID | Conteúdo |
|---|---|
| `D5-ESCADA` | Os dois regimes e os 4 degraus |
| `D5-CONDUCAO` | Enunciado de negócio, 3 respostas permitidas, exceção de acidente |
| `D5-RECUPERACAO` | Fontes, janela, registro obrigatório, último recurso |
| `D5-CRITICA` | Pareamento, regra comum, roteiros de C1 e C2, formato |
| `D5-NAOAPROVACAO` | Contrato de emergência, envelope reduzido, poda de trilha |
| `D5-ENTREGA` | Estrutura de repositório e regras de push |
| `D5-CONTRATODIARIO` | Formato e cadência |

Referenciado aqui, dono é outro:

| Fato | Dono |
|---|---|
| Critérios de superação de cada parede | Doc 3 |
| Dias, ritmo interno e janelas | Doc 4 |
| Conteúdo do envelope, pesos e notas | Doc 6 |

---

## 11. Notas cross-doc geradas por este documento

| Destino | Nota |
|---|---|
| **Doc 2** | O Contrato de Domínio é **editável pelo instrutor após a aprovação**, em caso de rebaixamento de trilha (§5.3) |
| **Doc 4** | O pareamento das críticas é sorteado no dia, não montado no D3 — nenhum tempo adicional necessário |
| **Doc 6** | Critério de avaliação para o aluno convertido em copiloto (§3.4) |
| **Doc 6** | Peso baixo para qualidade de histórico de commits (§6.1) |
| **Doc 7** | Área de registro de recuperação, por aluno e por dia do curso |
| **Doc 7** | Contrato diário como feature: campo de abertura, campo de fechamento, histórico acumulado até o D15 |
| **Doc 7** | Registro escrito das duas rodadas de crítica, por ambas as partes |
| **Doc 7** | Mural do "Precisamos Saber" precisa ser consultável durante o bloco de implementação — é o degrau 2 da escada |

---

## 12. Fila de preparo anterior ao D1

Consolidada aqui porque este documento é o último a gerar itens dela.

| Artefato | Origem |
|---|---|
| 3 briefings da trilha desafio | Doc 2, §3.4 |
| 1 contrato quebrado (domínio fictício, defeitos plantados) | Doc 3, D3-04 |
| 2 contratos de emergência | Doc 5, §5.1 |
| Template de projeto C# | Doc 4, D4 |
| Repositório-espelho Biblioteca, um commit por parede | Doc 3 e Doc 5, §3.1 |

O envelope de incremento **não** está nesta lista: é escrito entre o D4 e o D11, depois de conhecidos os domínios. Ver Doc 6.

---

## 13. Changelog

| Versão | Mudança |
|---|---|
| 1.2 | Correções de consistência: seções renumeradas (havia duas "9"). Janela de recuperação alinhada ao Doc 4 (D4–D13). Rebaixamento passa a ser verificado na abertura do D7. Aluno solo registrado como caso na fonte de recuperação |
| 1.1 | Mural do "Precisamos Saber" recebe dono e especificação (§8) — era artefato órfão, referenciado por três documentos e definido por nenhum. Repositório enquadrado como produto público (§6.2), fechando a lacuna de aderência ao PBL |
| 1.0 | Documento fechado. Decisões D5-01 a D5-07 resolvidas. Proposta de dupla-irmã avaliada e rejeitada, com as três funções redistribuídas. Recuperação redesenhada para operar pelo material em vez de por agente designado. Copiloto do §3.4 despromovido de regra com gatilho numérico para julgamento do instrutor |
