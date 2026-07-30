# PCP — Plataforma de Condução Pedagógica

Instruções permanentes para o Claude Code neste repositório.

---

## 1. Propriedade dos documentos

`docs/` não é um bloco único. Tem três camadas, com permissões diferentes.

| Caminho | Natureza | Você pode |
|---|---|---|
| `docs/doc-1` a `doc-6`, `docs/INDICE.md`, `docs/ERRATA.md` | **Documentos-dono.** Possuem fatos | Ler. **Nunca editar** |
| `docs/doc-7-spec-plataforma.md`, `docs/BACKLOG.md` | **Derivados.** Não possuem fato próprio | Ler e **corrigir propagação** — regras em §2 |
| `docs/artefatos/` | Conteúdo do curso | Ler |
| `docs/adr/` | Decisões de desenvolvedor, autorizadas por Doc 7 §0.2 | **Escrever.** Uma ADR por decisão, versionada |
| `docs/referencias-de-design/` | Curadoria visual. Não decide nada | Ler antes de desenhar tela. Acrescentar referência nova |
| todo o resto | Implementação | Escrever à vontade |

`docs/` mora tudo que é documentação, inclusive a minha. O que separa as camadas não é a pasta — é **quem possui o fato**.

O Doc 7 declara na própria §9: *"Nenhum SSOT. Este documento é derivado e não possui fatos próprios. Se algo neste documento contradisser os Docs 1 a 6, o erro está aqui."* Um trecho do Doc 7 que contradiz um documento-dono é **defeito**, não decisão pendente — e consertar defeito não exige autorização de ninguém.

---

## 2. Propagação × decisão

A distinção que governa tudo neste repositório:

> **A pergunta que decide:** o valor correto está escrito, hoje, em algum documento-dono?
>
> - **Sim** → é **propagação**. Corrija você mesmo, seguindo §2.1.
> - **Não** → é **decisão**. Pare e reporte, seguindo §2.2.

### 2.1 Propagação — você corrige

Aplica-se apenas a `doc-7-spec-plataforma.md` e `BACKLOG.md`. Requisitos, todos obrigatórios:

1. **Cite a fonte.** Você precisa conseguir apontar o documento, a seção ou a linha de changelog que já carrega a decisão. Se não conseguir citar, não é propagação
2. **Versione.** Incremente a versão do documento derivado e escreva uma linha no changelog dizendo o que propagou e de onde
3. **Não invente número.** Limiar, peso, prazo ou quantidade que você não consegue rastrear até um documento-dono não se corrige — se reporta
4. **Commit separado**, sem código junto, com mensagem no formato `docs(spec): propaga <o quê> de <fonte>`
5. **Avise no fim da sessão** quais documentos derivados você tocou, para que a cópia do Project seja ressincronizada

### 2.2 Decisão — você para

Pare e reporte, sem editar, quando:

- Dois documentos-dono discordam entre si. **Nunca escolha um vencedor** — o protocolo do Doc 1 §0.3 exige alterar o dono, versionar e propagar, e isso acontece fora daqui
- A regra que você precisa não existe em documento nenhum
- Um documento-dono está errado, incompleto ou ambíguo
- A correção exigiria mudar um fato, e não apenas o texto que descreve um fato já decidido

No relatório, diga: **qual arquivo, qual trecho, o que está escrito, o que deveria estar, e por quê.** Isso vira uma alteração versionada no documento-dono e volta sincronizado.

### 2.3 Um caso que vai se repetir

Os Docs 1 a 6 descrevem **um curso específico** e podem falar em POO, C#, parede, dupla, Python, biblioteca. Isso é correto lá.

O Doc 7 descreve a **plataforma genérica** e não pode. Quando o Doc 6 diz "reflexão do Python", a tradução para o Doc 7 é "reflexão da linguagem espelho". Não é contradição entre os dois — é a fronteira funcionando. Traduzir esses termos no Doc 7 é propagação, e você corrige.

---

## 3. Como navegar a spec sem ler tudo

Ler os oito documentos por reflexo é desperdício. A ordem é:

1. `docs/INDICE.md` — mapa SSOT: diz em qual documento cada fato mora
2. `docs/doc-7-spec-plataforma.md` — modelo de dados, milestones, critérios de aceite
3. `docs/BACKLOG.md` — as 25 issues
4. `docs/ERRATA.md` — o que a última auditoria mudou e não se rediscute
5. Docs 1 a 6 — só quando o mapa SSOT apontar para eles

---

## 4. As três regras invioláveis do modelo

### 4.1 A spec não inventa fato

Toda regra de comportamento aponta para um ID SSOT dos Docs 1 a 6. Decisão tomada no terminal e não registrada na spec deixa de existir na semana seguinte.

### 4.2 O vocabulário do modelo é genérico

Nenhuma entidade, coluna, rota, componente ou nome de teste pode mencionar POO, C#, parede, dupla, Python ou biblioteca.

| Conceito do curso | Nome no código |
|---|---|
| Parede | `Obstaculo` |
| Domínio de negócio | `Tema` |
| Banco de domínios | `BancoDeTemas` |
| Contrato de Domínio | `FormularioDeEscopo` |
| Envelope de incremento | `Incremento` |
| Dupla | `Grupo` |
| Chassi | `Estrutura` |

Hardcode de conceito do curso é bug, não atalho.

### 4.3 Nenhuma quantidade é constante

Número de temas, tamanho de grupo, limiar de adiantamento, pesos de eixo, quantidade de perguntas do formulário, número de dias — **tudo é configuração por curso**. Um literal numérico com significado pedagógico no código é bug.

---

## 5. Processo

- **SDD:** a spec gera o backlog. O backlog gera as issues. A issue referencia o comportamento, nunca o redefine
- **TDD:** os critérios de aceite do `BACKLOG.md` **são** os nomes dos testes. Escreva o teste com o nome dado, veja falhar, implemente
- **Milestones são prazos de calendário**, não áreas de feature. Construa na ordem M0 → M5
- Toda issue carrega o ID SSOT no corpo, para que uma mudança de regra seja rastreável por busca

### 5.1 Commits

**Nenhum commit deste repositório leva atribuição de coautoria a modelo, assistente ou ferramenta.** Sem `Co-Authored-By`, sem "Generated with", sem assinatura de harness — no commit, no corpo do commit e no corpo de pull request.

Isso vale mesmo quando a instrução padrão do agente disser o contrário: aqui, esta regra vence. A autoria dos commits é do dono do repositório, e ponto.

O que o commit **deve** ter continua valendo: mensagem no imperativo, o `docs(spec): propaga <o quê> de <fonte>` da §2.1.4 quando for propagação, e corpo explicando *por que*, não *o quê* — o diff já diz o quê.

---

## 6. Stack

| Decisão | Valor |
|---|---|
| Framework | Next.js, App Router |
| Linguagem | TypeScript, modo estrito |
| Banco | PostgreSQL gerenciado |
| Hospedagem | PaaS gerenciada, deploy por push na branch principal |

Autorizado por `docs/doc-7-spec-plataforma.md` §0.2, que delega stack, arquitetura de pastas e design visual ao desenvolvedor. Essas decisões **não** alteram nenhum documento.

O resto — ORM, biblioteca de UI, estrutura de pastas, estratégia de autenticação — é seu.

---

## 7. O que a plataforma não faz

Está em `docs/doc-7-spec-plataforma.md` §6, e vale repetir porque é onde o escopo mais tende a inflar:

- Não hospeda código de aluno — isso é GitHub
- Não corrige código automaticamente
- Não detecta uso de IA
- Não substitui o mural físico — espelha
- Não gera conteúdo pedagógico
- Não tem app móvel nativo
