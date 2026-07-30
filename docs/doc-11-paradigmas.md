# DOC 11 — PARADIGMAS DE PROGRAMAÇÃO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.1 |
| **Natureza** | **Derivado** — exceto §10, que é SSOT |
| **Depende de** | Doc 1 (tese, pergunta condutora) · Doc 4 (D1, 60 min) · Doc 7 (M0) |
| **Duração** | 60 minutos · D1 |

> **Nota de versão.** A v1.1 corrige três decisões da v1.0 depois da avaliação do material já existente do instrutor: volta a **4 paradigmas** (declarativo tinha sido rebaixado indevidamente), incorpora os cinco decks existentes como **biblioteca de referência** em vez de material de aula, e realoca o slide dos quatro pilares de OO para o **D11**, porque na abertura ele entregava a parede P3. Detalhes na §12.

---

## 0. Propósito e fronteira

**Responde:** o que acontece nos 60 minutos de paradigmas do D1, com que material, o que fica como referência para estudo próprio, e qual é o vocabulário de tipos de slide da plataforma.

**Não responde:** os conceitos de POO em si (D2 e as paredes) · a estrutura do dia (Doc 4) · como a plataforma armazena e renderiza (Doc 7).

---

## 1. O problema de projeto deste bloco

Este é **o único bloco expositivo do curso**. Todo o resto é parede antes de modelo.

E ele acontece no D1 — o dia em que os hábitos da turma são definidos. Se os primeiros 60 minutos forem palestra, a turma aprende que este é um curso de assistir, e os quatro dias seguintes são gastos desfazendo isso.

**A saída não é encurtar a exposição. É transferir a descoberta.**

Tudo se apoia numa constatação verdadeira que eles não sabem:

> **Vocês já usaram os quatro paradigmas esta semana. Sem saber o nome de nenhum.**

---

## 2. Decisões

### 2.1 Quatro paradigmas

| Paradigma | Entra? | Ancoragem no repertório da turma |
|---|---|---|
| Imperativo / procedural | ✅ | `for`, `if`, funções soltas, o módulo de lógica |
| Orientado a objetos | ✅ | `class` em JS, DOM, componentes React |
| Funcional | ✅ | `map`, `filter`, `reduce`, hooks |
| **Declarativo** | ✅ | **HTML, CSS, SQL, JSX** |
| Lógico (Prolog) | ❌ | Nenhuma. Transferência zero |

**Declarativo é o paradigma com a maior densidade de reconhecimento desta turma** — quatro tecnologias que eles usam toda semana. A v1.0 o rebaixara a "revelação de fechamento" por economia de tempo, o que estava errado: ele é o mais ancorado, não o mais dispensável.

O único corte correto sempre foi o lógico.

### 2.2 Tudo em TypeScript, nada em C#

Os quatro paradigmas são demonstrados **na linguagem que eles já usam**.

Esse é o argumento central: se a mesma linguagem escreve os quatro, **o paradigma não está na linguagem — está na cabeça de quem escreve**. É a tese do curso (`D1-TESE`) demonstrada em vez de afirmada, no primeiro dia.

O material existente do instrutor está em JavaScript. **Converter para TypeScript** — as anotações de tipo são a ponte com o C# do D4.

### 2.3 Domínio: relatório escolar

O domínio dos decks existentes. Mantido: é limpo, é comparável nas quatro lentes, e não está no banco de domínios nem é Biblioteca.

**Limitação conhecida e endereçada:** filtrar, somar e formatar é um problema de **pura transformação de dados** — a forma onde funcional ganha e OO parece burocracia. Um aluno atento nota isso na véspera de um curso de OO. A correção está na §6.

### 2.4 A pergunta organizadora

Duas perguntas, e elas se somam.

**A do instrutor, já nos decks:**

> O que muda é a **lente do programador**, não o dado.

**A que atravessa a sessão:**

> ## Onde mora o comportamento?

| Paradigma | Resposta |
|---|---|
| Imperativo | Em funções que recebem os dados de fora |
| Funcional | Em transformações que não guardam nada |
| Declarativo | Em regras, e o sistema decide o caminho |
| **Orientado a objetos** | **Junto do dado que ele governa** |

A última linha é o curso inteiro em cinco palavras.

---

## 3. Os decks existentes são biblioteca, não aula

O instrutor possui cinco decks — quatro conceituais e um comparativo — com cerca de 57 slides.

**A 57 slides em 60 minutos, isso é 1 minuto por slide, sem uma pergunta, sem uma atividade.** Não cabe. E a §5 reserva 28 dos 60 minutos para atividade.

**Resolução, sem descartar nada:**

| Uso | Conteúdo |
|---|---|
| **Sessão do D1** | Subconjunto comprimido, ~15 slides + atividades (§4) |
| **Biblioteca de referência na plataforma** | Os cinco decks completos, disponíveis do D1 ao D15 |

Os decks completos passam a cumprir três funções que estavam em aberto:

- Material de aprofundamento para o aluno que estuda por conta própria
- Material de recuperação conceitual, ao lado do repositório-espelho
- Material de consulta durante o curso inteiro

O material de aprofundamento já existia. Ele só não é a aula.

### 3.1 Realocação obrigatória — os quatro pilares

O deck de OO apresenta **encapsulamento, herança, polimorfismo e abstração** com definição e exemplo.

**Isso entrega a P3 no primeiro dia.** Se no D1 eles ouvem *"polimorfismo é mesma ordem, execuções diferentes"*, no D7 a parede central do curso já está respondida — o aluno não descobre, **lembra**. E lembrar não produz a virada.

**Realocação:** o slide dos quatro pilares sai da abertura e vai para o **fechamento do D11**, depois de eles terem construído os quatro na mão.

> "Vocês passaram sete dias construindo estas quatro coisas. Elas têm nome, e o nome é este."

Mesmo slide, valor invertido. E fica mais forte do que como preview.

**Consequência para o subconjunto do D1:** nenhum slide da sessão de abertura menciona herança, polimorfismo, interface, encapsulamento ou estado inválido.

### 3.2 Liberação da biblioteca

Os quatro decks conceituais ficam disponíveis desde o D1. **O deck comparativo (Aula 02) também**, porque a matriz é referência e não solução.

O slide dos quatro pilares fica **oculto até o D11**, pelo mesmo mecanismo de liberação temporizada do repositório-espelho (Doc 5, §3.2).

---

## 4. Roteiro — 60 minutos

| Bloco | Tempo | O que acontece |
|---|---|---|
| 1 | 6 min | Abertura: "vocês já usaram os quatro" + as duas perguntas organizadoras |
| 2 | 14 min | **O mesmo problema, quatro lentes** |
| 3 | 15 min | **Atividade de classificação**, em duplas |
| 4 | 13 min | **O momento da quebra**: predição e revelação |
| 5 | 8 min | A matriz comparativa + onde cada paradigma é a melhor escolha |
| 6 | 4 min | Fechamento e gancho com o D2 |

Blocos 3 e 4 somam **28 dos 60 minutos**. Quase metade do bloco expositivo não é exposição — é o mínimo aceitável para o D1 não contradizer o método.

---

## 5. Bloco 3 — atividade de classificação

**Formato:** em duplas, na plataforma. 8 trechos, 4 categorias. 10 min de classificação, 5 min de fechamento coletivo.

Todos os trechos vêm do que a turma já escreveu em módulos anteriores. Nenhum é inventado para a aula.

| # | Trecho | Resposta |
|---|---|---|
| 1 | `itens.filter(i => i.ativo).map(i => i.nome)` | Funcional |
| 2 | `for (let i = 0; i < lista.length; i++) { soma += lista[i]; }` | Imperativo |
| 3 | `turma.gerarRelatorio()` | OO |
| 4 | `document.querySelector("#btn").addEventListener("click", salvar)` | Imperativo |
| 5 | `new Date().getFullYear()` | OO |
| 6 | `SELECT nome FROM alunos WHERE nota >= 7` | Declarativo |
| 7 | `<Lista>{aprovados.map(a => <Item data={a} />)}</Lista>` | Declarativo |
| 8 | `alunos.reduce((acc, a) => acc + a.nota, 0)` | Funcional |

**Os dois que geram discussão, de propósito:**

- **#4** — quase todos classificam como OO por causa do ponto. Mas `addEventListener` é uma ordem: *faça isso quando aquilo acontecer*. O objeto é só onde a ordem foi deixada.
- **#5** — quase ninguém classifica como OO. Mas `new Date()` cria um objeto e `.getFullYear()` é uma pergunta feita a ele. É exatamente `turma.gerarRelatorio()`.

**Fechamento:**

> "Nenhum desses trechos foi escrito para esta aula. Vocês escreveram isso nos módulos anteriores. Os quatro paradigmas já estavam lá."

---

## 6. Bloco 4 — o momento da quebra

O bloco mais importante dos 60 minutos, e o único que planta a pergunta condutora. **É o acréscimo que corrige a limitação da §2.3.**

### 6.1 O requisito novo

Depois de as quatro lentes terem resolvido o relatório original:

> **"Agora aprovação depende de nota E frequência. Existe recuperação, que muda o critério. E o aluno em recuperação não entra na média da turma."**

### 6.2 Predição, antes de qualquer código

Pergunta na plataforma, resposta individual e registrada:

> **Na versão imperativa, quantos lugares do código você precisa abrir para atender esse pedido?**
>
> `1` · `2` · `3` · `mais de 3`

O agregado é exibido **antes** da revelação e **depois** de todos apostarem.

### 6.3 A revelação, por camadas

Na versão imperativa, o requisito toca:

1. O laço que soma as notas — recuperação sai da média
2. O `if` de aprovação — agora depende de dois dados
3. Um novo caminho para o critério de recuperação
4. A formatação da saída, que precisa distinguir os três casos

E o critério de aprovação acaba escrito em dois lugares.

Nas outras lentes, o mesmo requisito custa diferente. **É aqui que o relatório escolar deixa de favorecer o funcional:** passar contexto de frequência e regime por toda a cadeia de transformações é caro, e a versão OO para de parecer verbosa.

### 6.4 O gancho — sem entregar nenhuma parede

> "Vocês vão passar três semanas atendendo pedidos que não podiam prever. É isso que está escrito na parede desta sala."

**O que este bloco NÃO faz:** não mostra herança, não mostra `interface`, não nomeia polimorfismo, não fala de estado inválido. Mostra apenas que **o lugar onde o comportamento mora determina o custo da mudança**. As cinco paredes continuam intactas.

---

## 7. Bloco 5 — matriz e escolha

A matriz comparativa dos decks existentes, com as quatro colunas:

| | Imperativo | OO | Funcional | Declarativo |
|---|---|---|---|---|
| **Controle** | Cada passo | Cada objeto | Cada transformação | Só o resultado |
| **Os dados** | Mudam no tempo | Vivem no objeto | Nunca são alterados | Você só descreve |
| **Local da lógica** | Funções e loops soltos | Métodos do objeto | Funções puras encadeadas | Regras declaradas |
| **Rastreabilidade** | Linha a linha | Por objeto | Por função | O sistema decide |
| **Onde já usaram** | JS inicial | DOM, React, `class` | `map`, `filter` | SQL, HTML, CSS, JSX |

E a honestidade intelectual, que é **incortável**:

| Situação | Melhor escolha |
|---|---|
| Transformar uma lista em outra | **Funcional** |
| Cálculo puro, sem estado | **Funcional** |
| Script de 20 linhas que roda uma vez | **Imperativo** |
| Consultar dados, descrever interface | **Declarativo** |
| **Regras de negócio com ciclo de vida e restrições** | **Orientado a objetos** |

> "OO não é melhor. É melhor *para um tipo de problema* — e é justamente o tipo que vocês vão modelar nas próximas três semanas."

Sem isso, o aluno sai achando que aprendeu a forma certa de programar, e passa a escrever classe onde `reduce` resolvia em uma linha.

---

## 8. Bloco 6 — fechamento

> "Amanhã a gente não muda de linguagem. Continua TypeScript. Muda o lugar onde o comportamento mora."

---

## 9. Convenção de defeito proposital

Os decks contêm código deliberadamente incompleto, para que o aluno não copie em automático.

**Problema identificado:** o defeito intencional não está marcado, e os decks também contêm **erros de transcrição da ferramenta de geração** — `"o C# C# rodam"`, `"compartilham compartilham variáveis"`, `HTML / CSS` duplicado, e o texto do esquema mecânico do primeiro slide de OO ilegível.

Defeito deliberado e ruído de ferramenta ficam **indistinguíveis**. O aluno não tem como saber qual é qual, e o que ele conclui é que o material é descuidado. Quem percebe `C# C#` para de confiar no slide.

**Convenção, a mesma do repositório-espelho (Doc 9, §1.2):**

| Regra | Conteúdo |
|---|---|
| Marcação | Tarja fixa `PROPOSITAL` no canto do bloco de código |
| Extensão | Uma linha de texto, no máximo |
| Ausência de marca | Significa que o código está correto |
| Revisão | Passe de revisão de transcrição, independente da convenção |

Sem isso, o mecanismo anti-cópia é lido como erro.

---

## 10. Tipos de slide — SSOT

**Esta seção é a única fonte de verdade deste documento.** O Doc 7 §2.3 referencia estes tipos; a plataforma renderiza, não define.

O padrão estrutural foi extraído dos cinco decks existentes e é consistente em todos:

| Tipo | Função |
|---|---|
| `tese` | A afirmação central, em uma frase. Título + subtítulo |
| `mecanismo` | Como funciona, com analogia |
| `conceitos-2x2` | Os conceitos que sustentam, em grid |
| `ancoragem` | "Você já usa sem saber" — repertório do aluno |
| `codigo-anotado` | Bloco de código com chamadas laterais |
| `forcas-limites` | Pontos fortes e limitações, lado a lado |
| `matriz-comparativa` | Tabela de comparação entre abordagens |
| `predicao` | Pergunta com aposta registrada antes da revelação |
| `classificador` | Cartões atribuídos a categorias |

**Por que é vocabulário fechado e não editor livre:** com tipos fixos, todo material futuro — deste curso e de qualquer outro módulo — herda a mesma qualidade estrutural sem depender de o instrutor reconstruir o padrão a cada vez. É o mesmo princípio de generalização do Doc 7, §1.

**Fronteira com o Doc 7:** a plataforma não gera conteúdo pedagógico e não tem editor de slides (Doc 7 §6, e "fora de escopo" da issue 4 do backlog). O conteúdo entra como markdown; o `tipo` do bloco determina apenas a renderização.

---

## 11. Spec de interatividade

Requisitos para a plataforma. Nenhum exige entidade nova além do `BlocoDeMaterial` do Doc 7 §2.3.

| Elemento | Comportamento |
|---|---|
| **Comparador de quatro lentes** | Os quatro trechos lado a lado, com destaque sincronizado da linha equivalente |
| **Classificador** (§5) | 8 cartões, 4 alvos. Resultado individual só após submissão. Fechamento mostra a distribuição da turma |
| **Enquete de predição** (§6.2) | Escolha única, registrada por aluno, agregado exibido só após liberação do instrutor |
| **Revelação por camadas** (§6.3) | Os 4 pontos de impacto aparecem um a um, sob controle do instrutor |
| **Biblioteca de referência** | Os cinco decks completos, com o slide dos quatro pilares oculto até o D11 |
| **Persistência** | Respostas do classificador e da enquete registradas por aluno — insumo da retrospectiva do D15 |

**Restrição:** nenhum slide avança sozinho. Autoplay em turma presencial dessincroniza a sala.

---

## 12. Critérios de aceite

- [ ] Os 60 minutos somam 60, com blocos 3 e 4 totalizando ≥ 25 min
- [ ] Nenhuma linha de C# aparece no material do D1
- [ ] Todo o código do D1 está em TypeScript, não JavaScript
- [ ] Nenhum dos 8 trechos do classificador é inventado
- [ ] **Nenhum slide da sessão do D1 menciona herança, polimorfismo, interface, encapsulamento ou estado inválido**
- [ ] O slide dos quatro pilares está oculto até o D11
- [ ] O bloco 5 (onde cada paradigma é melhor) não foi cortado por falta de tempo
- [ ] Todo defeito proposital está marcado com a tarja
- [ ] Os erros de transcrição dos decks foram corrigidos
- [ ] Nenhum slide avança automaticamente

---

## 13. Changelog

| Versão | Mudança |
|---|---|
| 1.1 | **Revisão após avaliação do material existente.** Volta a **4 paradigmas** — declarativo tinha sido rebaixado a revelação de fechamento por economia de tempo, o que estava errado: é o paradigma com maior ancoragem nesta turma (HTML, CSS, SQL, JSX). Os cinco decks existentes passam a ser **biblioteca de referência**, e a sessão do D1 usa um subconjunto de ~15 slides. O slide dos quatro pilares de OO é **realocado para o D11**, porque na abertura entregava a P3. Domínio de exemplo passa de carrinho de compras para **relatório escolar**, o dos decks, com um requisito novo acrescentado ao bloco 4 para corrigir o viés pró-funcional do domínio. Convenção `PROPOSITAL` para defeito deliberado (§9). §10 criada como SSOT dos tipos de slide |
| 1.0 | Material especificado. 3 paradigmas, exemplos em TypeScript, 28 dos 60 minutos como atividade, bloco de honestidade sobre os limites de OO tornado incortável |
