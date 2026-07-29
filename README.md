# PCP — Plataforma de Condução Pedagógica

Plataforma de condução de módulos de ensino desenhados por método baseado em problemas.

Ela **não é específica de um curso**. O vocabulário do modelo é genérico — `Obstaculo`, `Tema`, `Grupo`, `FormularioDeEscopo`, `Incremento`, `Estrutura` — e cada curso é uma instância. A primeira é um módulo de POO com C#/.NET, 60h em 15 dias.

## O que ela faz

Conduz o ciclo completo de um módulo: cadastro de turma e grupos, banco de temas, formulário de escopo com validação automática e fila de aprovação, captura diária de avaliação, mural de dúvidas, rodadas de crítica entre pares, geração de incrementos com liberação temporizada e agregação final da rubrica.

## O que ela não faz

Não hospeda código de aluno, não corrige código, não detecta uso de IA, não substitui o mural físico, não gera conteúdo pedagógico e não tem app móvel nativo.

## Stack

Next.js (App Router) · TypeScript · PostgreSQL · deploy em PaaS gerenciada.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `docs/` | A especificação. **Somente leitura** — ver `CLAUDE.md` |
| `docs/INDICE.md` | Mapa SSOT: onde cada fato mora |
| `docs/doc-7-spec-plataforma.md` | Modelo de dados, milestones, critérios de aceite |
| `docs/BACKLOG.md` | As 25 issues |
| o resto | Implementação |

## Como começar

Leia `CLAUDE.md`. Ele contém as regras de propriedade, as três regras invioláveis do modelo e o processo de trabalho.
