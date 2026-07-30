# ADR 0005 — A unidade de superação é escolha do instrutor, não fato da plataforma

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-30 |
| **Contexto** | Issue 14 — painel do instrutor e limiar de adiantamento |
| **Autorizada por** | Decisão do dono do repositório, 2026-07-30 · `docs/doc-7-spec-plataforma.md` §0.2 |
| **Relacionada** | ADR 0004 (a escala também é dado) |

---

## 1. O impasse

A issue 14 pede um painel que responda: *quantos grupos superaram o obstáculo de hoje?* Dois
documentos-dono respondem de formas que não se encaixam.

**Doc 3**, nota cross-doc endereçada ao Doc 7:

> Checklist de superação por parede, **por dupla**, com os critérios binários desta doc

**Doc 6 §2**, em destaque:

> Superado = nível ≥ 1. Esta é a definição usada pelo painel de superação e pelo limiar de
> adiantamento.

E o nível é lançado **por aluno** (Doc 6 §1.1). Falta a regra que transforma resultados
individuais num veredito de grupo: quando um integrante superou e o outro não, o grupo conta
para o limiar do Doc 4 §5.2?

A `ERRATA.md` §2.4 resolveu o que é "superado" e não tocou nisso.

## 2. Por que não se resolve escolhendo um lado

O CLAUDE.md §2.2 proíbe: *"Dois documentos-dono discordam entre si. Nunca escolha um
vencedor."* Mas há uma razão melhor que a regra, e ela vem da sala de aula.

Aluno falta. Um integrante se compromete menos que o outro. Um par produz junto e outro par
divide o trabalho pela metade. **Qual desses fatos deve contar como "o grupo superou" é uma
escolha pedagógica**, não uma propriedade do software — e ela muda com o objetivo do módulo,
não com o método.

Escolher `todos os integrantes` obrigaria todo curso futuro a travar a turma inteira por um
aluno atrasado. Escolher `qualquer integrante` obrigaria todo curso futuro a deixar alguém
para trás em silêncio. As duas são defensáveis, e nenhuma é da plataforma.

## 3. A decisão

**A unidade sobre a qual a superação é aferida é configuração do curso**, e a plataforma não
tem preferência.

| Coluna de `cursos` | Conteúdo |
|---|---|
| `unidadeDeSuperacao` | `aluno` ou `grupo` — sobre o que o limiar é calculado |
| `criterioDeSuperacaoDoGrupo` | Só quando a unidade é `grupo`: `todos_os_integrantes` ou `qualquer_integrante` |
| `limiarDeAdiantamento` | Proporção, não número absoluto (Doc 4 §5.2) |

Um CHECK amarra as duas primeiras: o critério de grupo existe se e somente se a unidade é
`grupo`. Sem isso haveria curso com política de grupo e aferição por aluno, um estado que
nenhuma tela sabe desenhar.

**Para o curso descrito pelos Docs 1 a 6, a unidade é `aluno`.** O dono do repositório
declarou em 2026-07-30: *"mesmo que os alunos estejam em duplas, eles ainda são avaliados
individualmente"*. Isso é coerente com o Doc 6 §1.1, que já declara o Eixo 1 e o Eixo 3 com
unidade de aluno.

Com a unidade em `aluno`, **a regra de agregação simplesmente não existe** — o limiar conta
alunos, e a pergunta que travava a issue deixa de ser feita. Ela volta a existir apenas para
o curso que escolher `grupo`, e aí é o curso que responde.

## 4. O que isso resolve, e o que não resolve

**Resolve:** a issue 14 destrava sem que ninguém escolha vencedor entre Doc 3 e Doc 6.

**Não resolve, e continua sendo do dono do documento:** os dois documentos seguem
discordando entre si sobre qual é a unidade do checklist. A plataforma agora atende os dois,
mas a série ainda precisa dizer qual é a do curso dela — hoje isso está numa decisão de
sessão e numa linha de seed, não num documento-dono.

## 5. Consequência para a regra 4.3 do CLAUDE.md

A regra diz que nenhuma **quantidade** com significado pedagógico é constante. Esta ADR
estende o mesmo princípio a **política**: um método de agregação embutido em código é tão
constante quanto um número embutido, e mais difícil de perceber, porque não parece um
literal.

O teste-guarda desta issue afirma isso por comportamento — o mesmo conjunto de avaliações
produz vereditos diferentes quando só a configuração muda.

## 6. Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Fixar `todos os integrantes` | Defensável para este curso, mas trava a turma por um aluno em todo curso futuro. E seria escolher vencedor entre dois documentos-dono |
| Fixar `qualquer integrante` | Deixaria alguém para trás em silêncio, que é o oposto do que o limiar existe para impedir |
| Proporção de integrantes dentro do grupo | Com grupos de 1 ou 2 pessoas, "maioria" colapsa numa das duas opções acima. Seria um botão que não gira |
| Parar e esperar o dono decidir | Foi a posição anterior, e estava errada: a pergunta não tem resposta única porque depende do objetivo do módulo. Esperar adiaria a issue por algo que nunca ia chegar como fato |
| Política por dia, e não por curso | Nenhum documento sugere que a política mude no meio do curso, e um limiar que muda de regra entre o D5 e o D6 tornaria a série de dados incomparável |
