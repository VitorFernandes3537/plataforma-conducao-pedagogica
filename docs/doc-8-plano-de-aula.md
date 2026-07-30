# DOC 8 — PLANO DE AULA

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.0 |
| **Natureza** | **Derivado** — não possui fatos próprios |
| **Depende de** | Docs 1 a 6 |
| **Audiência** | Coordenação institucional e alunos |

> **Nota de natureza.** Este documento reformata para uma audiência institucional fatos que já existem nos Docs 1 a 6. **Não decide nada.** Se algo aqui contradisser um documento anterior, o erro está aqui.
>
> Duas exceções, produzidas originalmente aqui porque nenhum documento anterior as continha: os **objetivos de aprendizagem** (§3) e as **referências** (§10). Ambas derivam de conteúdo existente, mas a redação é nova.

---

## 1. Identificação

| Campo | Conteúdo |
|---|---|
| Módulo | Programação Orientada a Objetos aplicada |
| Linguagem principal | C# / .NET |
| Linguagem complementar | Python (comparativa) |
| Carga horária | 60 horas — 15 encontros de 4h, contínuos |
| Modalidade | Presencial |
| Público | Turma iniciante com base prévia em HTML, CSS, JavaScript, TypeScript, React, React Native, SQL e metodologias ágeis |
| Pré-requisitos | Lógica de programação, estruturas condicionais e de repetição, funções, coleções |
| Metodologia | Aprendizagem Baseada em Projetos (PBL) |
| Instituição / professor / período | *(a preencher)* |

---

## 2. Ementa

Paradigmas de programação e o lugar da orientação a objetos entre eles. Objeto como unidade de estado e comportamento. Encapsulamento e proteção de invariantes. Tipos fechados e modelagem de estados. Máquinas de estado aplicadas a regras de negócio. Herança, classes abstratas e polimorfismo. Agregados e validação de regras entre objetos. Responsabilidade única e separação entre domínio, apresentação e persistência. Contratos por interface e inversão de dependência. Comparação entre tipagem estática e dinâmica. Modelagem de domínio a partir de requisitos de negócio. Versionamento, entrega pública e revisão por pares.

---

## 3. Objetivos de aprendizagem

### 3.1 Objetivo geral

Ao final do módulo, o aluno será capaz de **modelar e implementar, em C#, um sistema de domínio orientado a objetos que absorva mudanças de regra de negócio não previstas**, sustentando essa capacidade em encapsulamento, invariantes, polimorfismo e separação de responsabilidades.

### 3.2 Objetivos específicos — derivados das paredes

Cada objetivo corresponde a um obstáculo do mapa (Doc 3). A correspondência é 1:1 e verificada.

| # | Ao final do módulo, o aluno será capaz de… | Origem |
|---|---|---|
| **1** | **Garantir que um objeto não assuma estado inválido**, aplicando encapsulamento, tipos fechados e construtores que exigem os dados obrigatórios | P1 |
| **2** | **Impor invariantes de negócio dentro da própria entidade**, expressando transições de estado como métodos de negócio e impedindo transições ilegais | P2 |
| **3** | **Substituir estruturas condicionais por polimorfismo**, distribuindo comportamento variável entre classes de uma hierarquia | P3 |
| **4** | **Identificar e validar regras que envolvem mais de um objeto**, reconhecendo a raiz de um agregado como responsável por elas | P4 |
| **5** | **Separar regra de negócio de apresentação e de persistência**, definindo contratos por interface e invertendo dependências | P5 |

### 3.3 Objetivos específicos — não derivados de paredes

| # | Ao final do módulo, o aluno será capaz de… | Origem |
|---|---|---|
| **6** | **Distinguir os principais paradigmas de programação** e reconhecer em que situações a orientação a objetos é adequada | D1–D2 |
| **7** | **Modelar um domínio de negócio a partir de requisitos declarados**, definindo entidades, estados, restrições e escopo | Contrato de Domínio (C1–C7) |
| **8** | **Reconhecer o que um sistema de tipos garante**, comparando a mesma hierarquia em C# e em Python | D14 |
| **9** | **Avaliar criticamente o modelo de domínio de outro autor**, explicando suas regras e identificando cenários de falha | Rodadas de crítica |
| **10** | **Versionar e entregar trabalho técnico de forma pública e rastreável** | Entrega em repositório |

### 3.4 Verificação de cobertura

| Verificação | Resultado |
|---|---|
| Toda parede tem objetivo correspondente | ✅ 5 de 5 |
| Todo objetivo tem instrumento de avaliação | ✅ Objetivos 1–5 no Eixo 1; 7 e 9 no Eixo 2 e 3; 6, 8 e 10 no Eixo 3 |
| Objetivo sem conteúdo programático correspondente | Nenhum |

---

## 4. Competências e habilidades

| Competência | Como é exercitada |
|---|---|
| Análise de requisitos | Preenchimento e defesa do Contrato de Domínio |
| Negociação de escopo | Declaração obrigatória do que o sistema **não** fará (C7) e contrato diário |
| Resolução autônoma de problemas | Time-box de tentativa antes de qualquer demonstração; escada de suporte com o instrutor como último recurso |
| Revisão por pares | Duas rodadas de crítica com roteiro, sobre domínio alheio |
| Comunicação técnica | Log de decisões, apresentação final e defesa oral |
| Adaptação a mudança de requisito | Absorção de mudança de regra não anunciada |

---

## 5. Conteúdo programático

**Unidade I — Paradigmas e fundamentos de objeto** *(D1–D3)*
Paradigmas de programação. Objeto como estado e comportamento. Encapsulamento. Máquinas de estado. Modelagem de domínio e declaração de escopo.

**Unidade II — Integridade do objeto** *(D4–D6)*
Tipos fechados. Propriedades e acesso controlado. Construtores e objetos válidos por construção. Propriedades computadas. Invariantes de classe. Métodos de negócio. Sinalização de violação.

**Unidade III — Comportamento variável** *(D7–D8)*
Herança. Classes e métodos abstratos. Polimorfismo. Coleções de tipo base. Substituição de condicionais por hierarquia.

**Unidade IV — Regras entre objetos** *(D9)*
Agregado e raiz de agregado. Responsabilidade por regras de conjunto. Validação de coleção. Consultas sobre coleções.

**Unidade V — Arquitetura elementar** *(D10–D11)*
Responsabilidade única. Separação entre domínio, apresentação e persistência. Interface como contrato. Múltiplas implementações. Inversão de dependência.

**Unidade VI — Absorção de mudança e comparação de paradigmas** *(D12–D15)*
Aplicação de mudança de requisito sobre modelo existente. Avaliação de impacto. Tipagem estática e dinâmica. Classes base abstratas em Python. Revisão por pares e apresentação.

---

## 6. Metodologia

Aprendizagem Baseada em Projetos, organizada em torno da pergunta condutora:

> **Como escrever um sistema que sobrevive a uma mudança de regra que eu não previ?**

Cada grupo escolhe um domínio de negócio dentro de uma estrutura comum e declara suas regras em um contrato aprovado no terceiro encontro. A partir daí, todos os grupos enfrentam os mesmos cinco obstáculos, nos mesmos dias, cada um no seu domínio.

A sequência de cada obstáculo é fixa e não se inverte:

1. O grupo tenta e não consegue *(tentativa cronometrada)*
2. O professor demonstra ao vivo, em um domínio distinto do de todos os grupos
3. O grupo resolve no domínio próprio

O domínio de demonstração é deliberadamente distante dos domínios dos alunos, de modo que a solução não seja copiável por renomeação e exija transferência do princípio.

No décimo segundo encontro, cada grupo recebe uma mudança de regra de negócio que não podia prever, derivada do próprio contrato. Quanto foi necessário reescrever para absorvê-la é a resposta à pergunta condutora e compõe 30% da avaliação.

*Detalhamento completo: Doc 1 (método), Doc 3 (obstáculos), Doc 5 (protocolos).*

---

## 7. Recursos didáticos

| Recurso | Uso |
|---|---|
| Laboratório com .NET SDK e editor | Todos os encontros a partir do quarto |
| Plataforma de apoio | Contrato, registros diários, mural, críticas, avaliação |
| Repositório de referência do professor | Domínio de demonstração, um commit por obstáculo, liberação ao fim de cada dia |
| Repositório público por aluno | Entrega e produto final |
| Mural físico de dúvidas | Registro visível do que a turma precisa saber |
| Material interativo de abertura | Primeiro encontro |

**Sobre o material de estudo.** O repositório de referência do professor é o material de recuperação e aprofundamento do módulo. Não há apostila paralela, por decisão de projeto: material conceitual separado do código divergiria dele na primeira alteração.

---

## 8. Avaliação

| Eixo | Objeto | Unidade | Peso |
|---|---|---|---|
| **1 — Modelo de domínio** | Os cinco obstáculos | Aluno | **50%** |
| **2 — Absorção de mudança** | A mudança de regra do décimo segundo encontro | Grupo | **30%** |
| **3 — Prática de trabalho** | Entrega, registro, crítica, reflexão | Aluno | **20%** |

**Escala por item:** 0 (não superou) · 1 (superou com apoio) · 2 (superou de forma autônoma) · 3 (superou e generalizou).

**Verificações formais:** aprovação do contrato de domínio (3º encontro) · verificação de extensibilidade do modelo (8º encontro) · prontidão para a mudança de regra (12º encontro).

**Defesa oral:** ao fim da apresentação final, cada grupo responde a duas perguntas sobre decisões de projeto do próprio código.

**Não há prova escrita nem trabalho para casa.** Toda avaliação é capturada durante os encontros. *Detalhamento: Doc 6.*

---

## 9. Cronograma resumido

| Encontro | Foco | Verificação |
|---|---|---|
| 1 | Abertura, metodologia, paradigmas, apresentação dos domínios | — |
| 2 | Objeto, encapsulamento, estado e comportamento | — |
| 3 | Máquinas de estado e Contrato de Domínio | **Marco 1** |
| 4 | Ambiente, transição para C#, integridade do objeto | — |
| 5–6 | Invariantes e transições de estado · 1ª crítica | — |
| 7–8 | Polimorfismo e comportamento variável | **Marco 2** |
| 9 | Agregados e regras de conjunto | — |
| 10–11 | Separação de responsabilidades e contratos por interface | — |
| 12 | Mudança de regra de negócio | **Marco 3** |
| 13 | Absorção da mudança · 2ª crítica | — |
| 14 | Comparação com Python · recuperação | — |
| 15 | Apresentações, defesa oral, retrospectiva | Entrega |

*Cronograma detalhado, com blocos e tempos: Doc 4.*

---

## 10. Referências

### 10.1 Fundamentos de orientação a objetos e modelagem

- EVANS, Eric. **Domain-Driven Design: Tackling Complexity in the Heart of Software**. Addison-Wesley, 2003.
- FOWLER, Martin. **Refactoring: Improving the Design of Existing Code**. 2. ed. Addison-Wesley, 2018.
- FOWLER, Martin. **AnemicDomainModel**. 2003. Disponível em: martinfowler.com.
- GAMMA, Erich; HELM, Richard; JOHNSON, Ralph; VLISSIDES, John. **Design Patterns: Elements of Reusable Object-Oriented Software**. Addison-Wesley, 1994.
- MARTIN, Robert C. **Agile Software Development: Principles, Patterns, and Practices**. Prentice Hall, 2002.
- MARTIN, Robert C. **Clean Code: A Handbook of Agile Software Craftsmanship**. Prentice Hall, 2008.

### 10.2 Documentação técnica

- MICROSOFT. **Documentação do C# e do .NET**. learn.microsoft.com.
- PYTHON SOFTWARE FOUNDATION. **Documentação do módulo `abc` — Abstract Base Classes**. docs.python.org.

### 10.3 Metodologia

- PBLWORKS (Buck Institute for Education). **Gold Standard PBL: Essential Project Design Elements**.
- BENDER, William N. **Project-Based Learning: Differentiating Instruction for the 21st Century**. Corwin, 2012.

> **Natureza destas referências.** São fontes de fundamentação do plano, **não leitura obrigatória do aluno**. O módulo não atribui leitura extraclasse: parte da turma não dispõe de computador fora da instituição, e nenhum item da avaliação pressupõe trabalho em casa. A lista serve à coordenação e ao aluno que quiser aprofundar por conta própria.

---

## 11. Rastreabilidade

De onde cada seção deriva. Nenhuma seção deste documento é fonte de verdade.

| Seção | Documento dono |
|---|---|
| 1 — Identificação | Doc 1, §6 · Doc 4, §1 |
| 2 — Ementa | Doc 3 (`D3-MAPA`, `D3-ESCOPO`) |
| 3 — Objetivos | Redigidos aqui, derivados de `D3-MAPA` e `D2-CONTRATO` |
| 4 — Competências | Doc 5 · Doc 6, §5 |
| 5 — Conteúdo programático | Doc 3 · Doc 4, §3 |
| 6 — Metodologia | Doc 1, §1–3 |
| 7 — Recursos | Doc 5, §3.2 e §6 · Doc 7 |
| 8 — Avaliação | Doc 6 (`D6-EIXOS`, `D6-ESCALA`, §1.1) |
| 9 — Cronograma | Doc 4 (`D4-CALENDARIO`, `D4-MARCOS`) |
| 10 — Referências | Redigidas aqui |

---

## 12. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Documento criado como derivação institucional dos Docs 1 a 6. Objetivos de aprendizagem redigidos pela primeira vez, com correspondência 1:1 verificada contra as cinco paredes. Referências compiladas. Vocabulário convertido de "parede", "dupla" e "envelope" para termos institucionais, sem alterar nenhum fato |
