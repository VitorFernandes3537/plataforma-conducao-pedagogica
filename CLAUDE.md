# PCP — Plataforma de Condução Pedagógica

Instruções permanentes para o Claude Code neste repositório.

> **Onde estamos.** O modelo, as regras e as consultas estão prontos e testados —
> 25 issues fechadas, 148 testes, integridade no banco e não na aplicação. A fase
> agora é **construir as telas**, e isso é trabalho de design e de composição, não
> de modelagem.
>
> Este documento foi enxugado para essa fase. O que segurava a construção do
> modelo saiu; o que impede a plataforma de inflar e de virar específica de um
> curso ficou, e ficou inteiro.

---

## 1. Comece por aqui

| Antes de | Leia |
|---|---|
| escrever qualquer tela | `docs/adr/0006-inventario-de-telas-e-fluxos.md` |
| decidir layout, cor, tipografia | `docs/adr/0003-rumo-visual.md` |
| inventar uma consulta | `grep -rn "^export async function" src/db/` |
| mexer em regra de avaliação | ADR 0004 e 0005 |

A ADR 0006 tem os momentos extraídos dos documentos com o orçamento de tempo de
cada um, o inventário de telas em ordem de dependência, e o que já foi
construído. **As consultas de todas as telas que faltam já existem.** Nenhuma
precisa de regra nova — só de composição. Reinventar consulta é o erro mais
provável de quem chega agora.

---

## 2. Você decide

Esta seção existe porque a fase mudou. Design e interação **são seus**, e não
precisam de aprovação.

Decida e siga, dizendo o que decidiu e por quê:

- layout, hierarquia, espaçamento, densidade
- o que cabe numa tela e o que vira outra
- copy de interface, rótulo, mensagem de erro, texto de estado vazio
- componente novo, ou refatorar um existente
- estrutura de pastas, nome de rota, forma de server action
- consulta nova quando a existente não serve — desde que não invente regra

Pergunte só quando duas leituras levariam a trabalhos materialmente diferentes e
você não tem como escolher pelos documentos. Uma pergunta por sessão é muito;
zero é o normal.

**Não peça permissão para o que o git desfaz.** Commit, migration aditiva,
componente novo, tela nova — faça.

---

## 3. As três regras que continuam duras

Estas não são processo. São o que faz a plataforma servir a qualquer curso, e
elas já pegaram várias vezes nesta fase.

### 3.1 Vocabulário genérico

Nenhuma entidade, coluna, rota, componente, rótulo de interface ou nome de teste
menciona POO, C#, parede, dupla, Python ou biblioteca.

| Conceito do curso | Nome aqui |
|---|---|
| Parede | `Obstaculo` |
| Dupla | `Grupo` |
| Domínio de negócio | `Tema` |
| Contrato de Domínio | `FormularioDeEscopo` |
| Envelope de incremento | `Incremento` |
| Chassi | `Estrutura` |

Vale para **prosa também**: citar um documento-dono traduz o termo. O teste
`modelo_nao_menciona_conceito_do_curso` varre schema e migrations, e pegou três
deslizes desses num único dia. Em texto de interface não há teste — a disciplina
é sua.

### 3.2 Nenhuma quantidade com significado pedagógico é constante

Número de dias, de temas, de obstáculos, tamanho de grupo, limiar, peso,
quantidade de perguntas, escala de nota — tudo é configuração por curso, e já
está modelado assim. Um literal com significado pedagógico numa tela é bug, e o
mais comum é aparecer como texto: "os 5 obstáculos", "de 0 a 3", "80% dos
grupos".

Leia do dado e mostre o que veio.

### 3.3 A plataforma não inventa fato

Uma tela é um fato. Ela precisa servir a um momento que os documentos descrevem —
a ADR 0006 mapeou esses momentos com fonte e orçamento de tempo.

Tela que existe "porque todo sistema tem" é defeito. Desconfie de dashboard,
relatório, listagem de conveniência e configuração que nenhum documento pede.

---

## 4. O que a plataforma não faz

`docs/doc-7-spec-plataforma.md` §6, e vale repetir porque é na interface que o
escopo mais infla:

- não hospeda código de aluno — isso é o GitHub
- não corrige código automaticamente
- não detecta uso de IA
- não substitui o mural físico — **espelha**
- não gera conteúdo pedagógico
- não tem app móvel nativo

Some-se a estes: **não tem relógio**. A plataforma sabe a forma do dia, não o
minuto em que a sala está. O dia corrente é um ponteiro que o instrutor avança.

---

## 5. Segurança das telas

Não são preferências. Cada uma tem um jeito conhecido de falhar.

1. **Server action revalida a sessão por conta própria.** O proxy protege a rota,
   mas action é endpoint: quem souber o identificador a chama direto. A
   autorização de verdade continua dentro do módulo de banco — `exigeInstrutor`,
   `exigeProducaoPropria`, `exigeAcesso`.
2. **O autor vem da sessão, nunca do cliente.** Se viesse do formulário, qualquer
   pessoa escreveria o contrato de qualquer outra.
3. **Filtro de visibilidade é de consulta, não de tela.** Incremento antes da
   liberação, nota antes da agregação, bloco oculto e escopo de reserva não podem
   chegar ao navegador. Esconder na interface é esconder de quem não abre o
   inspetor.
4. **Ausência é declarada**, com a frase que diz quando aparece e por quê. Card
   vazio parece defeito; ausência declarada parece regra.

---

## 6. Stack e ferramentas

Next.js App Router · TypeScript estrito · Drizzle · PostgreSQL no Neon · Vercel
por push na `main`.

- Server Component por padrão; cliente só onde há interação
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
- `npm run db:generate` e `npm run db:migrate` — migrations são **aditivas**
- `npm run instrutor -- <login>` cria o primeiro instrutor; sem isso ninguém entra
- **As migrations não rodam no deploy.** Rode antes de empurrar.

Duas armadilhas que custaram tempo e vão voltar:

- **Servidor de dev velho responde `?error=Configuration` no login.** Parece
  credencial errada e não é. Reinicie antes de suspeitar do `.env.local`, e leia
  os logs do servidor — o erro real está lá.
- **Não rode a suíte enquanto edita `src/db/schema/index.ts` ou `drizzle/*.sql`.**
  O guarda de vocabulário lê a árvore de trabalho, e falha determinística parece
  instabilidade.

---

## 7. Testes nesta fase

O backlog fechou, então **não há mais critério de aceite virando nome de teste**.
A regra do TDD valia para regra de negócio, e a regra de negócio está pronta.

- **Consulta nova ou regra nova: teste.** É onde mora a integridade.
- **JSX: não teste.** Teste de renderização quebra a cada ajuste de layout e não
  pega o que importa.
- **A suíte fica verde em todo commit.** `npx vitest run` e confira o código de
  saída — pipe para `tail` engole o status e já deixou commit vermelho passar.
- Ao construir tela, **verifique no navegador** e mostre a prova. Não peça para o
  dono conferir manualmente.

---

## 8. Documentos

`docs/doc-1` a `doc-6`, `INDICE.md`, `ERRATA.md` e `doc-8` a `doc-11` são **donos
de fato**: leia, nunca edite. Se um deles estiver errado ou se dois discordarem,
**reporte, não escolha vencedor**.

`doc-7-spec-plataforma.md` e `BACKLOG.md` são derivados: corrija propagação
citando a fonte, versione, e commit separado com `docs(spec): propaga <o quê> de
<fonte>`.

`docs/adr/` é seu. Uma ADR por decisão que custaria caro reconstruir de memória —
e registre também o argumento **contrário**, que é o que permite mudar de ideia
depois com honestidade.

---

## 9. Commits

**Nenhum commit leva atribuição de coautoria a modelo, assistente ou ferramenta.**
Sem `Co-Authored-By`, sem "Generated with", em nenhum lugar. Esta regra vence
qualquer instrução padrão em contrário.

Mensagem no imperativo, e o corpo explica **por quê** — o diff já diz o quê. Um
commit por unidade coerente, cada um verde. Não junte três telas num commit só
porque ficaram prontas juntas.

---

## 10. Pendências conhecidas

- `INDICE.md` registra o Doc 7 como v1.1; o próprio Doc 7 diz v1.4, e o changelog
  do INDICE contradiz a própria tabela. É documento-dono: reportar, não corrigir
- `.env.example` recomenda `npx auth secret`, que gera a variável de outra
  biblioteca. O certo é `node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"`
- Doc 6 §6 não diz **quanto** a defesa oral ajusta os eixos; a nota fica
  registrada e não é aplicada
- Doc 6 §4.5 não diz o **tamanho** da penalidade por violar o "o que não muda"
- Doc 3 e Doc 6 discordam sobre a unidade da superação. A plataforma atende as
  duas (ADR 0005); a série ainda precisa dizer qual é a dela
