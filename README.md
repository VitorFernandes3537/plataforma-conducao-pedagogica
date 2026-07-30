# PCP — Plataforma de Condução Pedagógica

Plataforma de condução de módulos de ensino desenhados sob **aprendizagem baseada em projetos** (PBL).

São duas camadas, e confundi-las é o erro mais fácil de cometer aqui:

- **Metodologia pedagógica** — PBL, aprendizagem baseada em projetos. É o que a plataforma serve.
- **Método de execução** — como se conduz um módulo dentro dessa metodologia, dia a dia: os obstáculos, o contrato de escopo, a captura contínua, a rubrica. Isso é desenhado por quem constrói o curso, com aderência máxima ao PBL, e mora nos documentos da série em `docs/`.

A plataforma implementa as estruturas do método. Ela **não é específica de uma disciplina, linguagem ou conteúdo** — o vocabulário do modelo é genérico (`Obstaculo`, `Tema`, `Grupo`, `FormularioDeEscopo`, `Incremento`, `Estrutura`) e cada curso é uma instância. O primeiro módulo a rodar nela é o primeiro caso de uso, não a identidade do produto: nada dele entra no modelo.

## O que ela faz

Conduz o ciclo completo de um módulo: cadastro de turma e grupos, banco de temas, formulário de escopo com validação automática e fila de aprovação, captura diária de avaliação, mural de dúvidas, rodadas de crítica entre pares, geração de incrementos com liberação temporizada e agregação final da rubrica.

## O que ela não faz

Não hospeda código de aluno, não corrige código, não detecta uso de IA, não substitui o mural físico, não gera conteúdo pedagógico e não tem app móvel nativo.

## Stack

Next.js (App Router) · TypeScript · PostgreSQL · deploy em PaaS gerenciada.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `docs/doc-1` a `doc-6`, `docs/ERRATA.md` | Documentos-dono: o método de execução. **Nunca editar aqui** |
| `docs/INDICE.md` | Documento-dono. Mapa SSOT: onde cada fato mora |
| `docs/doc-7-spec-plataforma.md` | Derivado. Modelo de dados, milestones, critérios de aceite |
| `docs/BACKLOG.md` | Derivado. As 25 issues |
| `docs/adr/` | Decisões de desenvolvedor, autorizadas por Doc 7 §0.2 |
| `docs/referencias-de-design/` | Curadoria visual. Ler antes de desenhar tela |
| o resto | Implementação |

## Como começar

Leia `CLAUDE.md`. Ele contém as regras de propriedade, as três regras invioláveis do modelo e o processo de trabalho.
