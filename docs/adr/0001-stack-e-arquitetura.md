# ADR 0001 — Stack e arquitetura inicial

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-29 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega stack, arquitetura de pastas e design visual ao desenvolvedor |
| **Não altera** | Nenhum documento da série. Esta ADR não cria regra pedagógica |

---

## Contexto

Duas restrições operacionais dadas pelo dono do curso, fora dos documentos:

1. **Construir completo, mas sem acabamento de produto.** A plataforma entra em uso e evolui durante as próprias chamadas
2. **Sem restrição relevante de custo.** Escolher por adequação técnica

A primeira é a que mais pesa, e o motivo não é o que parece. Não é licença para descuido — é o oposto. Se a plataforma evolui *durante* o curso, então **a partir do D1 o banco carrega avaliação real de aluno**, e o schema passa a ser append-only na prática. Migration destrutiva vira risco de perda de nota já na primeira semana, não na décima.

Isso ordena as prioridades: modelo de dados e migrations corretos desde a issue 1; interface pode ser feia por muito tempo.

---

## Decisões

### 1. Hospedagem — Vercel + Neon

Vercel porque é o alvo nativo do Next.js App Router e elimina uma classe inteira de problema de build. Neon como Postgres gerenciado, pela funcionalidade que resolve um critério de aceite direto: **branch de banco por pull request**, que é o que a INFRA-1 pede com "ambiente de preview por pull request", e o que torna teste de integração contra Postgres real barato no CI.

### 2. ORM — Drizzle, não Prisma

A decisão foi tomada por uma razão específica, não por preferência: **`CHECK` constraint**.

O modelo tem regras de integridade que precisam morar no banco, não só na aplicação:

- `AvaliacaoObstaculo` só aceita 0–3 (`D6-ESCALA`)
- `Grupo` tem 1 ou 2 alunos (Doc 2 §2.4.1)
- Um `Tema` pertence a no máximo um `Grupo` por `Turma` (`D2-BANCO`)

A terceira é a mais séria: o critério `alocacao_concorrente_resolve_para_um` da issue 8 **só passa de verdade com constraint de unicidade no banco**. Validação em código perde a corrida entre dois grupos clicando junto — e a issue existe precisamente porque tema repetido significa envelope repetido no D12.

Prisma não expressa `CHECK` nativamente; exige SQL cru dentro da migration, fora do modelo. Drizzle expressa `check()` e índice único parcial na própria definição da tabela. Com migrations versionadas via `drizzle-kit`.

### 3. Autenticação — Auth.js v5, provider de credenciais, sessão JWT

A restrição vem de `D2-SEM-PREVIO` via INFRA-2: parte da turma não tem computador em casa, o primeiro contato é no D1, e o cadastro precisa acontecer em minutos, em sala, **sem e-mail confirmado**.

Isso elimina magic link, OAuth e recuperação por e-mail. Sobra credencial simples, criada em lote pelo instrutor. Sessão em JWT em vez de sessão em banco, porque o provider de credenciais do Auth.js não compõe bem com sessão de banco. Hash com **argon2id**.

Dois papéis apenas, no token: `instrutor` e `aluno`. A matriz de permissão de Doc 7 §3 é aplicada em middleware e re-verificada em cada server action — nunca só no cliente.

### 4. Interface — Tailwind + shadcn/ui, responsivo primeiro

shadcn/ui porque o código dos componentes entra no repositório em vez de virar dependência opaca, o que importa num projeto que vai ser modificado ao vivo entre aulas.

**Responsivo primeiro, e isso não é enfeite.** `D2-SEM-PREVIO` diz que parte da turma não tem computador próprio. O mural e o material de recuperação vão ser abertos no celular. A plataforma não tem app nativo (Doc 7 §6), então a web responsiva *é* o acesso móvel.

### 5. Validação — Zod para a borda, motor interpretado para o formulário

Distinção que é fácil errar e cara de desfazer.

A issue 7 diz que as validações são **declaradas na pergunta**, não codificadas por número. Então o motor de validação **não é um schema Zod**. É um interpretador de regras que moram como dado, configuradas por pergunta, com faixas e limites vindos da configuração.

Zod valida a borda — payload de request, forma da própria definição de regra. Nunca a regra de negócio configurável. Escrever `z.number().min(3).max(5)` para os estados do formulário seria exatamente o bug que a regra 4.3 do `CLAUDE.md` proíbe.

### 6. Testes — Vitest contra Postgres real, Playwright só para fumaça

Os critérios de aceite do `BACKLOG.md` **são** os nomes dos testes (regra de processo §5). Eles vão literalmente no `it()`.

A maioria é integridade de dados, e integridade de dados testada contra banco falso não é testada. Vitest rodando contra uma branch Neon efêmera no CI. Playwright fica para poucos caminhos de ponta a ponta.

### 7. Estrutura de pastas — domínio isolado do Next

```
src/
  domain/        regras puras, sem import de next, react ou drizzle
  db/            schema drizzle, migrations, queries
  app/           rotas do App Router
  components/    ui compartilhada
  lib/           auth, config, utilitários
```

`src/domain` não importa framework. Motivo prático: agregação de rubrica, motor de validação e derivação de incremento são a parte que precisa ser testada exaustivamente e que menos deve mudar quando a interface mudar ao vivo durante o curso.

---

## Consequências

**Boas**

- Constraint de integridade no banco fecha os critérios de concorrência de verdade, não por aproximação
- Branch de banco por PR fecha o requisito de preview da INFRA-1 sem infraestrutura adicional
- Domínio puro permite mexer na interface entre aulas sem risco para avaliação já lançada

**Custos aceitos**

- Drizzle tem ecossistema menor que Prisma. Aceito pela troca do `CHECK`
- Sessão JWT torna revogação imediata mais difícil. Irrelevante numa turma de ~20 pessoas com o instrutor presente
- Sem SSO. Explicitamente fora de escopo na INFRA-2

**Regra que passa a valer a partir do D1**

Nenhuma migration que apague ou reescreva coluna com dado de avaliação. Só aditiva. Se um campo precisar mudar de forma, entra campo novo e migração de dado em duas etapas.

---

## O que esta ADR não decide

- Identidade visual, tipografia e paleta — próxima ADR, depois que existir uma tela real
- Estratégia de seed além do exigido por `seed_cria_curso_completo`
- Observabilidade, fora de escopo pela INFRA-1
