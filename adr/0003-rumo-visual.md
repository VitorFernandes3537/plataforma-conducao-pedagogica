# ADR 0003 — Rumo visual: instrumento, não painel

| | |
|---|---|
| **Estado** | Proposta — aguarda aprovação do dono do curso |
| **Data** | 2026-07-29 |
| **Autoridade** | `docs/doc-7-spec-plataforma.md` §0.2 delega design visual ao desenvolvedor |
| **Fecha pendência de** | ADR 0001, "Identidade visual, tipografia e paleta — próxima ADR, depois que existir uma tela real" |
| **Não altera** | Nenhum documento da série |

---

## Contexto

A ADR 0001 adiou identidade visual até existir tela real. As issues 4 e 5 são as primeiras telas, então a decisão vence agora.

Correção de premissa registrada: uma versão anterior deste raciocínio tratou a plataforma como mobile-first, apoiada em `D2-SEM-PREVIO`. Errado — aquela restrição fala de **trabalho fora de sala**. O estudo, as ferramentas e o desenvolvimento acontecem no navegador de um PC. **Desktop primeiro; responsivo como cortesia, não como direção.**

---

## Decisão

### 1. A plataforma é um instrumento de condução de tempo

Não é um painel de indicadores. O que a spec descreve é operação ao vivo, sob relógio: ritmo diário fixo de 20/40/30/75/15 minutos (Doc 4 §2), marcos que são **portões** e não etapas — o D3 é go/no-go duro e sem aprovação não se escreve código (Doc 4 §4) —, captura contínua nos momentos que já existem (Doc 6), e um mural que **espelha** uma parede física (Doc 7 §6).

Referência estrutural adotada: **quadro de tarjas de despacho**. Cada `Grupo` é uma ficha que atravessa portões numa régua de tempo. O mapeamento não é metáfora decorativa — é a mesma operação.

### 2. Cor significa estado

| Token | Valor | Papel |
|---|---|---|
| `quadro` / `quadro-fundo` | `#1F2A2E` / `#161F22` | o painel |
| `tarja` / `tarja-sombra` | `#E8E4DA` / `#D3CEC1` | a ficha: superfície de leitura e decisão |
| `tinta` / `tinta-fraca` | `#16201F` / `#5B625D` | texto sobre tarja |
| `regua` / `regua-fraca` | `#5C6B6E` / `#33454A` | estrutura e divisórias |
| `portao-duro` | `#C2352B` | **só** marco duro e estado bloqueante |
| `portao-triagem` | `#C98A1E` | **só** marco de triagem |
| `escala-0` a `escala-3` | rampa fria → clara | avaliação de obstáculo (`D6-ESCALA`) |

Dois tons de portão porque os documentos distinguem `duro` de `triagem`. É semântica, não paleta.

A escala 0–3 é **sequencial, não semáforo**: 0 é ausência, 3 é domínio. Vermelho ali seria erro de leitura — obstáculo não superado não é falha moral, é o estado normal antes da tentativa.

### 3. Três registros tipográficos, três trabalhos

- **Archivo** — cromagem do instrumento: rótulo, cabeçalho, tarja.
- **IBM Plex Mono** (`.dado`) — tempo e número, com numeral tabular. Não é estética: coluna de números que dança é ilegível sob pressão.
- **Literata** — prosa de aluno: log de obstáculo, reflexão, briefing, contrato. Texto humano merece leitura, não cromagem.

Auto-hospedadas via `next/font/google`, que baixa no build. Nenhuma requisição a CDN em runtime, nenhum fallback silencioso.

Descartado: `Geist`, que o `create-next-app` instala. É a fonte-padrão do ecossistema e não carrega ponto de vista.

### 4. Compromisso com um único mundo visual

**Fundo escuro sempre.** Não é omissão de tema claro: é a escolha de parecer painel, e não documento. `color-scheme: dark` declarado.

### 5. Signature: a régua do dia

Barra proporcional às durações reais, persistente em toda tela, com o bloco corrente aceso. As larguras **são** as proporções — 75 minutos ocupam cinco vezes o espaço de 15, sem largura mínima e sem arredondamento, porque um bloco curto deve parecer curto.

Responde a única pergunta que o instrutor faz o tempo todo: *estou no tempo?*

### 6. O risco assumido: estado pedagógico como ambiente

Em dia de marco, o portão tinge a régua e as divisórias da tela inteira. A tela diz "hoje reprova" sem escrever isso em lugar nenhum.

**Limite que impede virar semáforo:** o portão tinge régua e divisória — **nunca a tarja, nunca o texto**. Bloqueio aparece como barra na borda esquerda da ficha, não como fundo colorido. Texto sobre vermelho é ilegível e grita.

### 7. Ausência é projetada, não é card vazio

"Aluno não vê nota antes da agregação" (Doc 7 §3) virou **ausência declarada**: borda tracejada e uma frase dizendo quando aparece e por quê. Card vazio dizendo "sem dados" parece defeito; ausência declarada parece regra.

---

## Consequências

**Boas**

- A régua reusa direto o modelo da issue 2: `Bloco` já tem `ordem`, `duracaoMinutos` e `tipo`
- Tokens em `@theme` do Tailwind v4, então shadcn/ui monta sobre eles sem briga
- `blocos.tipo` sendo texto (issue 3) permite qualquer taxonomia de bloco sem tocar no CSS

**Custos aceitos**

- Sem tema claro. Quem imprimir tela vai gastar tinta
- Três famílias tipográficas custam peso. Mitigado por `subsets` e `display: swap`; o serif só carrega nas telas de prosa
- A régua ocupa altura fixa no topo de toda tela. É espaço caro, gasto de propósito

---

## O que esta ADR não decide

- Componentes de formulário e tabela — entram com as issues 6, 7 e 9, sobre shadcn/ui
- Comportamento de movimento. Nada de animação até existir uma tela real que peça
- Ícones. Nenhum foi introduzido, e a ausência é deliberada: rótulo escrito é mais preciso que pictograma em interface de decisão
