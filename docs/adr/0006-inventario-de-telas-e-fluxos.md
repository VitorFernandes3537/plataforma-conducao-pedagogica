# ADR 0006 — Inventário de telas e fluxos de usuário

| | |
|---|---|
| **Estado** | Aceita, em construção |
| **Data** | 2026-07-30 |
| **Contexto** | Construção das telas, depois de o backlog de modelo e regra fechar |
| **Autorizada por** | `docs/doc-7-spec-plataforma.md` §0.2 (design e arquitetura de pastas delegados ao desenvolvedor) |
| **Relacionada** | ADR 0003 (design system), ADR 0002 (identidade) |

---

## 1. De onde este inventário veio

Não de imaginação de produto. Seis leituras paralelas dos documentos-dono
extraíram **os momentos em que alguém precisa abrir a plataforma**, cada um com
o orçamento de tempo que o documento lhe dá. As telas são o agrupamento desses
momentos, e nada mais.

O orçamento é o dado que mais decide layout: uma tela que exige cinco minutos
num bloco de dois não vai ser usada, e a captura contínua desaba de volta para o
fim de semana de correção que o Doc 6 §0.3 existe para evitar.

## 2. A forma: dois centros de gravidade

O cronograma tem cinco blocos por dia, e quase todos os momentos caem em dois
lugares — o dia do instrutor e o dia do aluno. Tudo que não é diário pendura
fora.

**A densidade é deliberada** (ADR 0003 §1). Um instrutor com a turma inteira em
180 minutos não navega: ele abre uma coisa e volta para a sala. Cada aba a mais
é um momento em que ele para de olhar para os alunos.

## 3. Os momentos, por bloco do dia

Extraídos de `docs/doc-4-cronograma.md` §2 e §3, com os protocolos de
`docs/doc-5-protocolos.md`.

| Bloco | Quem | Momento | Orçamento |
|---|---|---|---|
| **Abertura** (20 min) | ambos | Mural é consultado — é a primeira tela do dia | fração dos 20 |
| Abertura | aluno | Contrato diário, as duas linhas | 2 min (Doc 5 §7) |
| Abertura | aluno | Registro de recuperação de quem faltou | 30 s (Doc 5 §3.3) |
| Abertura | instrutor | Quem está devendo reposição | não declarado |
| **Obstáculo** (40 min) | aluno | Escreve a dúvida no mural ao travar | segundos |
| Obstáculo | instrutor | Lê onde cada grupo travou, sem sugerir solução | 30 s por grupo |
| **Demonstração** (30 min) | instrutor | Risca do mural o que a demonstração resolveu | ~zero |
| **Implementação** (75 min) | aluno | Consulta o mural — degrau 2 da escada | 3 min (Doc 5 §1.1) |
| Implementação | instrutor | Lança a avaliação da turma | **não declarado** |
| Implementação | instrutor | Atribui extensão ou monitoria a quem terminou | não declarado |
| **Fechamento** (15 min) | aluno | Log do obstáculo, push, fecha o contrato | 15, com o push dentro |
| Fechamento | instrutor | Espelha o mural físico, libera material do dia | não declarado |
| Virada | instrutor | Lê quantos superaram para decidir o tempo excedente | instantâneo (Doc 4 §5.1) |

**O achado mais desconfortável:** nenhum bloco do cronograma reserva tempo para
o instrutor lançar avaliação. Ela tem de caber nos intervalos da circulação, e é
por isso que o lançamento é um clique por aluno, numa lista, sem navegação e sem
salvar em lote.

## 4. Os momentos que não são diários

| Quando | Quem | Momento | Fonte |
|---|---|---|---|
| D1 | instrutor | Conduz o material de abertura, bloco a bloco | Doc 11 §4 |
| D1 | ambos | Tour e cadastro: primeiro contato com o software | Doc 4 §3 |
| D2–D3 | aluno | Preenche o formulário de escopo | Doc 2 §4 |
| D3 | instrutor | Fila de aprovação, 4 julgamentos humanos | 3–4 min por grupo |
| D6, D13 | ambos | Rodadas de crítica, os dois sentidos | 25 min por direção |
| D4–D11 | instrutor | Produz os incrementos, fora da aula | ~10 min cada |
| D12 | aluno | Recebe o incremento liberado | Doc 6 §4.1 |
| D14, D15 | aluno | Reflexões de fechamento | Doc 6 §5.1 e §7 |
| D15 | instrutor | Defesa oral, 2 perguntas por grupo | Doc 6 §6 |
| D15 | instrutor | Fecha a agregação | Doc 6 §0.3 |
| D15 | público | Índice da coorte é compartilhado | Doc 5 §6.2 |

## 5. O inventário

### Construídas

| Rota | Papel | Momentos que serve |
|---|---|---|
| `/instrutor` | instrutor | Em que dia cada turma está |
| `/instrutor/turma/[turmaId]` | instrutor | **O dia**: régua, superação, mural, avaliação da turma |
| `/hoje` | aluno | **O dia**: obstáculo, contrato, mural, log, push, repositório |
| `/turma/[turmaId]` | público | Índice da coorte |

### A construir, em ordem de dependência

| Rota | Papel | Por que nesta ordem |
|---|---|---|
| `/escopo` | aluno | O D3 é portão duro: sem escopo aprovado ninguém escreve código |
| `/instrutor/fila` | instrutor | O outro lado do mesmo portão |
| `/instrutor/apresentacao/[diaId]` | instrutor | O D1 acontece antes de tudo, mas não trava nada |
| `/critica/[rodadaId]` | aluno | D6 |
| `/instrutor/grupo/[grupoId]` | instrutor | Ficha do grupo: escopo, poda, incremento, defesa |
| `/incremento` | aluno | D12 |
| `/percurso` | aluno | Reflexões e nota, quando liberada |
| `/instrutor/agregacao` | instrutor | D15, o último |

As consultas de todas elas **já existem** em `src/db/`. Nenhuma tela desta lista
precisa de regra nova — só de composição.

## 6. Decisões que a construção forçou

**A turma tem um dia corrente, e o instrutor avança** (`turmas.diaCorrenteId`).
Nenhuma consulta sabia que dia era hoje: todas recebiam `ordemDoDiaCorrente` por
parâmetro, e `dias` guarda ordem, não data. Data de calendário seria invenção —
nenhum documento diz quando o curso roda. O ponteiro é da turma e não do curso,
para duas turmas do mesmo curso andarem em passos diferentes. Avançar é sempre
para o próximo, nunca um salto, e não volta.

Isso é a sincronia do Doc 4 §5.2 virando mecanismo.

**A régua não mostra o "agora".** A plataforma sabe a forma do dia, não o minuto
em que a sala está. `blocoCorrente` vai nulo, e fingir a posição seria mostrar
uma marca inventada.

**O obstáculo ganhou `criteriosDeSuperacao` e `escopoFora`.** O Doc 3 §2 declara
os dois como campos que vão para a plataforma, e o componente de desafio já os
pedia desde a fase de design. Faltavam no modelo, não na tela.

**`lancamentoDoDia` passou a devolver o nome.** A tela é uma lista de pessoas, e
eu estava truncando uuid na interface — o tipo de defeito que passa no teste e
falha na sala.

**Existe caminho para o primeiro instrutor** (`npm run instrutor -- <login>`). O
`signIn` só admite quem já está em `usuarios`, e nada criava a primeira linha: a
pessoa real batia em acesso negado sem saída. É script de terminal e não tela
porque quem executa precisa de acesso ao banco — uma tela que criasse instrutor
seria porta aberta.

## 7. Regras de construção das telas

1. **Server Component por padrão.** Cliente só onde há interação.
2. **Toda server action revalida a sessão por conta própria.** O proxy protege a
   rota, mas action é endpoint: quem souber o identificador a chama direto
   (ADR 0001 §3). A autorização de verdade continua dentro do módulo de banco.
3. **O autor nunca vem do cliente.** Vem da sessão. Se viesse do formulário,
   qualquer pessoa escreveria o contrato de qualquer outra.
4. **Filtro de visibilidade é de consulta, não de tela.** Incremento não
   liberado, nota antes da agregação e bloco oculto não podem chegar ao
   navegador — esconder na interface é esconder de quem não abre o inspetor.
5. **Ausência é declarada**, com a frase que diz quando aparece e por quê
   (ADR 0003 §8). Card vazio parece defeito; ausência declarada parece regra.
6. **A pergunta do obstáculo é o herói** da tela do aluno. O ordinal é endereço,
   nunca título (ADR 0003 §5 · `D3-07`).

## 8. O que este inventário não decide

- **Modo apresentação** do material do D1: o Doc 11 §11 pede comparador de
  quatro lentes, revelação por camadas e "nenhum slide avança sozinho". Isso é
  desenho de interação e ainda não foi feito.
- **Matrícula em lote pela tela.** `matriculaEmLote` existe em `src/db`, mas
  nenhuma tela a usa — hoje a turma entra por seed ou script.
- **Responsivo.** Desktop-first por decisão do dono do curso; a tela do aluno
  provavelmente será aberta em notebook na sala.
