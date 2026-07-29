# ADR 0002 — Identidade pelo GitHub, sem infraestrutura de organização

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-29 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega stack, arquitetura e design ao desenvolvedor |
| **Substitui** | ADR 0001 §3 (autenticação) e §6 (banco de teste) |
| **Não altera** | Nenhum documento da série. Não cria regra pedagógica |

---

## Contexto

A ADR 0001 §3 decidiu provider de credenciais com hash argon2id, justificando por `D2-SEM-PREVIO`: parte da turma não tem computador em casa e o cadastro precisa acontecer em minutos, em sala.

Essa leitura estava errada. `D2-SEM-PREVIO` (Doc 2 §3.3) restringe **trabalho prévio ou em casa**; não diz que a turma não tem conta no GitHub. E o Doc 5 §6 já exige de cada aluno um **repositório público individual com push diário** — ou seja, conta no GitHub é pré-requisito do curso, não custo novo da plataforma. A turma é de formação full stack na reta final, com projeto desde o D1.

Avaliou-se em seguida usar uma GitHub Organization como espinha dorsal: papéis vindos de time, repositórios criados pela plataforma, webhook de org. Foi **descartado por desproporção**. Aquilo resolve provisionamento em escala; o PCP conduz uma turma de ~22 pessoas cujos repositórios são públicos por decisão pedagógica — e ler recurso público não exige credencial nenhuma.

---

## Decisões

### 1. GitHub é identidade, não infraestrutura

Login único via GitHub, para instrutor e aluno, com Auth.js v5 e o provider GitHub. A plataforma **não** instala GitHub App, não cria repositório, não gerencia membro de organização e não recebe webhook.

Consequência imediata: **não há senha**, logo não há hash. O argon2 sai da stack, e com ele o binário nativo que causa segfault no Windows 11 com Node 20.

### 2. A chave de identidade é o ID numérico

`githubUserId` (inteiro, imutável) é a chave. O `login` é campo de exibição, revalidado a cada sessão.

O GitHub permite trocar o username a qualquer momento, e o antigo fica livre para outra pessoa registrar. Chavear pela string órfã o registro do aluno numa troca — e, no pior caso, entrega a identidade dele a quem assumir o username abandonado.

### 3. Organização, time e turma são entidades do banco

`Curso`, `Turma` e `Grupo` são tabelas do PCP. O papel (`instrutor` | `aluno`) é coluna, atribuída pelo instrutor, não derivada de time do GitHub.

Motivo: papel nativo de organização só tem `admin` e `member` — papel customizado é exclusivo do GitHub Enterprise Cloud. Derivar papel de time exigiria GitHub App, permissão `Members: Read-only` e uma checagem de membership que tem armadilha conhecida (`GET /orgs/{org}/members/{username}` responde **302 redirecionando para `public_members`** quando a credencial não é de membro, e o `fetch` do Node segue redirect por padrão — qualquer pessoa com membership pública passaria).

### 4. Repositório do aluno é uma URL, não um recurso gerenciado

A plataforma guarda `repositorioUrl` e lê a API pública do GitHub quando precisa confirmar push ou montar o índice da turma.

**Nunca usar `commits[].timestamp` como prova de push do dia.** É data fornecida pelo cliente Git: `git commit --date=` falsifica. A prova é o horário de leitura no servidor.

O custo aceito: sem a org, o aluno pode tornar o próprio repositório privado ou apagá-lo, e a captura quebra. Isso vira **estado visível no painel do instrutor**, não erro de log.

### 5. Teste de integração roda PGlite

Substitui a branch efêmera do Neon da ADR 0001 §6. PGlite é o Postgres compilado para WASM, rodando em processo: não é mock, e reproduz `CHECK` constraint e índice único parcial, que são a razão declarada de ter escolhido Drizzle.

Motivo prático: o Neon dá **10 branches por projeto no plano Free e também no Launch** — o plano pago não aumenta o teto, só passa a cobrar por branch extra. Branch por PR esgota isso rápido. A branch do Neon fica reservada para o ambiente de preview, não para a suíte.

### 6. TypeScript fixado em 5.9.3

O `latest` de hoje é 7.0.2, o port em Go, que **não traz mais a API de compilador em JavaScript** — o `next build` morre no passo de tipos, e `typescript-eslint` declara peer `<6.1.0` e fechou o pedido de suporte como *not planned*. A versão fica fixa, sem caret.

### 7. O middleware do Next 16 chama-se `proxy.ts`

A ADR 0001 §3 fala em "middleware". No Next 16 o arquivo é `src/proxy.ts` com export nomeado `proxy`.

Isto é armadilha de segurança, não detalhe de nomenclatura: um `middleware.ts` remanescente **não gera erro de build — ele simplesmente não roda**, e a matriz de permissão do Doc 7 §3 deixa de ser aplicada com rota protegida virando pública. Também: `export const config = { runtime: 'nodejs' }` dentro do proxy **lança erro** no build; o runtime deixou de ser configurável.

A ADR 0001 continua correta no ponto principal: proxy não é solução de autorização, e cada server action re-verifica.

---

## Consequências

**Boas**

- Onboarding de um passo: autorizou, entrou, informou o repositório
- Nada de senha para esquecer, resetar ou vazar
- A superfície de permissão sobre a conta do aluno é zero — repositório público se lê sem escopo

**Custos aceitos**

- GitHub fora do ar trava o login. No D3, que é marco go/no-go duro, isso para a aula. Aceito sem segundo caminho de login por enquanto
- O aluno pode privatizar ou apagar o próprio repositório. Detectado e exibido, não impedido
- Sem provisionamento automático de repositório: o aluno cria o dele no bloco de setup do D4, que o cronograma já reserva

---

## O que esta ADR não decide

- Identidade visual — continua pendente desde a ADR 0001
- Se o instrutor precisará de token do GitHub para elevar o limite de 60 requisições/hora da API pública não autenticada. Decide-se na issue 11, com número de aluno real na mão
