# KICKOFF — primeira sessão do Claude Code na PCP

**Plataforma de Condução Pedagógica (PCP).**

Cole o conteúdo da seção 3 como primeira mensagem da sessão. As seções 1 e 2 são contexto para você, humano.

---

## 1. Decisões de stack — travadas

Autorizadas por **Doc 7 §0.2**, que delega stack, arquitetura e design ao desenvolvedor. Não são fatos pedagógicos e por isso **não alteram nenhum documento** nem exigem versionamento.

| Decisão | Valor |
|---|---|
| Framework | Next.js, App Router |
| Linguagem | TypeScript, modo estrito |
| Banco | PostgreSQL gerenciado |
| Hospedagem | PaaS gerenciada, deploy por push na branch principal |
| Testes | Os critérios de aceite do backlog **são** os nomes dos testes |

Tudo o mais — ORM, biblioteca de UI, estrutura de pastas, estratégia de autenticação — fica para a primeira sessão decidir.

## 2. O que o Claude Code precisa ter em mãos

| Arquivo | Papel |
|---|---|
| `BACKLOG.md` | As 25 issues, com corpo completo |
| `doc-7-spec-plataforma.md` | A spec. Modelo de dados, milestones, critérios |
| `INDICE.md` | Mapa SSOT — onde cada fato mora |
| `ERRATA.md` | O que mudou na última auditoria e não se rediscute |
| Docs 1 a 6 | Consultados sob demanda, pelo mapa SSOT |

Todos vivem no Project deste trabalho, em `curso-poo-csharp/`, e são espelhados em `docs/` dentro do repositório da PCP — onde o Claude Code os lê.

---

## 3. Primeira mensagem da sessão

```
Este repositório é a Plataforma de Condução Pedagógica (PCP).

A spec completa está em docs/ — leia INDICE.md primeiro, depois
doc-7-spec-plataforma.md. O backlog está em docs/BACKLOG.md.

Sua primeira tarefa, antes de escrever qualquer código:

1. Crie os 6 milestones no GitHub, com estes títulos exatos:
   M0 — antes do D1
   M1 — antes do D3
   M2 — antes do D4
   M3 — antes do D6
   M4 — antes do D12
   M5 — antes do D15

2. Crie as labels: infra, modelo, validacao, instrutor, aluno,
   avaliacao, publico

3. Crie as 25 issues a partir de docs/BACKLOG.md, uma por seção de
   título "# ". Use o título, o milestone e as labels declarados no
   cabeçalho de cada seção, e o restante da seção como corpo, sem
   reescrever nada.

4. Confirme o total: 25 issues distribuídas em 6 milestones.

Depois disso, pare e me mostre o resultado antes de começar a
implementar.

Três regras que valem para toda a sessão e para todas as seguintes:

- A spec não inventa fato. Toda regra de comportamento aponta para um
  ID SSOT dos Docs 1 a 6. Se você precisar de uma regra que não existe
  em documento nenhum, PARE e me pergunte — não decida no terminal.

- Nada no modelo pode mencionar POO, C#, parede, dupla ou biblioteca.
  O vocabulário é genérico: Obstaculo, Tema, Grupo, FormularioDeEscopo,
  Incremento, Estrutura. Hardcode de conceito do curso é bug.

- Nenhuma quantidade é constante. Número de temas, tamanho de grupo,
  limiar de adiantamento, pesos de eixo, quantidade de perguntas do
  formulário — tudo é configuração por curso.
```

---

## 4. Ordem de construção

Os milestones são **prazos do calendário do curso**, não áreas de feature. Construir fora dessa ordem produz software pronto tarde demais para servir.

M0 → M1 → M2 → M3 → M4 → M5, nesta ordem.

Dentro do M0, as duas issues de infraestrutura vêm primeiro; o resto é livre.

## 5. As três dependências que não podem falhar

| Dependência | Issue | Consequência |
|---|---|---|
| Validação automática do formulário | 7 | Impossível aprovar 11 formulários nos 95 min do D3 |
| Captura contínua | 11 | A avaliação vira um fim de semana corrigindo 22 repositórios |
| Slides de abertura | 4 | O primeiro dia não tem material |

O resto degrada com elegância: o mural volta a ser só físico, a crítica volta a ser papel, o incremento volta a ser manual em ~2h.
