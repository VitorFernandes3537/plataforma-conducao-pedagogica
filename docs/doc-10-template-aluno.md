# DOC 10 — TEMPLATE DO ALUNO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.0 |
| **Natureza** | **Derivado** — não possui fatos próprios |
| **Depende de** | Doc 2 (renomeação, Contrato) · Doc 3 (escopo) · Doc 4 (D4) · Doc 5 (entrega) |
| **Entrega** | Repositório-template no GitHub, disponível no D4 |

---

## 0. Propósito

Eliminar cerimônia de linguagem do D4. O aluno recebe projeto que compila, `.gitignore` correto e os documentos de acompanhamento em branco — e gasta os 45 minutos de implementação modelando, não configurando.

**Fronteira:** o template resolve infraestrutura. Não resolve nada de domínio.

---

## 1. Princípio — o template não dá pista arquitetural

> **Nenhuma pasta, nenhum arquivo e nenhum nome do template antecipa a solução de qualquer parede.**

O aluno recebe um projeto vazio com documentos em branco. A arquitetura é a resposta das paredes; entregá-la pronta transforma cinco descobertas em cinco preenchimentos de lacuna.

O andaime real do aluno não é a estrutura de pastas — é o **Contrato de Domínio aprovado no D3**, que já lhe diz quais entidades existem, quais estados elas têm e quais regras variam.

---

## 2. O que o template NÃO contém — e por quê

| Ausência | Razão |
|---|---|
| Qualquer classe de domínio | `D2-NOMES`: renomeação é obrigatória. Um `Atendimento.cs` no template mataria a exigência — o aluno preencheria a lacuna em vez de decidir o que a coisa é no negócio dele |
| Pasta `Dominio/` ou `Persistencia/` | Entregaria a P5. A separação em camadas **é** a parede |
| Pasta para hierarquia | Entregaria a P3 |
| `enum` de exemplo | Entregaria a P1 |
| Projeto ou pacote de teste | Fora do escopo (Doc 3, §4). A P7 foi cortada |
| Interface de qualquer tipo | `interface` nasce na P5 |
| Menu de console pronto | O harness cresce por parede, junto com o domínio |
| `static` em qualquer lugar | `static` é ativamente desencorajado (Doc 3, §4). Ver §4.2 |
| Lista das 5 paredes nos documentos | Previewaria o currículo inteiro no D4. Ver §3.4 |

**Consequência aceita:** os arquivos do aluno ficam todos na raiz do projeto. Por volta do D9 isso está desorganizado — e é exatamente o setup da P5. A bagunça não é falha do template; é o material da parede.

---

## 3. Estrutura e arquivos

```
poo-<dominio>-<usuario>/
├── .gitignore
├── README.md
├── docs/
│   ├── contrato.md
│   └── log-de-paredes.md
└── src/
    ├── Projeto.csproj        ← renomeado pelo aluno no passo 1
    └── Program.cs
```

### 3.1 `src/Projeto.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
```

### 3.2 `src/Program.cs`

```csharp
Console.WriteLine("Projeto iniciado.");
```

Uma linha. O aluno substitui no D4.

### 3.3 `.gitignore`

```
bin/
obj/
*.user
.vs/
.idea/
.DS_Store
```

**Não é detalhe.** Sem isso, 22 repositórios públicos acumulam binários compilados, o `git diff` fica ilegível e a verificação por `--stat` do Marco 2 deixa de funcionar.

### 3.4 `docs/log-de-paredes.md`

```markdown
# Log de paredes

Uma entrada por parede, cinco linhas. Preenchido no fechamento do dia.

---

## <nome que o professor der à parede de hoje>

**Qual era o problema:**

**O que eu tentei:**

**Por que a solução funciona:**

**O que ela custou:**
```

> **Uma única entrada em branco, não cinco.** O aluno duplica o bloco quando cada parede acontece. Listar as cinco previewaria o currículo — ele saberia no D4 que existe uma parede sobre `if` crescendo, e a P3 perderia força no D7.

### 3.5 `docs/contrato.md`

As 7 perguntas com os critérios de aceite, em branco. **Sem os exemplos da Biblioteca** — aqueles são do domínio de demonstração e vazariam modelagem pronta.

```markdown
# Contrato de Domínio

**Domínio:**
**Dupla:**
**Aprovado em:**

---

## C1 — Qual é o atendimento no seu domínio?
*Uma frase. Precisa nomear um evento com começo, fim e possibilidade de
cancelamento — não um cadastro, não uma coisa, não um relatório.*



## C2 — Quais são os estados do atendimento?
*De 3 a 5, na ordem em que ocorrem. Um inicial, ao menos um final, nomes
do negócio. Condição derivada não é estado.*



## C3 — Cite 2 transições ilegais
*Estado de origem, estado de destino e a razão de negócio de cada uma.*

1.
2.

## C4 — Qual é o recurso escasso, e qual conflito é impossível?
*O recurso precisa ser contável e finito. O conflito precisa ser
verificável comparando dois atendimentos.*



## C5 — Qual é a grandeza variável, e quais são as 3 categorias?
*Uma grandeza, exatamente 3 categorias, com a fórmula de cada uma.
As 3 fórmulas precisam ter forma diferente — não os mesmos cálculos
com números diferentes.*

| Categoria | Fórmula |
|---|---|
| | |
| | |
| | |

## C6 — Qual dado é imutável após a criação do atendimento?
*Ao menos um, com justificativa de negócio.*



## C7 — O que este sistema NÃO vai fazer?
*Mínimo 3 itens, cada um plausível de alguém pedir.*

1.
2.
3.

---

## Tabela de Tradução

| Papel | Nome no meu domínio | Classe no código |
|---|---|---|
| Cliente | | |
| Atendimento | | |
| Item / Serviço | | |
| Recurso escasso | | |
```

> A tabela lista **quatro** papéis. O quinto — guardião da coleção — não é declarado aqui por decisão do Doc 2, §1.3.1: ele é a descoberta da P4.

### 3.6 `README.md`

```markdown
# <Nome do domínio>

> **Como escrever um sistema que sobrevive a uma mudança de regra
> que eu não previ?**

**Aluno:**
**Dupla:**
**Domínio:**

## O que este sistema faz

<uma frase, igual à resposta da C1 do contrato>

## Tabela de Tradução

| Papel | Nome no meu domínio | Classe |
|---|---|---|
| Cliente | | |
| Atendimento | | |
| Item / Serviço | | |
| Recurso escasso | | |

## Como rodar

    dotnet run --project src

## Documentos

- [Contrato de Domínio](docs/contrato.md)
- [Log de paredes](docs/log-de-paredes.md)

---

## Primeiros passos

1. Renomeie `src/Projeto.csproj` para o nome do seu domínio
2. Preencha o cabeçalho e a Tabela de Tradução acima
3. Copie o contrato aprovado para `docs/contrato.md`

## Regra de nomes

As classes usam o vocabulário do **seu** domínio. Nomes genéricos —
`Atendimento`, `Cliente`, `Servico`, `Recurso` — são rejeitados.
O código precisa refletir exatamente a Tabela de Tradução.
```

---

## 4. Decisões de configuração

### 4.1 `Nullable` habilitado

Contraintuitivo para iniciante, e é decisão consciente.

O argumento que sustentou C# em vez de Python foi *o compilador é professor auxiliar*. Desligar o melhor recurso dele contradiz a escolha.

Efeito prático: `public string Status;` gera aviso de que um campo não-anulável precisa ter valor ao sair do construtor. O aluno não entende no D4 — e entende no **commit de clareza da P1**, quando o construtor passa a exigir o obrigatório. O aviso vira insight retroativo: *o compilador estava dizendo isso desde o começo*.

Avisos ficam como avisos, nunca como erros. Nada bloqueia a compilação.

### 4.2 Top-level statements no `Program.cs`

O template de console do .NET tradicional expõe `static void Main`. Como `static` é ativamente desencorajado (Doc 3, §4) — iniciante usa `static` para fugir de instanciação, e isso destrói a P1 — **a palavra não aparece em nenhum arquivo entregue**.

Top-level statements resolvem sem discurso: o aluno nunca vê `static` no material de partida.

### 4.3 `ImplicitUsings` habilitado

Elimina `using System;` e afins. Cerimônia de linguagem não é conteúdo do curso.

### 4.4 `net8.0`

LTS. **Verificar contra o SDK instalado no laboratório** antes de publicar o template — divergência de versão é o erro mais provável do setup do D4.

### 4.5 Sem `.sln`

Um projeto só. Solution adiciona um conceito sem pagar nada.

---

## 5. Distribuição

**Repositório-template do GitHub.** O aluno clica em *Use this template*, nomeia como `poo-<dominio>-<usuario>` e marca como público.

Vantagens sobre um `.zip`: histórico limpo desde o primeiro commit, sem risco de commitar `bin/obj` na primeira vez, e usa o fluxo que a turma já conhece.

Commit inicial único: `setup: template inicial`.

---

## 6. Critérios de aceite

- [ ] `dotnet run --project src` funciona logo após clonar
- [ ] Nenhum arquivo do template contém a palavra `static`
- [ ] Nenhum arquivo do template contém classe de domínio ou `enum`
- [ ] Nenhuma pasta sugere camadas (`Dominio`, `Persistencia`, `Servicos`, `Models`)
- [ ] `docs/log-de-paredes.md` tem exatamente **uma** entrada em branco
- [ ] `docs/contrato.md` tem as 7 perguntas com critérios e **sem** exemplos preenchidos
- [ ] A Tabela de Tradução lista 4 papéis, não 5
- [ ] `.gitignore` ignora `bin/` e `obj/`
- [ ] `TargetFramework` confere com o SDK do laboratório
- [ ] A pergunta condutora aparece no `README.md`

---

## 7. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Template especificado. Princípio de zero pista arquitetural: sem classes, sem pastas de camada, sem `enum`, sem interface. `Nullable` habilitado como recurso pedagógico deliberado. Top-level statements adotados para manter `static` fora do material entregue. Log de paredes com entrada única para não previewar o currículo |
