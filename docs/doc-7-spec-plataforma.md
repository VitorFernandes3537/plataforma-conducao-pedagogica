# DOC 7 — SPEC DA PLATAFORMA

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.4 |
| **Natureza** | **Derivado** — não possui fatos próprios |
| **Depende de** | Docs 1 a 6 |
| **Processo** | SDD: esta spec gera o backlog de issues. TDD: os critérios de aceite viram nomes de teste |

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- Qual é o modelo de dados da plataforma
- O que ela faz, milestone a milestone
- Quais são os critérios de aceite de cada funcionalidade, em forma de teste
- Como a spec vira backlog de issues

### 0.2 O que este documento NÃO responde

| Pergunta | Quem decide |
|---|---|
| Stack, framework, linguagem, banco | O desenvolvedor, no terminal |
| Arquitetura de pastas, padrões de código | O desenvolvedor |
| Design visual, componentes, tipografia | O desenvolvedor |
| Qualquer regra pedagógica | **Docs 1 a 6** — nunca aqui |

### 0.3 Regra inviolável

> **Este documento não inventa fato.**
>
> Toda regra de comportamento referencia um ID SSOT dos Docs 1 a 6. Uma regra que existe apenas na plataforma e em nenhum documento anterior é **desvio**, não decisão.
>
> Se durante o desenvolvimento surgir a necessidade de uma regra nova: pare, aplique o protocolo do Doc 1 §0.3 (altere o doc dono, versione, propague), e só então implemente.

### 0.4 Relação com as issues do GitHub

| Artefato | Papel |
|---|---|
| **Doc 7** | A spec. Descreve o quê e o porquê. Versionado |
| **Issue** | A unidade de execução. Implementa uma fatia e **referencia** o comportamento |

Issue é fila de trabalho, não fonte de verdade. Toda issue carrega o ID SSOT no corpo, de modo que uma mudança de regra possa ser rastreada por busca até todas as issues afetadas.

---

## 1. Princípio de generalização

A plataforma **não é específica deste curso**. Ela precisa servir a qualquer módulo desenhado pelo mesmo método — mobile, React, banco de dados, o que vier.

Consequência direta: **nenhuma entidade do modelo menciona POO, C#, paredes ou domínios de negócio.** O vocabulário do modelo é genérico; este curso é uma instância.

| Conceito deste curso | Entidade genérica |
|---|---|
| Parede | `Obstaculo` |
| Domínio de negócio | `Tema` |
| Banco de domínios | `BancoDeTemas` |
| Contrato de Domínio | `FormularioDeEscopo` |
| Envelope de incremento | `Incremento` |
| Dupla | `Grupo` |
| Chassi | `Estrutura` |

Hardcode de "parede", "C#" ou "biblioteca" em qualquer lugar do modelo é bug.

---

## 2. Modelo de dados

Entidades e relações. Sem tipos, sem SQL — isso é decisão do desenvolvedor.

### 2.1 Estrutura do curso

```
Curso
 ├── Turma ──── Aluno ──── Grupo (1–2 alunos, 1 Tema)
 ├── Dia (1..N) ──┬── Bloco (ordem, duração, tipo)
 │                 └── Marco (opcional; tipo: duro | triagem)
 ├── BancoDeTemas ──── Tema (nome, dificuldade, trilha, briefing?)
 ├── Estrutura ──── Papel (obrigatório)
 ├── FormularioDeEscopo ──── Pergunta (enunciado, aceite, validações)
 └── Obstaculo (1..N) ──── Extensao
```

### 2.2 Produção do aluno

```
Grupo                                  Aluno
 ├── RespostaDeEscopo                    ├── Repositorio (url, público)
 │    ├── RespostaPergunta                └── RegistroDiario (por Dia)
 │    └── TabelaDeTraducao                     ├── AvaliacaoObstaculo (0–3)
 └── Incremento                                ├── LogDeObstaculo (texto)
      (derivado da RespostaDeEscopo)           ├── ContratoDiario
                                               ├── ConfirmacaoDePush
                                               └── ReflexaoDeFechamento
```

**A unidade importa e é declarada pelo Doc 6, §1.1:**

| Pendura em `Grupo` | Pendura em `Aluno` |
|---|---|
| `RespostaDeEscopo`, `Incremento` | `Repositorio`, `RegistroDiario`, `ConfirmacaoDePush` |

O repositório é individual (Doc 5, §6). Avaliar o Eixo 1 por grupo faria um aluno ausente herdar a nota do parceiro.

### 2.3 Instrumentos

```
Mural ──── ItemDeMural (pergunta, autor, status, Obstaculo)
RodadaDeCritica ──── ParDeCritica (revisor, revisado) ──── RegistroDeCritica
RegistroDeRecuperacao (aluno, dia, o que perdeu, o que repôs, por quem)
Rubrica ──── Eixo (peso, unidade: aluno | grupo) ──── ItemDeAvaliacao (escala, peso)
MaterialInterativo (slides, por Dia) ──── BlocoDeMaterial (tipo, conteudo, ordem)
BancoDePerguntas ──── Pergunta (usada na defesa oral)
RegistroDeDefesa (grupo, perguntas usadas, ajuste por eixo)
MaterialDeReferencia (url, dia de liberação)   ← repositório-espelho, liberação temporizada
EscopoPreAprovado (formulário de emergência, pronto antes do D1)
AtribuicaoDeExtensao (aluno, obstáculo, tipo: extensão | monitoria)
```

### 2.4 Regras de integridade que a plataforma garante

| Regra | Origem |
|---|---|
| Um `Tema` pertence a no máximo um `Grupo` por `Turma` | `D2-BANCO` |
| `Grupo` tem **1 ou 2** `Aluno`, cada um com `Repositorio` próprio | Doc 2, §2.4.1 · Doc 5, §6 |
| `RespostaDeEscopo` é imutável após aprovação, **exceto** por edição do instrutor em caso de poda | Doc 2, §4.5.1 |
| `Incremento` só pode ser gerado a partir de `RespostaDeEscopo` aprovada | `D6-ENVELOPE` |
| `AvaliacaoObstaculo` só aceita 0–3 | `D6-ESCALA` |
| `Obstaculo` tem campo `peso` — não flag de "central" | `D6-PESOS-PAREDE` |
| Obstáculo é considerado **superado** quando a avaliação é ≥ 1 | Doc 6, §2 |
| `Aluno` tem estado `copiloto`, que altera a origem da nota do Eixo 1 | Doc 6, §9.1 |
| `Eixo` declara sua unidade: aluno ou grupo | Doc 6, §1.1 |
| Nenhum limiar ou quantidade é constante — todos configuráveis por curso | Doc 7, §1 |
| `BlocoDeMaterial` tem `tipo` de um vocabulário fechado, definido fora da plataforma | Doc 11, §10 |

---

## 3. Papéis

| Papel | Pode |
|---|---|
| **Instrutor** | Tudo. Aprovar escopo, editar em caso de poda, avaliar, gerar incrementos, riscar mural |
| **Aluno** | Ver e editar o próprio `RespostaDeEscopo` antes da aprovação · registrar log, contrato diário, push, crítica, recuperação · escrever no mural · ver o índice público da turma |

Aluno **não** vê: avaliações de outros grupos, incrementos antes do D12, notas antes da agregação.

---

## 4. Milestones

Os milestones são **prazos do cronograma do curso**, não áreas de feature. Construir fora dessa ordem produz software pronto tarde demais para servir.

---

### M0 — antes do D1

**Sem isso, o primeiro dia não acontece.**

| Funcionalidade | Origem |
|---|---|
| Cadastro de curso, turma e alunos | — |
| Formação de grupos | Doc 5 |
| `BancoDeTemas` visível, com dificuldade e trilha | `D2-BANCO` |
| Briefings da trilha desafio anexados aos temas | `D2-BRIEFING` |
| Slides interativos de abertura | Doc 4, D1 |
| Cadastro de escopos pré-aprovados (emergência) | Doc 5, §5.1 |
| Cadastro de material de referência com dia de liberação | Doc 5, §3.2 |
| Pergunta condutora exibida de forma persistente | `D1-PERGUNTA` |

**Critérios de aceite**

- `exibe todos os temas cadastrados no banco, com dificuldade e trilha`
- `tema da trilha desafio exibe briefing anexado`
- `tema já alocado a um grupo aparece como indisponível`
- `pergunta condutora aparece em todas as telas do aluno`
- `aluno sem grupo não acessa formulário de escopo`

---

### M1 — antes do D3

**Dependência crítica.** Sem a validação automática, não é possível aprovar 11 formulários nos 95 minutos do D3.

| Funcionalidade | Origem |
|---|---|
| Formulário de escopo, 7 perguntas + tabela de tradução | `D2-CONTRATO` |
| Validação automática dos 7 critérios mecânicos | Doc 2, §4.6 |
| Fila de aprovação do instrutor, com os 4 julgamentos humanos | Doc 2, §4.6 |
| Alocação de tema com garantia de unicidade | `D2-BANCO` |
| Estado: rascunho → submetido → aprovado / devolvido | Doc 2, §4.5 |

**Critérios de aceite**

- `rejeita formulário com pergunta em branco`
- `rejeita menos de 3 ou mais de 5 estados`
- `rejeita quantidade de categorias diferente de 3`
- `rejeita menos de 3 itens em fora de escopo`
- `rejeita transição ilegal que cite estado não declarado`
- `rejeita nome genérico na tabela de tradução (lista negra)`
- `rejeita tema já alocado a outro grupo`
- `formulário reprovado na validação automática não entra na fila do instrutor`
- `instrutor vê apenas os 4 julgamentos humanos na fila`
- `formulário aprovado torna-se somente leitura para o aluno`
- `instrutor consegue editar formulário aprovado apenas com motivo "poda"`

---

### M2 — antes do D4

**Dependência crítica.** Sem captura contínua, a avaliação desaba para correção final de 22 repositórios.

| Funcionalidade | Origem |
|---|---|
| Registro diário por aluno | `D6-CAPTURA` |
| Avaliação de obstáculo em escala 0–3 | `D6-ESCALA` |
| Log de obstáculo (texto livre) | Doc 5, §6 |
| Contrato diário: faremos / não faremos / cumprido | `D5-CONTRATODIARIO` |
| Confirmação de push | Doc 5, §6 |
| Registro de recuperação por aluno e por dia | `D5-RECUPERACAO` |
| Painel do instrutor: quantos grupos superaram o obstáculo do dia | Doc 4, §5.2 |

**Critérios de aceite**

- `avaliação de obstáculo aceita apenas 0, 1, 2 ou 3`
- `dia sem registro aparece como pendente no painel`
- `contrato diário exige as duas linhas antes de fechar o dia`
- `registro de recuperação exige aluno, dia, o que perdeu e por quem foi reposto`
- `painel calcula quantos grupos superaram o obstáculo do dia`
- `painel considera superado apenas avaliação maior ou igual a 1`
- `painel sinaliza quando o limiar configurado de adiantamento é atingido`
- `limiar é proporção configurável por curso, não constante`
- `material de referência não aparece ao aluno antes do dia de liberação`
- `instrutor pode registrar atribuição de extensão ou monitoria por aluno`

---

### M3 — antes do D6

| Funcionalidade | Origem |
|---|---|
| Mural: item por pergunta de obstáculo, escrita pelo grupo | `D5-MURAL` |
| Instrutor risca item resolvido | `D5-MURAL` |
| Rodada de crítica com sorteio de pares | Doc 5, §4.1 |
| Registro de crítica pelas duas partes | Doc 5, §4.5 |
| Roteiros distintos para C1 e C2 | Doc 5, §4.3 e §4.4 |

**Critérios de aceite**

- `item de mural exige vínculo com uma pergunta de obstáculo`
- `apenas instrutor pode marcar item de mural como resolvido`
- `sorteio da rodada 2 não repete par da rodada 1`
- `registro de crítica exige a frase de explicação do tema alheio`
- `registro de crítica exige ao menos um cenário concreto de quebra`
- `rodada de crítica incompleta aparece pendente para ambas as partes`

---

### M4 — antes do D12

| Funcionalidade | Origem |
|---|---|
| Gerador de incremento a partir da `RespostaDeEscopo` | `D6-ENVELOPE` |
| Campos preenchidos: remetente, contexto, M1, M2, o que não muda | Doc 6, §4.2 |
| Versão reduzida (só M1) | Doc 6, §4.6 |
| Liberação temporizada — invisível ao aluno antes do D12 | Doc 4, D12 |
| Triagem do Marco 3 | Doc 5, §5.2 |

**Critérios de aceite**

- `gerador pré-carrega estados e categorias a partir do formulário aprovado`
- `incremento exige remetente nomeado`
- `incremento exige ao menos 2 itens em "o que não muda"`
- `incremento não é visível ao aluno antes da liberação`
- `versão reduzida omite a mudança de estado`
- `não gera incremento para grupo sem formulário aprovado`

**Fallback documentado:** se o M4 atrasar, os ~11 incrementos são escritos à mão em cerca de 2h (Doc 6, §4.4). Nenhum outro milestone tem fallback.

---

### M5 — antes do D15

| Funcionalidade | Origem |
|---|---|
| Agregação dos 3 eixos com pesos configuráveis por curso | `D6-EIXOS` · Doc 6, §13 |
| Peso do obstáculo aplicado ao Eixo 1, via campo `peso` | `D6-PESOS-PAREDE` |
| Registro da defesa oral, com as perguntas usadas | `D6-DEFESA` |
| Reflexão sobre a tese na retrospectiva | Doc 6, §5.1 |
| Reflexão da linguagem espelho como item do Eixo 3 | Doc 6, §7 |
| Banco de perguntas da defesa oral | `D6-DEFESA` |
| Índice público da turma: temas e repositórios | Doc 5, §6.2 |

**Critérios de aceite**

- `agregação respeita os pesos configurados por eixo`
- `obstáculo com peso 2 contribui em dobro no eixo 1`
- `aluno com estado copiloto é avaliado no eixo 1 apenas pela defesa oral`
- `eixo declarado como unidade aluno agrega por aluno; unidade grupo agrega por grupo`
- `reflexão da linguagem espelho entra como item do eixo 3`
- `defesa oral registra quais perguntas foram usadas`
- `índice público lista tema e repositório de cada grupo`
- `nota não é visível ao aluno antes da agregação final`

---

## 5. Dependências críticas

| Dependência | Prazo | Consequência se falhar |
|---|---|---|
| Validação automática do formulário | D3 | Impossível aprovar 11 formulários em 95 min |
| Captura contínua | D4 | Avaliação vira fim de semana corrigindo 22 repositórios |
| Slides de abertura | D1 | O primeiro dia não tem material |

O restante degrada com elegância: mural volta a ser só físico, crítica volta a ser papel, incremento volta a ser manual.

---

## 6. O que a plataforma NÃO faz

- Não hospeda código de aluno — isso é GitHub
- Não corrige código automaticamente
- Não detecta uso de IA (Doc 6, §8: o problema é resolvido na saída)
- Não substitui o mural físico — espelha
- Não gera conteúdo pedagógico
- Não tem app móvel nativo

---

## 7. Backlog de issues

Cada linha é uma issue. Título, milestone e o ID SSOT que vai no corpo. Critérios de aceite saem da seção 4 e viram nomes de teste.

| # | Issue | Milestone | SSOT |
|---|---|---|---|
| 1 | Modelo genérico: Curso, Turma, Aluno, Grupo | M0 | — |
| 2 | Modelo genérico: Dia, Bloco, Marco | M0 | `D4-CALENDARIO` `D4-RITMO` |
| 3 | BancoDeTemas com dificuldade, trilha e briefing | M0 | `D2-BANCO` `D2-BRIEFING` |
| 4 | Slides interativos de abertura | M0 | Doc 4, D1 |
| 5 | Pergunta condutora persistente | M0 | `D1-PERGUNTA` |
| 6 | FormularioDeEscopo configurável (7 perguntas) | M1 | `D2-CONTRATO` |
| 7 | Motor de validação automática | M1 | Doc 2, §4.6 |
| 8 | Alocação de tema com unicidade | M1 | `D2-BANCO` |
| 9 | Fila de aprovação do instrutor + estados | M1 | Doc 2, §4.5 |
| 10 | Edição pós-aprovação restrita a poda | M1 | Doc 2, §4.5.1 |
| 11 | RegistroDiario: avaliação 0–3, log, push | M2 | `D6-CAPTURA` `D6-ESCALA` |
| 12 | Contrato diário | M2 | `D5-CONTRATODIARIO` |
| 13 | Registro de recuperação | M2 | `D5-RECUPERACAO` |
| 14 | Painel do instrutor + limiar de adiantamento | M2 | Doc 4, §5.2 |
| 15 | Mural digital | M3 | `D5-MURAL` |
| 16 | Rodadas de crítica com sorteio e roteiros | M3 | `D5-CRITICA` |
| 17 | Gerador de incremento + liberação temporizada | M4 | `D6-ENVELOPE` |
| 18 | Agregação da rubrica e defesa oral | M5 | `D6-EIXOS` `D6-DEFESA` |
| 19 | Índice público da turma | M5 | Doc 5, §6.2 |

19 issues. Fatias verticais; a granularidade fina fica por conta do TDD.

---

## 8. Modelo de issue

```
## Contexto
Implementa <funcionalidade> descrita em Doc 7, §<seção>.

## SSOT
<IDs> — ver documento dono antes de alterar qualquer regra.

## Critérios de aceite
- [ ] <critério 1>   → teste: `<nome_do_teste>`
- [ ] <critério 2>   → teste: `<nome_do_teste>`

## Fora de escopo
- <o que esta issue não faz>
```

---

## 9. SSOT

**Nenhum.** Este documento é derivado e não possui fatos próprios.

Toda regra aqui aponta para os Docs 1 a 6. Se algo neste documento contradisser um deles, o erro está aqui.

---

## 10. Changelog

| Versão | Mudança |
|---|---|
| 1.4 | **Adição, nada removido nem renomeado.** §2.3: `MaterialInterativo` passa a ter `BlocoDeMaterial (tipo, conteudo, ordem)`. O vocabulário de tipos é propriedade do **Doc 11 §10** — a plataforma renderiza, não define. Nenhuma entidade, critério de aceite ou teste existente é afetado. A implementação é posterior ao M5, como issue 24 |
| 1.3 | **Propagação, nenhum fato novo.** §2.1: o diagrama indentava `Marco` sob `Bloco`, atribuindo o marco a um bloco. O Doc 4 §4, que é dono, atribui cada marco a um **dia** — Marco 1 no D3, Marco 2 no D8, Marco 3 no D12 — e o `BACKLOG.md` já descrevia corretamente "um dia pode ter um marco". Corrigida a indentação: `Bloco` e `Marco` passam a ser ramos irmãos de `Dia` |
| 1.2 | **Propagação, nenhum fato novo.** §2.1: `Grupo` passa de "2 alunos" para "1–2 alunos" — a decisão já estava em Doc 2 §2.4.1, na ERRATA §3 e §4, e no §2.4 e no changelog v1.1 deste próprio documento; só o diagrama não havia acompanhado. §4 M2: "registro diário por grupo" passa a "por aluno", conforme a unidade declarada em Doc 6 §1.1 e a movimentação registrada na ERRATA §2.2, já refletida no §2.2 daqui. §4 M5: "pesos 50/30/20" passa a "pesos configuráveis por curso", conforme a nota cross-doc de Doc 6 §13 endereçada a este documento; "peso dobrado do obstáculo central" passa a "peso do obstáculo via campo `peso`", conforme ERRATA §2.3 e Doc 6 §3.1, alinhando-se ao §2.4 daqui; "reflexão do Python" passa a "reflexão da linguagem espelho", tradução do termo do curso (Doc 6 §7) para o vocabulário genérico exigido pela §1 |
| 1.1 | Correções após auditoria cruzada. Dois mecanismos inventados removidos: "obstáculo central" vira campo `peso`, "modo copiloto" vira estado de `Aluno`. `Repositorio`, `RegistroDiario` e `ConfirmacaoDePush` movidos de `Grupo` para `Aluno`, conforme a unidade de avaliação declarada no Doc 6 §1.1. `Grupo` passa a aceitar 1 ou 2 alunos. Constantes "18 temas" e "9 em 11" substituídas por configuração. Entidades adicionadas para defesa oral, material de referência com liberação temporizada, escopos de emergência e atribuição de extensão |
| 1.0 | Documento criado. Modelo de dados generalizado — nenhuma entidade menciona POO, C# ou paredes. Milestones alinhados aos prazos do cronograma em vez de áreas de feature. Backlog de 19 issues derivado da spec, com critérios de aceite em forma de nome de teste |
