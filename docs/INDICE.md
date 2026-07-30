# ÍNDICE CANÔNICO — Curso de POO com C#/.NET

**Fonte de verdade da série.** Este arquivo é o ponto de entrada. Leia-o antes de qualquer decisão de implementação.

| | |
|---|---|
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias contínuos |
| **Turma** | ~20 alunos, 10–12 duplas, iniciantes vindos de front-end e TypeScript |
| **Versão do índice** | 1.2 |
| **Estado da série** | 11 documentos fechados |
| **Última emissão** | Auditoria cruzada aplicada — 4 inconsistências de fato e 6 lacunas de modelo resolvidas |

---

## Documentos

| Doc | Arquivo | Versão | Responde |
|---|---|---|---|
| **1** | `doc-1-metodo.md` | 1.0 | Por que o curso é assim. Pergunta condutora, tese, princípios, aderência ao PBL, protocolo de mudança |
| **2** | `doc-2-chassi-de-dominio.md` | **1.5** | O esqueleto comum aos projetos, o banco de domínios e o Contrato de Domínio |
| **3** | `doc-3-mapa-de-paredes.md` | **1.2** | As 5 paredes, o que se ensina em cada uma e o que fica de fora |
| **4** | `doc-4-cronograma.md` | **1.2** | O que acontece em cada um dos 15 dias |
| **5** | `doc-5-protocolos.md` | **1.2** | Condução, apoio, recuperação, crítica, entrega, mural |
| **6** | `doc-6-avaliacao.md` | **1.2** | Eixos, unidade de avaliação, escala, envelope de incremento, defesa oral |
| **7** | `doc-7-spec-plataforma.md` | **1.1** | Como isso vira software. Modelo de dados, milestones, backlog de 19 issues |
| **8** | `doc-8-plano-de-aula.md` | 1.0 | Plano de aula institucional. Ementa, objetivos de aprendizagem, referências |
| **9** | `doc-9-repositorio-espelho.md` | 1.0 | Spec do repositório-espelho Biblioteca. 33 commits, convenção, tags |
| **10** | `doc-10-template-aluno.md` | 1.0 | Template C# entregue ao aluno no D4 |
| **11** | `doc-11-paradigmas.md` | **1.1** | Material de paradigmas do D1. Roteiro, biblioteca de referência, tipos de slide |

---

## Regras de uso — leia antes de codificar

### 1. Um fato tem um único dono

Cada fato mora em exatamente um documento. Todos os outros o referenciam por ID e **nunca o redefinem**. Antes de escrever qualquer regra na plataforma, localize o dono na tabela SSOT abaixo.

### 2. O Doc 7 nunca inventa fato

A spec da plataforma deriva dos Docs 1 a 6. Uma regra que só existe no código e não existe em nenhum documento é **desvio**, não decisão.

### 3. Protocolo de mudança

Quando uma regra mudar durante o desenvolvimento:

1. Identifique o documento dono pelo ID SSOT
2. Altere **lá**, incremente a versão, registre no changelog com o motivo
3. Verifique as notas cross-doc do documento alterado
4. Só então implemente

Decisão tomada no terminal e não registrada aqui deixa de existir na semana seguinte.

### 4. Consulte as rejeições antes de reintroduzir algo

Vários documentos têm seções de "avaliado e rejeitado" — dupla-irmã, Hemocentro, Torre de Controle, troca de domínio no rebaixamento, paredes P7 e P8, SQLite. Elas existem para que ideias descartadas com motivo não voltem parecendo boas.

---

## Mapa SSOT

| Documento | IDs |
|---|---|
| **Doc 1** | `D1-PERGUNTA` `D1-TESE` `D1-PRINCIPIOS` `D1-PBL` `D1-SACRIFICIOS` `D1-RESTRICOES` `D1-PROTOCOLO` |
| **Doc 2** | `D2-CHASSI` `D2-CONTRATO` `D2-BANCO` `D2-ORCAMENTO` `D2-DISTANCIA` `D2-NOMES` `D2-TRILHAS` `D2-BRIEFING` `D2-SEM-PREVIO` |
| **Doc 3** | `D3-MAPA` `D3-ESQUEMA` `D3-ESCOPO` `D3-SUPERACAO` `D3-EXTENSOES` `D3-CORTES` `D3-ORDEM` |
| **Doc 4** | `D4-CALENDARIO` `D4-RITMO` `D4-MARCOS` `D4-BANCO` `D4-SACRIFICIO` `D4-RESERVA` |
| **Doc 5** | `D5-ESCADA` `D5-CONDUCAO` `D5-RECUPERACAO` `D5-CRITICA` `D5-NAOAPROVACAO` `D5-ENTREGA` `D5-CONTRATODIARIO` `D5-MURAL` |
| **Doc 6** | `D6-EIXOS` `D6-ESCALA` `D6-PESOS-PAREDE` `D6-ENVELOPE` `D6-DEFESA` `D6-CAPTURA` `D6-IA` |
| **Doc 7** | derivado — sem fatos próprios |
| **Doc 8** | derivado — exceto a redação dos objetivos de aprendizagem e das referências |
| **Doc 9** | derivado — sem fatos próprios |
| **Doc 10** | derivado — sem fatos próprios |
| **Doc 11** | **§10 é SSOT** — vocabulário de tipos de slide. O resto é derivado |

---

## Vocabulário — evite colisões

| Prefixo | Significado |
|---|---|
| **C1–C7** | As 7 perguntas do **Contrato de Domínio** (Doc 2) |
| **P1–P5** | As 5 **paredes** (Doc 3) |
| **D1–D15** | Os 15 **dias** do curso (Doc 4) |
| **D2-01, D3-04…** | **Decisões** registradas, por documento |
| **Marco 1/2/3** | Pontos de verificação em D3, D8 e D12 |

---

## Resumo executivo do desenho

**Pergunta condutora:** *Como escrever um sistema que sobrevive a uma mudança de regra que eu não previ?*

Cada dupla escolhe um domínio de negócio dentro de um chassi fixo (Atendimento Agendado) e declara suas regras num Contrato de Domínio aprovado no D3. Do D4 ao D11 todas as duplas batem nas mesmas 5 paredes, no mesmo dia, cada uma no seu domínio — o instrutor codifica ao vivo um domínio distante (Biblioteca) para forçar transferência em vez de cópia.

No D12 cada dupla recebe um envelope com uma mudança de regra que não podia prever, derivada do próprio Contrato. Quanto precisou reescrever para absorvê-la é a resposta à pergunta condutora, e vale 30% da nota.

**Ordem que nunca se inverte:** a dupla tenta e falha (40 min) → o instrutor demonstra → a dupla resolve.

---

## Dependências críticas

| Dependência | Consequência se falhar |
|---|---|
| **Validação automática do Contrato** (Doc 2, §4.6) | Sem ela, não é possível aprovar 11 contratos nos 95 min do D3 |
| **Captura contínua de avaliação** (Doc 6, §0.3) | Sem ela, a avaliação desaba para um fim de semana corrigindo 22 repositórios |
| **Repositório-espelho documentado** (Doc 5, §3.1) | É o único material de recuperação do curso |

---

## Fila de preparo anterior ao D1

| Artefato | Origem |
|---|---|
| 3 briefings da trilha desafio | Doc 2, §3.4 |
| 1 contrato quebrado, com defeitos plantados | Doc 3, D3-04 |
| 2 contratos de emergência | Doc 5, §5.1 |
| Template de projeto C# | Doc 4, D4 |
| Repositório-espelho Biblioteca, 1 commit por parede | Doc 3 e Doc 5, §3.1 |
| Material dos paradigmas, refinado | Doc 4, D1 |
| Slides interativos de abertura | Doc 4, D1 |

Os ~11 envelopes de incremento **não** entram nesta fila: são derivados dos Contratos, entre o D4 e o D11.

---

## Changelog do índice

| Versão | Mudança |
|---|---|
| 1.2 | Docs 8 a 11 adicionados à série. Doc 2 vai a v1.5 (orçamento por conceito, quinto papel). Doc 7 vai a v1.4 (`BlocoDeMaterial`). Doc 11 §10 passa a ser SSOT dos tipos de slide |
| 1.1 | Auditoria cruzada aplicada. Docs 2, 3, 4, 5, 6 e 7 versionados. Unidade de avaliação declarada no Doc 6 §1.1. Ver `ERRATA.md` |
| 1.0 | Índice criado com a série completa |
