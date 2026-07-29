# ERRATA — Auditoria cruzada

| | |
|---|---|
| **Origem** | Auditoria cruzada da série completa, antes do início da codificação |
| **Resultado** | 4 inconsistências de fato + 6 lacunas de modelo, todas resolvidas |
| **Documentos afetados** | 2, 3, 4, 5, 6, 7 e o índice |

Este arquivo existe para o handoff. Nenhuma regra nova foi criada — o que houve foi propagação de decisões que já existiam e não tinham alcançado todos os documentos. Todas as mudanças seguiram o protocolo do **Doc 1, §0.3**.

---

## 1. Inconsistências de fato

Casos em que o documento dono e o referenciador divergiam. Resolvidos sempre a favor do **dono**.

| # | Onde | Era | Virou | Dono |
|---|---|---|---|---|
| 1 | Doc 2, §2.4 | "envelope do **D11**" — contradizendo inclusive o §4.1 do próprio doc | **D12** | Doc 4 (calendário) |
| 2 | Doc 3, P5, dia previsto | "prova de troca no **D12 ou D13**" | **D11** | Doc 4 (calendário) |
| 3 | Docs 4 e 5 | janela dos envelopes "**D3** ao D11" | **D4 ao D11** | Doc 6 (envelope) |
| 4 | Doc 5 | duas seções numeradas "9" | renumerado 9→13 | — |

**Causa dos itens 1 e 2:** decisões que mudaram durante o desenho — o incremento nasceu no D11 e foi para o D12; a prova da P5 nasceu no D13 e veio para o D11. As referências não propagaram.

---

## 2. Lacunas de modelo

Pontos que a plataforma precisaria decidir sozinha, e que nenhum documento definia.

### 2.1 Unidade de avaliação — a mais séria

Não estava declarado se o Eixo 1 é avaliado por aluno ou por grupo. Com repositórios individuais, avaliar por grupo faria **um aluno ausente herdar a nota do parceiro**.

**Resolvido — Doc 6, §1.1 (novo):**

| Eixo | Unidade |
|---|---|
| 1 — Modelo | **Aluno** |
| 2 — Absorção | **Grupo** |
| 3 — Prática | **Aluno** |

Exceção declarada: a verificação ao vivo do Marco 2 (D8) é **por grupo** — 40 min para 11 grupos é viável, para 22 alunos não é.

Operação: a nota diária é lançada por aluno, com o mesmo valor aplicado aos dois por padrão; o instrutor diverge só quando observa diferença real.

### 2.2 Modelo de dados corrigido — Doc 7, §2.2

`Repositorio`, `RegistroDiario` e `ConfirmacaoDePush` estavam pendurados em `Grupo`, contradizendo o §2.4 do próprio Doc 7 e o Doc 5 §6. **Movidos para `Aluno`.**

### 2.3 Dois mecanismos inventados pelo Doc 7 — violação da própria §0.3

| Era | Virou | Origem real |
|---|---|---|
| `obstáculo marcado como central` | campo **`peso`** em `Obstaculo` | `D6-PESOS-PAREDE` — o Doc 6 dá peso 2×, nunca falou em "central" |
| `aluno em modo copiloto` (sem entidade) | estado **`copiloto`** em `Aluno` | Doc 6, §9.1 |

### 2.4 "Superado" não estava definido

O painel de superação e o limiar de adiantamento dependiam de uma definição que não existia.

**Resolvido — Doc 6, §2:** superado = **nível ≥ 1**. Só o 0 não conta.

### 2.5 Constantes hardcoded violando o princípio de generalização

| Era | Virou | Onde |
|---|---|---|
| "9 em 11 duplas" | **80% dos grupos**, proporção configurável | Doc 4, §5.2 |
| "exibe os 18 temas" | "exibe todos os temas cadastrados" | Doc 7, M0 |

### 2.6 Entidades sem casa na plataforma

Adicionadas ao Doc 7, §2.3:

- `BancoDePerguntas` e `RegistroDeDefesa` — defesa oral do D15
- `MaterialDeReferencia` com dia de liberação — repositório-espelho com liberação temporizada
- `EscopoPreAprovado` — contratos de emergência
- `AtribuicaoDeExtensao` — visibilidade de extensão e monitoria
- `ReflexaoDeFechamento` — reflexão do Python e da tese
- `Eixo` ganha campo `unidade` (aluno | grupo)

---

## 3. Correções adicionais

| # | Achado | Resolução |
|---|---|---|
| 1 | Grupo exigia "exatamente 2 alunos" | Passa a aceitar **1 ou 2**. Regra de aluno sem par criada em Doc 2, §2.4.1 |
| 2 | Gatilho de rebaixamento no fim do D6, que fecha em 180 min exatos | Verificação movida para a **abertura do D7** |
| 3 | Janela de recuperação: "cada dia" (Doc 5) vs "D4 a D13" (Doc 4) | **D4 a D13**, mais os 75 min do D14 |
| 4 | `D2-SEM-PREVIO` repetido literalmente em três documentos | Docs 3 e 4 passam a **referenciar** em vez de repetir |
| 5 | `INDICE.md` sem versão nem changelog | Versionado, com changelog |

---

## 4. Regra de aluno sem par — Doc 2, §2.4.1

Turma ímpar, ou aluno cujo parceiro saiu, trabalha **sozinho no próprio domínio**. A dupla é mecanismo de apoio, não requisito do chassi.

- Grupo tem 1 ou 2 alunos
- Aluno solo mantém domínio e repositório próprios
- Recebe **scaffolding maior** do instrutor
- Se alguém faltar na formação, é adicionado ao aluno solo
- Consequência: o aluno solo não tem parceiro como fonte de recuperação, e depende do material e dos colegas

---

## 5. Versões após esta errata

| Doc | Versão |
|---|---|
| 1 — Método | 1.0 |
| 2 — Chassi de Domínio | **1.4** |
| 3 — Mapa de Paredes | **1.2** |
| 4 — Cronograma | **1.2** |
| 5 — Protocolos | **1.2** |
| 6 — Avaliação | **1.2** |
| 7 — Spec da Plataforma | **1.1** |
| ÍNDICE | **1.1** |

---

## 6. O que continua em aberto

Nenhuma inconsistência conhecida. Pendências de produção, não de documentação:

| Item | Bloco |
|---|---|
| Doc 8 — Plano de aula derivado, com objetivos de aprendizagem e bibliografia | — |
| Artefatos pré-D1: 3 briefings, contrato quebrado, 2 contratos de emergência, template C#, repositório-espelho | B |
| Material dos paradigmas refinado e slides do D1 | B |
| Fichas de aula, uma página por dia | C |
