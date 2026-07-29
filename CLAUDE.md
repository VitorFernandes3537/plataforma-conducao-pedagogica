# PCP — Plataforma de Condução Pedagógica

Instruções permanentes para o Claude Code neste repositório.

---

## 1. Regra de propriedade — leia antes de qualquer edição

Este repositório tem **duas fontes com donos diferentes**.

| Caminho | Dono | Você pode |
|---|---|---|
| `docs/**` | O designer do curso, via sessão Cowork | **Somente leitura.** Nunca criar, editar, mover ou apagar |
| todo o resto | Você | Escrever à vontade |

`docs/` é a especificação. Ela é mantida fora deste repositório e sincronizada para cá como distribuição somente-leitura. Uma edição sua em `docs/` seria sobrescrita na próxima sincronização e, pior, criaria uma regra que existe só no código — o que a própria spec define como **desvio, não decisão**.

**Se você concluir que um documento em `docs/` está errado, incompleto ou contraditório: pare, não edite, e me diga qual arquivo, qual trecho e por quê.** Eu levo a questão para a sessão que é dona dos documentos, a mudança é feita lá com versionamento e changelog, e volta para cá sincronizada.

---

## 2. Como navegar a spec sem ler tudo

Ler os oito documentos por reflexo é desperdício. A ordem é:

1. `docs/INDICE.md` — mapa SSOT: diz em qual documento cada fato mora
2. `docs/doc-7-spec-plataforma.md` — modelo de dados, milestones, critérios de aceite
3. `docs/BACKLOG.md` — as 25 issues
4. `docs/ERRATA.md` — o que a última auditoria mudou e não se rediscute
5. Docs 1 a 6 — só quando o mapa SSOT apontar para eles

---

## 3. As três regras invioláveis

### 3.1 A spec não inventa fato

Toda regra de comportamento aponta para um ID SSOT dos Docs 1 a 6. Se você precisar de uma regra que não existe em documento nenhum — **pare e pergunte**. Não decida no terminal. Decisão tomada no terminal e não registrada na spec deixa de existir na semana seguinte.

### 3.2 O vocabulário do modelo é genérico

A plataforma não é específica de um curso. Nenhuma entidade, coluna, rota, componente ou nome de teste pode mencionar POO, C#, parede, dupla ou biblioteca.

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

### 3.3 Nenhuma quantidade é constante

Número de temas, tamanho de grupo, limiar de adiantamento, pesos de eixo, quantidade de perguntas do formulário, número de dias — **tudo é configuração por curso**. Um literal numérico com significado pedagógico no código é bug.

---

## 4. Processo

- **SDD:** a spec gera o backlog. O backlog gera as issues. A issue referencia o comportamento, nunca o redefine
- **TDD:** os critérios de aceite do `BACKLOG.md` **são** os nomes dos testes. Escreva o teste com o nome dado, veja falhar, implemente
- **Milestones são prazos de calendário**, não áreas de feature. Construa na ordem M0 → M5
- Toda issue carrega o ID SSOT no corpo, para que uma mudança de regra seja rastreável por busca

---

## 5. Stack

| Decisão | Valor |
|---|---|
| Framework | Next.js, App Router |
| Linguagem | TypeScript, modo estrito |
| Banco | PostgreSQL gerenciado |
| Hospedagem | PaaS gerenciada, deploy por push na branch principal |

Autorizado por `docs/doc-7-spec-plataforma.md` §0.2, que delega stack, arquitetura de pastas e design visual ao desenvolvedor. Essas decisões **não** alteram nenhum documento.

O resto — ORM, biblioteca de UI, estrutura de pastas, estratégia de autenticação — é seu.

---

## 6. O que a plataforma não faz

Está em `docs/doc-7-spec-plataforma.md` §6, e vale repetir porque é onde o escopo mais tende a inflar:

- Não hospeda código de aluno — isso é GitHub
- Não corrige código automaticamente
- Não detecta uso de IA
- Não substitui o mural físico — espelha
- Não gera conteúdo pedagógico
- Não tem app móvel nativo
