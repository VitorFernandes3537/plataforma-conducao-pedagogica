# ADR 0004 — A escala de avaliação é dado, não CHECK

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-30 |
| **Contexto** | Issue 11 — `RegistroDiario`: avaliação, log e push |
| **Autorizada por** | `docs/doc-7-spec-plataforma.md` §0.2 (stack e arquitetura delegadas ao desenvolvedor) |
| **Afeta** | ADR 0001 §2 — ver §6 |

---

## 1. A pergunta

O Doc 7 §2.4 lista, como regra de integridade que a plataforma garante:

> `AvaliacaoObstaculo` só aceita 0–3 — origem `D6-ESCALA`

Nove linhas abaixo, na **mesma tabela**:

> Nenhum limiar ou quantidade é constante — todos configuráveis por curso — origem Doc 7 §1

Um `CHECK (nivel between 0 and 3)` cumpre a primeira linha e viola a segunda. As duas
apontam para donos diferentes — a primeira para o Doc 6, a segunda para o próprio Doc 7 — e
o CLAUDE.md §4.3 repete a segunda como lei do repositório: "um literal numérico com
significado pedagógico no código é bug".

## 2. O que os documentos-dono dizem

O Doc 6 §2 declara quatro níveis **com descritor**:

| Nível | Descritor |
|---|---|
| 0 | Não superou o critério do obstáculo |
| 1 | Superou com apoio direto do instrutor |
| 2 | Superou de forma autônoma |
| 3 | Superou e generalizou |

E declara, em destaque: **"Superado = nível ≥ 1"**, usado pelo painel de superação e pelo
limiar de adiantamento.

O `D6-ESCALA` é, literalmente, "a escala 0–3 **e os descritores**". A decisão `D6-03`
registra "Escala 0–3" como resolvida.

Contra a leitura de que a escala é configurável, há um argumento real: a nota cross-doc do
Doc 6 §13 entrega os **pesos** ao Doc 7 explicitamente como "configuráveis", e não diz nada
parecido sobre a escala. A assimetria é deliberada em um documento que revisa suas próprias
notas cross-doc.

## 3. A decisão

**A escala é uma tabela por curso: `niveis_de_avaliacao (cursoId, valor, descritor,
contaComoSuperacao)`.** A avaliação referencia um nível por chave estrangeira. Não existe
`CHECK` de faixa, e não existe comparação com número em `src/`.

Para o curso descrito pelos Docs 1 a 6, o seed cadastra exatamente quatro níveis — 0 a 3,
com os descritores do Doc 6 §2. A afirmação "só aceita 0–3" continua verdadeira, e agora é o
banco que a garante: um nível fora da escala do curso não é referenciável.

`contaComoSuperacao` substitui o `>= 1`. "Superado = nível ≥ 1" deixa de ser uma comparação
escrita em três consumidores diferentes e passa a ser uma coluna que os três leem.

Três gatilhos garantem coerência de curso: nada em DDL impede referenciar o nível ou o
obstáculo de outro curso, e a chave estrangeira garante que o nível **existe**, não que é o
**certo**.

## 4. Por que assim, e não com CHECK

**Uma linha derivada não vence uma lei do repositório.** O Doc 7 é declaradamente derivado e
não possui fatos próprios. A linha "só aceita 0–3" aponta para o Doc 6; a linha "nada é
constante" é do próprio Doc 7 §1 e está repetida no CLAUDE.md §4.3, que é instrução direta
do dono do repositório. Entre as duas, a segunda é a que tem autoridade sobre código.

**Os descritores são conteúdo de curso.** Esta é a razão mais forte, e ela não depende da
leitura sobre a faixa. `D6-ESCALA` é "a escala **e os descritores**", e frases como "superou
com apoio direto do instrutor" são vocabulário pedagógico. Escrevê-las em `src/` violaria o
CLAUDE.md §4.2 tão claramente quanto escrever "parede" numa coluna. E se os descritores são
dado, a tabela que os guarda já existe — pôr a faixa em CHECK e os rótulos em dado
espalharia o mesmo fato por dois lugares, com dois donos.

**O `>= 1` tem três consumidores.** Registro diário, painel de superação (issue 14) e limiar
de adiantamento (Doc 4 §5.2) leem a mesma definição. Como comparação em código, ela seria
escrita três vezes; como coluna, uma. E a definição do Doc 6 §2 não diz "maior que zero" —
diz que zero é o único nível que não conta, o que é uma afirmação sobre *níveis*, não sobre
aritmética.

**O custo é conhecido.** Esta modelagem permite um curso configurar uma escala de cinco
níveis. Se a escala for forma do instrumento, e não configuração, a plataforma passa a
aceitar algo que o método não previu. O CLAUDE.md §2.3 é a resposta: os Docs 1 a 6 descrevem
**um curso**, o Doc 7 descreve a **plataforma genérica**, e a tradução entre os dois é a
fronteira funcionando. A plataforma não deve *recomendar* outra escala — e não recomenda,
porque a única escala que existe é a que o curso cadastra.

## 5. Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| `CHECK (nivel between 0 and 3)` | Literal pedagógico no schema e no snapshot do drizzle-kit. E deixaria os descritores sem lugar, ou em código |
| Faixa em constante TS interpolada no CHECK | Cosmético: o número continua no SQL emitido e no arquivo de migration |
| `enum` de quatro valores | Mesma objeção, e pior de evoluir: acrescentar nível vira migration de tipo |
| Coluna booleana `superou` ao lado do nível | Dois donos do mesmo fato. Um booleano que discorda do nível é estado impossível que nenhuma tela sabe desenhar |
| `nivel integer` com gatilho de pertinência | Toda a garantia viraria procedural. A chave estrangeira é declarativa e não pode ser esquecida |

## 6. Consequência para a ADR 0001

A ADR 0001 §2 cita "`AvaliacaoObstaculo` só aceita 0–3" como exemplo de CHECK, e o usa como
uma das razões para escolher Drizzle em vez de Prisma. **Essa razão específica não descreve
mais o código.**

A escolha do Drizzle continua correta, e por motivos que seguem valendo e agora têm mais
provas do que na época: índice único parcial (`tema_unico_por_turma`), CHECK de coerência de
estado (`estado_coerente_com_submissao`, `devolucao_exige_motivo`) e gatilhos plpgsql
(tamanho de grupo, escopo fechado, poda, coerência de curso). Apenas o exemplo escolhido
para ilustrar envelheceu.

## 7. O que fica reportado ao dono do documento

Não é decisão de desenvolvedor, e por isso vai como relatório em vez de edição:

1. **A escala é forma do instrumento ou configuração de curso?** O Doc 6 §13 entrega os
   pesos ao Doc 7 como configuráveis e é silencioso sobre a escala. Se a intenção é que a
   escala seja fixa, o Doc 6 precisa dizer, e esta ADR muda.
2. **`contaComoSuperacao` não tem monotonicidade garantida.** Nada hoje impede cadastrar um
   curso em que o nível 1 conta como superação e o 2 não. Se "superado" tem de ser um
   prefixo superior da escala, é fato de documento-dono.
3. **`Obstaculo` não tem issue dona.** Nenhuma das 25 issues cria a entidade; a issue 11 a
   criou porque precisava dela. Vale registrar onde ela nasce.
4. **A relação Dia ↔ Obstáculo não está modelada.** O Doc 4 mapeia obstáculo a dia no corpo
   do cronograma e o Doc 3 §2 chama o dia previsto de "apenas referência". A issue 14 vai
   precisar de "o obstáculo de hoje", e a fonte dessa relação precisa de dono.
