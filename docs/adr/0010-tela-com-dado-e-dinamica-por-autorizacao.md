# ADR 0010 — Tela com dado é dinâmica, e quem a torna dinâmica é a autorização

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-31 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega stack e arquitetura ao desenvolvedor |
| **Decide o que não estava decidido** | Nenhuma ADR falava de modo de renderização |
| **Relacionada** | ADR 0001 §3 (proxy não é solução de autorização), ADR 0002 §7 (o proxy que não roda), ADR 0006 (as telas que faltam) |
| **Não altera** | Nenhum documento da série |

---

## Contexto

`npm run build` marcava `/instrutor` como `○ (Static)`. Não era rótulo: o
`.next/server/app/instrutor.html` do build tinha o nome da turma, o UUID dela e
`dia 3 de 3` escritos dentro, lidos do banco no momento em que o build rodou.

Duas consequências, e a segunda é a que quase passou.

**A lista congela.** Turma cadastrada por seed ou script depois do deploy não
aparece até o próximo build. O ponteiro do dia também vira o do deploy — a tela
que existe para dizer em que dia cada turma está passa a dizer em que dia cada
turma estava.

**O build lê o banco de produção.** Sem `DATABASE_URL` o prerender quebra o
build; com ela, o build vira leitor de dado real. Nenhum dos dois é o que se quer
de um build.

A causa é a de sempre no App Router: a página não tocava em nenhuma API
dinâmica. Não lia `params`, não lia `searchParams` e **não chamava `auth()`** —
então o Next a resolveu uma vez e guardou. As telas irmãs eram `ƒ` por acidente
de forma, não por decisão: `/instrutor/turma/[turmaId]` porque lê `params`,
`/hoje` e `/` porque chamam `auth()`.

Faltar `auth()` não era detalhe de renderização. Era a mesma falta contada de
outro jeito: **`/instrutor` era a única tela da área do instrutor que não
perguntava quem estava lendo**, e `turmasDoInstrutor` era a única consulta de
instrutor sem `exigeInstrutor`. O modo de renderização foi o sintoma que
denunciou o buraco de autorização.

---

## Decisão

### 1. A rota fica dinâmica por chamar `auth()`, não por declaração

`export const dynamic = 'force-dynamic'` resolveria a renderização numa linha.
Foi recusado porque resolve o sintoma e deixa de pé a causa: a tela continuaria
sem saber quem a lê, e a declaração é uma anotação que ninguém relê. `auth()` é
código que faz trabalho — some junto com o motivo, se o motivo sumir.

Regra que passa a valer: **tela que lê dado de alguém chama `auth()`**. O modo de
renderização é consequência, não configuração.

### 2. A consulta recebe `instrutorId` e chama `exigeInstrutor`

`turmasDoInstrutor(db, instrutorId)`. A autorização de verdade continua no módulo
de banco, como em todas as outras consultas de instrutor.

Isso **não** é redundante com o proxy, e a razão é concreta. A sessão é JWT e o
papel é gravado no login; nos requests seguintes o token não toca no banco (ADR
0001 §3). Rebaixar alguém no banco não invalida o token que ele já tem — só o
vencimento invalida. `exigeInstrutor` lê o papel da linha, então a lista fecha na
hora. E se o proxy não rodar — o modo de falhar que a ADR 0002 §7 descreve, em
que uma rota protegida vira pública em silêncio — a checagem que sobra é esta.

### 3. A listagem não filtra por dono, e isso é a regra, não uma folga

Nenhuma tabela liga instrutor a turma, e a matriz do Doc 7 §3 diz "instrutor —
tudo". O `instrutorId` não decide *quais* turmas aparecem; decide *se* aparecem.
Registrado aqui para que a ausência de filtro não seja lida como esquecimento por
quem chegar depois e "consertar" inventando uma coluna de dono que nenhum
documento pede.

---

## Consequências

**Boas**

- O build deixa de ler o banco de produção, e deixa de depender dele
- A tela passa a mostrar a turma que foi cadastrada há um minuto
- A área do instrutor fica uniforme: toda tela dela revalida a sessão por conta
  própria, sem exceção que alguém precise lembrar

**Custos aceitos**

- Uma consulta de papel por carregamento da entrada. É uma linha por `usuarioId`,
  e o preço de a autorização não morar num token que envelhece
- `/instrutor` deixa de ser servida do cache de borda. Numa tela de uma linha por
  turma, aberta por uma pessoa, o ganho que se perde é hipotético

---

## O argumento contrário

**1. `force-dynamic` é mais honesto sobre a intenção.** A rota é dinâmica porque
a lista muda, não porque alguém precisa de sessão. Amarrar renderização a
autorização faz o modo de render virar efeito colateral de uma decisão de
segurança: no dia em que uma tela precisar ser dinâmica *sem* sessão, esta regra
não a cobre, e quem só conhecer esta ADR vai procurar o `auth()` que falta em vez
da declaração que resolve.

**2. A checagem no banco compra menos do que parece.** Ela só ajuda na janela
entre rebaixar alguém e o token dele vencer, e essa janela existe numa turma com
um instrutor presente na sala. Pagar uma consulta por carregamento por um cenário
que talvez nunca aconteça é caro se a tela crescer para muitas turmas.

**3. Uma tela que não filtra por dono é uma tela esperando por uma regra.** Se um
dia dois instrutores conduzirem turmas diferentes, "instrutor — tudo" deixa de
ser leitura suficiente do Doc 7 §3, e a decisão 3 desta ADR passa a ser o que
segura o erro no lugar. O sinal de que isso aconteceu é alguém pedindo para
esconder a turma do colega — e a correção é ler o Doc 7 de novo, não acrescentar
um filtro em silêncio.
