# DOC 9 — REPOSITÓRIO-ESPELHO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.0 |
| **Natureza** | **Derivado** — não possui fatos próprios |
| **Depende de** | Doc 2 (Contrato, chassi) · Doc 3 (paredes, escopo) · Doc 5 (liberação, entrega) |
| **Destino** | Sessão de codificação. Esta spec é suficiente para construir o repositório de ponta a ponta |

---

## 0. Propósito

Construir o repositório de referência do instrutor: o domínio **Biblioteca / Acervo**, implementado em C#, com histórico de commits que reconstrói o curso inteiro na ordem em que ele é ensinado.

**Dois usos, e o segundo é o que dita a estrutura:**

1. **Material de recuperação** — o aluno que faltou lê o commit do dia e recupera sozinho (Doc 5, §3.1)
2. **Roteiro de live coding** — o instrutor recodifica o domínio em sala e, quando precisar lembrar o objetivo de um passo, consulta o próprio repositório

O segundo uso significa que o histórico não é registro do que foi feito. **É script.**

---

## 1. Regras invioláveis

### 1.1 Paridade de escopo

> **O espelho não contém nada que o aluno não seja pedido a fazer.**

Proibido, em todos os commits: testes automatizados · genéricos criados · `interface` antes da P5 · `static` · `record` · `struct` · LINQ antes da P4 · injeção por container · ORM · async · qualquer pacote NuGet.

O escopo é o do `D3-ESCOPO` (Doc 3, §4), sem uma linha a mais. Um aluno que vê no espelho algo fora do escopo copia por imitação, e a parede correspondente morre.

### 1.2 Política de comentários

**Zero comentários explicando o que o código faz.** Sem XML doc comments, sem cabeçalho de arquivo, sem `// construtor`, sem `// getter`.

**Uma única exceção**, e ela existe por necessidade real:

```csharp
// PROPOSITAL: status como string aceita qualquer valor
public string Status;
```

Nos commits `ingenuo:` e `sintoma:`, cada defeito deliberado leva **uma linha** marcada `// PROPOSITAL:`. Sem isso, o aluno que abre o arquivo sem ler o `git log` não distingue errado-de-propósito de errado-por-acidente.

A marcação é removida no `refactor:` correspondente.

**Todo o resto vai para o corpo do commit ou para `docs/log-de-paredes.md`.** Se uma explicação não cabe em uma linha, ela não é comentário — é log.

### 1.3 Atomicidade

Cada commit compila e roda. Nenhum commit deixa o projeto quebrado.

Exceção declarada: os `sintoma:` **rodam e produzem saída errada** — é o objetivo deles. Errado não é o mesmo que quebrado.

---

## 2. Estrutura de arquivos

```
biblioteca-espelho/
├── README.md
├── .gitignore
├── docs/
│   ├── contrato.md
│   └── log-de-paredes.md
└── src/Biblioteca/
    ├── Biblioteca.csproj
    ├── Program.cs
    └── Dominio/
        ├── Leitor.cs
        ├── Titulo.cs
        ├── Exemplar.cs
        ├── Emprestimo.cs
        ├── Acervo.cs                    (surge na P4)
        ├── Acervo/
        │   ├── TipoDeAcervo.cs          (abstrata, surge na P3)
        │   ├── AcervoGeral.cs
        │   ├── Periodico.cs
        │   ├── Multimidia.cs
        │   └── ObraRara.cs              (surge no commit 22)
        └── Persistencia/                (surge na P5)
            ├── IRepositorioDeEmprestimos.cs
            ├── EmprestimosEmMemoria.cs
            └── EmprestimosEmArquivo.cs
```

`Program.cs` é **harness de demonstração**, não menu completo: chamadas diretas que exibem o comportamento do commit atual. Cresce a cada parede.

### 2.1 Conceitos

Seis, e o excedente é declarado: `Leitor` · `Titulo` · `Exemplar` · `Emprestimo` · `TipoDeAcervo` (hierarquia, 1 conceito) · `Acervo`.

O orçamento de aluno é 5 (Doc 2, §1.4). O excedente é `Titulo`, que existe para ilustrar a distinção entre a obra e o objeto físico.

---

## 3. Contrato de Domínio — Biblioteca

Vai em `docs/contrato.md`, no mesmo formato que o aluno preenche.

**C1 — Qual é o atendimento?**
> Um empréstimo é a retirada de um exemplar por um leitor, com prazo de devolução definido pelo tipo de acervo.

**C2 — Estados**
> `Reservado` → `Emprestado` → `Devolvido`
> `Cancelado`, a partir de `Reservado` ou `Emprestado`

**C3 — Duas transições ilegais**
> 1. `Devolvido` → `Emprestado`. Um empréstimo encerrado não volta a vigorar; querer o mesmo exemplar de novo é um empréstimo novo, com prazo novo.
> 2. `Cancelado` → `Devolvido`. Não se devolve o que nunca foi retirado.

**C4 — Recurso escasso e conflito impossível**
> Recurso: o **exemplar**, não o título — a biblioteca pode ter 4 exemplares da mesma obra.
> Conflito: dois empréstimos ativos do mesmo exemplar no mesmo período.

**C5 — Grandeza variável: multa por atraso**
> - **Acervo geral:** R$ 0,50 por dia de atraso, sem teto.
> - **Periódico:** R$ 2,00 por dia, dobrando a cada 7 dias completos de atraso.
> - **Multimídia:** sem multa diária. Passados 15 dias, cobra-se o valor de reposição e o leitor é bloqueado até quitação.

**C6 — Dado imutável**
> O exemplar e a data de retirada. Trocar o exemplar não é correção, é encerrar um empréstimo e abrir outro. Alterar a data de retirada falsificaria a multa.

**C7 — O que o sistema NÃO faz**
> 1. Não gerencia aquisição ou compra de acervo.
> 2. Não faz cadastro de leitor com foto, documento ou carteirinha.
> 3. Não controla reserva de sala de estudo nem de computador.

**Tabela de Tradução**

| Papel do chassi | Nome no domínio | Classe |
|---|---|---|
| Cliente | Leitor | `Leitor` |
| Atendimento | Empréstimo | `Emprestimo` |
| Item / Serviço | Tipo de acervo | `TipoDeAcervo` |
| Recurso escasso | Exemplar | `Exemplar` |
| Guardião da coleção | Acervo | `Acervo` |

---

## 4. Convenção de commits

Estende conventional commits. Cinco tipos:

| Tipo | Função | Corpo obrigatório? |
|---|---|---|
| `setup:` | Andaime, sem carga pedagógica | Não |
| `docs:` | Contrato, README, log | Não |
| `ingenuo:` | A versão errada, deliberada | Sim |
| `sintoma:` | **O erro executável** — dá checkout, roda, e vê a falha | Sim |
| `refactor:` | A correção | Curto |
| `clareza:` | O princípio nomeado | Sim, completo |
| `demo:` | Demonstração de extensibilidade | Sim |

Escopo entre parênteses: `p1` a `p5`.

### 4.1 Template de mensagem

```
<tipo>(<escopo>): <assunto em minúscula, sem ponto>

Errado: <o que está errado agora, em uma ou duas frases>

Virada: <o que muda no raciocínio, não no código>

Frase da aula: "<a frase que o instrutor diz em voz alta neste ponto>"
```

**O campo `Frase da aula` é o núcleo desta spec.** É o que transforma `git log` em roteiro consultável em sala. Obrigatório em todo `clareza:` e `demo:`.

Nos `sintoma:`, o corpo traz **como reproduzir** em vez de `Virada`:

```
sintoma(p1): três grafias de "emprestado" e a consulta não acha nada

Reproduzir: dotnet run --project src/Biblioteca
Saída esperada: 3 empréstimos criados, consulta por "Emprestado" retorna 1

Erro: o estado é string livre. "emprestado", "Emprestado" e
"emprestad" são o mesmo estado real e três valores diferentes.
```

---

## 5. Sequência de commits

33 commits. Cada linha especifica o que muda; a mensagem segue o template da §4.1.

### Preparação

| # | Commit | Muda |
|---|---|---|
| 1 | `setup: projeto console e estrutura de pastas` | `.csproj`, `Program.cs` vazio, `.gitignore` |
| 2 | `docs: contrato de domínio da biblioteca` | `docs/contrato.md` — §3 desta spec |
| 3 | `docs: readme com tabela de tradução e índice de tags` | `README.md` — §7 |

### P1 — *Por que meu programa aceita um estado que não existe?*

| # | Commit | Muda |
|---|---|---|
| 4 | `ingenuo(p1): entidades com campos públicos e status como string` | `Leitor`, `Titulo`, `Exemplar`, `Emprestimo` — tudo público, `string Status`, `double Multa`, `bool Atrasado` armazenado |
| 5 | `sintoma(p1): três grafias de "emprestado" e a consulta não acha nada` | `Program.cs` cria 3 empréstimos com grafias diferentes e consulta |
| 6 | `sintoma(p1): multa negativa é aceita sem reclamar` | `Program.cs` atribui `-50` e imprime |
| 7 | `refactor(p1): status vira enum StatusDoEmprestimo` | `enum`, campos → propriedades com `set` privado |
| 8 | `refactor(p1): multa vira propriedade de leitura` | Encapsula o valor |
| 9 | `clareza(p1): o objeto nasce válido ou não nasce` | Construtor exige leitor, exemplar, data e tipo de acervo |
| 10 | `refactor(p1): atrasado deixa de ser campo e passa a ser calculado` | `bool Atrasado => ...` |

**Commit 9 — corpo completo**

```
clareza(p1): o objeto nasce válido ou não nasce

Errado: o Emprestimo era criado vazio e preenchido campo a campo.
Entre a criação e o último campo, existia um empréstimo sem exemplar
e sem data — um objeto que o negócio não admite.

Virada: o que é obrigatório para a coisa existir vai no construtor.
Não há janela em que o objeto esteja pela metade.

Frase da aula: "não existe empréstimo sem exemplar. Se não existe no
negócio, não pode existir na memória nem por um instante."
```

**Commit 10 — corpo completo**

```
clareza(p1): atrasado deixa de ser campo e passa a ser calculado

Errado: bool Atrasado era guardado. Quem atualizava? Ninguém.
No dia seguinte o campo mentia.

Virada: se dá para descobrir olhando outros dados, não é estado.
É pergunta, e pergunta se responde na hora.

Frase da aula: "isso não é um dado do empréstimo. É uma conta que
vocês fazem quando alguém pergunta."
```

### P2 — *Por que consigo cancelar algo que já terminou?*

| # | Commit | Muda |
|---|---|---|
| 11 | `ingenuo(p2): o programa altera o estado direto de qualquer ponto` | `set` público no enum, `Program.cs` atribui livremente |
| 12 | `sintoma(p2): devolver duas vezes devolve o exemplar duas vezes` | `Program.cs` devolve 2× e o acervo passa a ter mais exemplares do que existem |
| 13 | `sintoma(p2): cancelar um empréstimo já devolvido` | `Program.cs` cancela após devolver, sem erro |
| 14 | `refactor(p2): transições viram métodos de negócio` | `Retirar()`, `Devolver()`, `Cancelar()`; `set` volta a privado |
| 15 | `clareza(p2): a regra da transição mora dentro da entidade` | Remove a validação duplicada do `Program.cs` |
| 16 | `refactor(p2): transição ilegal lança InvalidOperationException` | Mensagem em linguagem de negócio |

**Commit 15 — corpo completo**

```
clareza(p2): a regra da transição mora dentro da entidade

Errado: o Program.cs verificava se podia devolver antes de devolver.
Havia dois lugares fazendo a mesma checagem, e um deles estava
desatualizado.

Virada: quem conhece as regras do empréstimo é o empréstimo. Quem
chama não precisa saber se pode — pede, e é recusado se não pode.

Frase da aula: "parem de perguntar 'posso devolver?'. Manda devolver.
Se não pode, ele reclama."
```

### P3 — *Por que meu `if` não para de crescer?*

| # | Commit | Muda |
|---|---|---|
| 17 | `ingenuo(p3): cascata de if por tipo no cálculo da multa` | `enum TipoDeAcervo` + `if/else` dentro de `Emprestimo.CalcularMulta()` |
| 18 | `sintoma(p3): segunda cascata em CalcularPrazo, já dessincronizada` | `CalcularPrazo()` com a mesma cascata, faltando um caso |
| 19 | `refactor(p3): TipoDeAcervo vira classe abstrata` | Métodos abstratos `CalcularMulta` e `PrazoEmDias` |
| 20 | `refactor(p3): três subclasses assumem as três fórmulas` | `AcervoGeral`, `Periodico`, `Multimidia` — as fórmulas do C5 |
| 21 | `clareza(p3): a categoria deixou de ser dado e virou comportamento` | Remove os `if` do `Emprestimo` |
| 22 | `demo(p3): obra rara entra sem tocar em nenhuma classe existente` | `ObraRara.cs` — arquivo novo, zero arquivos modificados |

**Commit 21 — corpo completo**

```
clareza(p3): a categoria deixou de ser dado e virou comportamento

Errado: TipoDeAcervo era um enum e quem calculava era o Emprestimo.
Cada categoria nova exigia abrir o Emprestimo e mexer em código que
já funcionava. E existiam duas cascatas: multa e prazo. Uma delas
esqueceu o multimídia.

Virada: quem sabe calcular a multa do periódico é o periódico. O
empréstimo só pede. Categoria nova não abre código antigo.

Frase da aula: "vocês pararam de perguntar 'que tipo é isso?' e
passaram a mandar 'calcule sua multa'."
```

**Commit 22 — corpo completo**

```
demo(p3): obra rara entra sem tocar em nenhuma classe existente

Um arquivo novo. Zero arquivos modificados. Confiram com git show --stat.

Frase da aula: "é isso que vou pedir de vocês no marco de hoje.
Uma categoria nova, e nenhum arquivo antigo aberto."
```

> Este é o commit do **Marco 2** (Doc 4, D8). O `--stat` mostrando um único arquivo adicionado é a evidência exibida em sala.

### P4 — *Os dois estão certos. Por que juntos estão errados?*

| # | Commit | Muda |
|---|---|---|
| 23 | `ingenuo(p4): o construtor valida se o exemplar está livre` | Validação dentro de `Emprestimo`, que não conhece os outros |
| 24 | `sintoma(p4): dois empréstimos ativos do mesmo exemplar` | `Program.cs` cria dois, ambos aceitos |
| 25 | `refactor(p4): Acervo guarda a coleção e valida o conflito` | `Acervo.cs`, com `Any`/`Where` |
| 26 | `clareza(p4): regra entre dois objetos não cabe em nenhum dos dois` | Remove a validação do construtor |

**Commit 26 — corpo completo**

```
clareza(p4): regra entre dois objetos não cabe em nenhum dos dois

Errado: o construtor do Emprestimo tentava validar se o exemplar
estava livre. Mas um empréstimo não conhece os outros empréstimos.
Ele não tem como saber.

Virada: a regra é sobre o conjunto, então mora em quem enxerga o
conjunto. A lista deixa de ser depósito e passa a ser guardiã.

Frase da aula: "os dois empréstimos estão certos. O erro está entre
eles — e o entre não mora dentro de nenhum dos dois."
```

### P5 — *Por que mudar onde os dados moram quebrou minha regra?*

| # | Commit | Muda |
|---|---|---|
| 27 | `ingenuo(p5): Console.WriteLine dentro do Emprestimo` | Entidade imprime recibo |
| 28 | `ingenuo(p5): gravação em arquivo dentro do método de negócio` | `Devolver()` grava em `.txt` |
| 29 | `sintoma(p5): trocar onde os dados moram exige abrir o domínio` | Comentário `// PROPOSITAL:` marcando os pontos que teriam de mudar |
| 30 | `refactor(p5): IRepositorioDeEmprestimos define o contrato` | Interface — primeira do curso |
| 31 | `refactor(p5): EmprestimosEmMemoria implementa o contrato` | Primeira implementação |
| 32 | `refactor(p5): EmprestimosEmArquivo implementa o mesmo contrato` | Segunda implementação |
| 33 | `clareza(p5): a troca acontece em uma linha` | `Program.cs` — troca a implementação e nada mais muda |

**Commit 33 — corpo completo**

```
clareza(p5): a troca acontece em uma linha

Errado: o domínio sabia onde os dados moravam. Trocar memória por
arquivo obrigava a abrir Emprestimo e Acervo — classes de regra de
negócio, alteradas por um motivo de infraestrutura.

Virada: o domínio diz o que precisa e não como é feito. Quem
implementa obedece. Trocar a implementação não é reescrever regra.

Frase da aula: "uma linha. E nenhuma regra de negócio soube que a
persistência mudou. É essa a resposta da pergunta que está na parede
desde o primeiro dia."
```

> O commit 33 é a resposta literal à pergunta condutora (`D1-PERGUNTA`). É o último commit do espelho por isso.

---

## 6. Tags e publicação

### 6.1 Tags

| Tag | Commit | Uso |
|---|---|---|
| `d04` | 10 | Fim do dia 4 |
| `d05` | 13 | Fim do dia 5 |
| `d06` | 16 | Fim do dia 6 |
| `d07` | 18 | Fim do dia 7 |
| `d08` | 22 | Fim do dia 8 |
| `d09` | 26 | Fim do dia 9 |
| `d10` | 31 | Fim do dia 10 |
| `d11` | 33 | Fim do dia 11 |
| `clareza-p1` … `clareza-p5` | 9, 15, 21, 26, 33 | Salto direto aos pontos de virada |
| `marco-2` | 22 | Evidência do Marco 2 |

### 6.2 Publicação incremental

O repositório é construído **inteiro e antes do D1**, em remoto privado. A cada dia, publica-se só até a tag do dia:

```
git remote add publico <url-publica>
git push publico d04:main
```

Cumpre o atraso deliberado do Doc 5 §3.1 sem exigir disciplina no calor da aula, e mantém invisíveis as mensagens `clareza:` antes da demonstração.

---

## 7. README

Único arquivo do repositório que existe para ser lido de fora. Conteúdo obrigatório:

1. O que é este repositório e para que serve
2. A **Tabela de Tradução**
3. **Como navegar:** ordem dos tipos de commit e o que cada um significa
4. **Índice de tags**, com a pergunta de cada parede
5. Aviso: *este repositório contém código deliberadamente errado, marcado com `// PROPOSITAL:` e com commits do tipo `ingenuo:` e `sintoma:`*
6. Como rodar

**Não contém:** explicação de POO, tutorial, glossário de conceitos. Isso é aula.

---

## 8. `docs/log-de-paredes.md`

O instrutor preenche o dele igual ao do aluno — 5 linhas por parede: qual era o problema, o que tentei, por que a solução funciona, o que ela custou.

Serve como **exemplar**: é o modelo do que se espera do aluno, e é a resposta pronta quando alguém perguntar "mas o que eu escrevo aqui?".

---

## 9. Critérios de aceite do repositório

- [ ] 33 commits, na ordem da §5
- [ ] Todo commit compila e roda
- [ ] Nenhum arquivo contém comentário que não seja `// PROPOSITAL:` de uma linha
- [ ] Nenhuma marcação `// PROPOSITAL:` sobrevive ao `refactor:` correspondente
- [ ] Nenhum item da lista de proibições da §1.1 aparece em nenhum commit
- [ ] Os 5 commits `clareza:` e os 2 `demo:` têm `Frase da aula` no corpo
- [ ] `git show --stat` do commit 22 mostra exatamente 1 arquivo adicionado e 0 modificados
- [ ] As 3 fórmulas de multa do C5 estão implementadas com estruturas diferentes, não com constantes diferentes
- [ ] 18 tags criadas
- [ ] `README.md` cobre os 6 itens da §7

---

## 10. Issues

**6 issues**, não 33 — a issue é a fatia, o commit atômico é a granularidade abaixo dela.

| # | Issue | Commits | SSOT |
|---|---|---|---|
| 1 | Preparação: projeto, contrato, README | 1–3 | `D2-CONTRATO` |
| 2 | P1 — integridade do objeto | 4–10 | `D3-MAPA` `D3-ESCOPO` |
| 3 | P2 — invariantes e transições | 11–16 | `D3-MAPA` `D3-ESCOPO` |
| 4 | P3 — comportamento variável | 17–22 | `D3-MAPA` `D6-PESOS-PAREDE` |
| 5 | P4 — regras entre objetos | 23–26 | `D3-MAPA` |
| 6 | P5 — separação e contrato | 27–33 | `D3-MAPA` `D2-CHASSI` |

Corpo de cada issue: contexto · ID SSOT · a sequência de commits como checklist · os critérios de aceite aplicáveis da §9 · a lista de proibições da §1.1.

---

## 11. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Spec criada. Convenção de commits em 5 tipos, com `sintoma:` como erro executável e `Frase da aula` como campo obrigatório dos pontos de virada. 33 commits especificados. Política de comentários restrita a `// PROPOSITAL:` de uma linha. Publicação incremental por tag para cumprir o atraso deliberado |
