# DOC 3 — MAPA DE PAREDES

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.2 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | Doc 2 (Chassi de Domínio) |
| **É consumido por** | Doc 4 (Cronograma), Doc 5 (Protocolos), Doc 6 (Avaliação), Doc 7 (Plataforma) |

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- Quais são as paredes, em que ordem e com que dependência entre si
- O que exatamente o aluno erra em cada uma
- Qual conceito nasce de cada erro
- O que fica **fora** de cada parede
- Como se sabe que a parede foi superada

### 0.2 O que este documento NÃO responde

| Pergunta | Documento dono |
|---|---|
| Em que dia cada parede acontece | Doc 4 |
| Como o instrutor conduz o aluno até bater | Doc 5 |
| Quanto vale cada parede na nota | Doc 6 |
| Como isso vira checklist e tela | Doc 7 |

### 0.3 Fronteira delicada

O Doc 3 define o **critério de superação**: a parede foi vencida? Binário, verificável no console, em segundos.

O Doc 6 define **qualidade**: foi vencida bem? Gradual, exige leitura de código.

Um aluno pode superar todas as paredes com código feio. Isso é aprovação no Doc 3 e nota média no Doc 6. São instrumentos diferentes.

---

## 1. Princípio de operação

### 1.1 Dor antes do modelo

A ordem é fixa e não se inverte em nenhuma parede:

```
1. A dupla tenta e falha           (~40 min)
2. O instrutor codifica ao vivo     no domínio-espelho
3. A dupla resolve                  no domínio dela
```

Inverter os passos 1 e 2 transforma transferência cognitiva em transcrição com renomeação. O aluno troca `Exemplar` por `Cadeira` e sente que entendeu.

**Time-box da tentativa: 40 minutos.** Antes disso o instrutor não demonstra, mesmo que a sala inteira esteja travada. Travar é o produto do exercício.

### 1.2 Sincronia

Todas as duplas batem na mesma parede no mesmo dia. Isso é garantido por três mecanismos, todos definidos no Doc 2:

- Chassi obrigatório integral (D2-06) — todo domínio tem os 4 papéis
- Orçamento de complexidade — nenhum projeto é grande demais para acompanhar
- Contrato de Domínio aprovado antes do código — nenhum domínio incompatível entra

Dupla que avança sozinha quebra a sincronia. Por isso não existe "adiantar parede" — existe **extensão** (seção 5).

### 1.3 Restrição de tempo

Toda parede, extensão e critério de superação cabe integralmente **dentro das 3h de aula presencial**.

Aplicação de `D2-SEM-PREVIO` (Doc 2, §3.3), que é o dono desta restrição.

### 1.4 Registro em GitHub

Todo o trabalho de toda parede é versionado em repositório público, com push diário. O repositório é individual (cada aluno o seu, mesmo domínio da dupla).

Consequência para este documento: todo **critério de superação** precisa ser verificável a partir do repositório, não apenas na máquina do aluno.

---

## 2. Esquema de uma parede

Nove campos. Nenhum deles menciona linguagem, paradigma ou tecnologia — é o esquema reaproveitável para qualquer módulo.

| Campo | Conteúdo | Por que existe |
|---|---|---|
| **Pergunta do aluno** | A parede enunciada como problema dele, não como aula numerada | É o que vai no mural e na plataforma. Separa PBL de currículo |
| **Sintoma observável** | Como o instrutor identifica que a dupla bateu | 10 duplas, 3h: o diagnóstico precisa levar 30 segundos |
| **Erro previsto** | O que o aluno faz de errado, escrito com antecedência | O que não foi previsto vira improviso |
| **Conceito que nasce** | O que se ensina depois da dor | — |
| **Escopo fora** | O que explicitamente **não** se ensina aqui | Impede que a aula cresça no calor do momento |
| **Critério de superação** | Comportamento verificável, binário | Vira checklist na plataforma e insumo do Doc 6 |
| **Extensão** | Tarefa de aprofundamento para dupla rápida | Preserva a sincronia (seção 1.2) |
| **No domínio-espelho** | Como a parede aparece em Biblioteca | Roteiro do live coding do instrutor |
| **Dia previsto** | Referência ao Doc 4 | Apenas referência — o dono do calendário é o Doc 4 |

---

## 3. As 5 paredes

### P1 — *Por que meu programa aceita um estado que não existe?*

**Sintoma observável**
O aluno declarou `public string Status` e `public double Valor`. No console, consegue atribuir `"conclído"` com erro de digitação, ou um valor negativo, e o programa segue rodando sem reclamar.

**Erro previsto**
- Campos públicos, tudo primitivo
- Validação espalhada no `Main`, ou nenhuma validação
- Objeto criado vazio e preenchido campo a campo depois
- Condição derivada guardada como campo que ninguém atualiza

**Conceito que nasce**
- Encapsulamento: o objeto protege o próprio estado
- `enum` como tipo fechado de valores possíveis
- Propriedade com `get` público e `set` privado
- Construtor que exige os dados obrigatórios — objeto nasce válido
- Propriedade computada para valor derivado

**Escopo fora**
Exceções customizadas · `record` · `struct` · genéricos · `static` (ativamente desencorajado — iniciante usa `static` para fugir de instanciação, e isso mata a parede inteira)

**Critério de superação**
1. Não existe caminho no código que atribua um estado fora do `enum`
2. Criar o atendimento sem os dados obrigatórios **não compila**
3. A condição derivada declarada na C2 do Contrato é propriedade computada, não campo armazenado

**Extensão**
Substituir um primitivo por um tipo próprio (`Dinheiro`, `Prazo`, `Telefone`) que recusa valor inválido no construtor.

**No domínio-espelho**
`Emprestimo` com `string status` aceita `"emprestado"`, `"Emprestado"` e `"emprestad"` — três empréstimos no mesmo estado real, com três valores diferentes, e nenhuma consulta funciona. `Atrasado` guardado como `bool` que ninguém atualiza e que mente no dia seguinte.

**Dia previsto** — D4

---

### P2 — *Por que consigo cancelar algo que já terminou?*

**Sintoma observável**
Existe atribuição direta ao estado a partir de qualquer ponto do menu. A dupla executa `Cancelar` sobre um atendimento já concluído e o sistema aceita.

**Erro previsto**
- `set` público no enum de estado
- Validação da transição feita no menu, não dentro da classe
- A mesma regra de transição duplicada em dois pontos do menu, e só um deles corrigido
- Nenhum estado final — tudo pode virar tudo

**Conceito que nasce**
- Invariante de classe: regras que valem sempre, garantidas pelo objeto
- `private set` — o caminho ilegal deixa de ser possível de escrever
- Método de negócio nomeado no vocabulário do domínio (`Devolver()`, `Cancelar()`) no lugar do setter
- A máquina de estados morando **dentro** da entidade
- Sinalizar violação com `throw new InvalidOperationException` e mensagem de negócio

**Escopo fora**
Hierarquia de exceções customizadas · padrão State · biblioteca de máquina de estados · eventos de domínio

**Critério de superação**
1. O estado não tem setter público
2. Cada transição legal é um método com nome de negócio
3. As 2 transições ilegais declaradas na C3 do Contrato lançam exceção, demonstrável no console
4. A regra de cada transição existe em exatamente um lugar do código

**Extensão**
Adicionar um estado novo à máquina e listar todos os pontos do código que precisaram mudar. A lista vira insumo direto da discussão da P3.

**No domínio-espelho**
`Devolver()` chamado sobre um empréstimo já `Devolvido`. `Cancelar()` sobre um empréstimo já devolvido — o exemplar volta ao acervo duas vezes e o acervo passa a ter mais exemplares do que existem fisicamente.

**Dia previsto** — D5 e D6

---

### P3 — *Por que meu `if` não para de crescer?*

**Sintoma observável**
Encadeamento de `if`/`switch` sobre a categoria dentro do método de cálculo. E o mesmo encadeamento repetido num segundo método, com uma das pontas já desatualizada.

**Erro previsto**
- `enum` de categoria + `switch` no cálculo
- Lógica de cálculo fora das classes que a possuem
- Ao adicionar a terceira categoria, o aluno copia o bloco e ajusta os números
- A categoria tratada como dado (um campo) em vez de comportamento

**Conceito que nasce**
- Classe abstrata e método abstrato
- Polimorfismo: cada categoria responde à mesma mensagem de forma própria
- Coleção declarada no tipo base
- A percepção central: **a categoria deixa de ser um dado e vira um comportamento**

**Escopo fora**
`interface` (nasce na P5, onde tem motivo real) · genéricos · padrão Strategy explícito · composição vs herança — *menciona-se como critério de escolha, não se cobra*

**Critério de superação**
1. Não existe `if` nem `switch` sobre categoria em nenhum ponto do cálculo
2. As 3 fórmulas declaradas na C5 do Contrato vivem cada uma em sua própria classe
3. Adicionar uma 4ª categoria não exige alterar nenhuma classe existente — verificado ao vivo pelo instrutor

**Extensão**
Implementar a 4ª categoria sem tocar em nada existente. É a parede de aberto/fechado (P8, cortada) entrando pela porta dos fundos, disponível apenas para quem já venceu a P3.

**No domínio-espelho**
Multa por atraso: acervo geral cobra por dia; periódico cobra por dia e dobra a cada 7 dias; multimídia não cobra multa e sim valor de reposição após 15 dias, com bloqueio do leitor. **Três fórmulas de forma diferente, não três constantes.**

**Dia previsto** — D7 e D8

---

### P4 — *Os dois estão certos. Por que juntos estão errados?*

**Sintoma observável**
A dupla cria dois atendimentos individualmente válidos que consomem o mesmo recurso escasso no mesmo período. O sistema aceita os dois.

**Erro previsto**
- Validar dentro do construtor do atendimento — que não conhece os outros atendimentos
- Validar no menu, uma vez, e esquecer o segundo caminho de criação
- Tratar a lista como depósito passivo
- Comparar apenas igualdade de horário, ignorando sobreposição parcial de períodos

**Conceito que nasce**
- Agregado e raiz de agregado
- De quem é a responsabilidade por uma regra que envolve mais de um objeto
- Validação de coleção: a lista deixa de ser depósito e vira guardiã
- Sobreposição de intervalos como problema de modelagem

**Escopo fora**
Repositório e persistência (P5) · banco de dados · concorrência real · transação · índices

**Ferramenta liberada nesta parede**
LINQ, restrito a `Any`, `Where` e `Count`. É onde validação de coleção acontece; escrever o laço à mão aqui custa 40 minutos e não ensina nada de POO.

**Critério de superação**
1. O conflito declarado na C4 do Contrato é impedido
2. A regra mora em um único lugar, que enxerga a coleção inteira
3. Existe pelo menos um caso demonstrável no console em que a criação é recusada com mensagem de negócio

**Extensão**
Fazer o sistema **sugerir** o próximo horário ou recurso livre, em vez de apenas recusar.

**No domínio-espelho**
Dois empréstimos ativos do mesmo exemplar. Cada um válido isoladamente: leitor existe, exemplar existe, prazo correto. Juntos, impossíveis — o livro é um só.

**Dia previsto** — D9

---

### P5 — *Por que mudar onde os dados moram quebrou minha regra de negócio?*

**Sintoma observável**
Para trocar a lista em memória por gravação em arquivo, a dupla precisa editar as classes de domínio. Um pedido de mudança de infraestrutura obriga a mexer em regra de negócio.

**Erro previsto**
- `Console.WriteLine` dentro das entidades de domínio
- A lista de atendimentos como campo `static` acessado de todo lugar
- Leitura e escrita de arquivo dentro do método de negócio
- Classe única que valida, calcula, imprime e grava

**Conceito que nasce**
- Responsabilidade única (SRP)
- Separação em três camadas: domínio × apresentação × persistência
- `interface` como contrato — aqui ela tem motivo real, e é a primeira vez no curso
- Duas implementações da mesma interface
- Inversão de dependência: o domínio define o contrato, a infraestrutura obedece

**Escopo fora**
Injeção de dependência por container · ORM · SQLite e qualquer banco (ver seção 6) · Unit of Work · genéricos · testes automatizados

**Critério de superação**
1. Nenhuma classe de domínio menciona `Console` nem arquivo
2. Existe uma interface de repositório com **duas** implementações: em memória e em arquivo texto
3. A troca entre as duas acontece alterando **uma única linha**, demonstrada ao vivo

**Extensão**
Escrever uma terceira implementação — CSV, ou uma que falhe de propósito — e demonstrar que o domínio não quebra em nenhum dos casos.

**No domínio-espelho**
`IRepositorioDeEmprestimos` com `EmprestimosEmMemoria` e `EmprestimosEmArquivo`. A regra de multa não sabe, e não pode saber, onde os empréstimos estão guardados.

**Gancho para o módulo seguinte**
Esta interface é o ponto de continuidade com a disciplina de Computação em Nuvem: a primeira aula daquele módulo é *"escreva a terceira implementação da interface que você já tem"* — desta vez contra banco em nuvem, com API em C# e frontend consumindo.

**Dia previsto** — D10, com a prova de troca no D11

---

## 4. Escopo conceitual — o que fica fora

Decisões travadas. Cada linha é uma frase que o instrutor vai dizer em sala; escritas agora, não se negocia no calor.

| Tema | Decisão | Razão |
|---|---|---|
| **Exceções** | Dentro da P2, limitado a `InvalidOperationException` com mensagem de negócio | Não existe impor invariante sem sinalizar violação. Hierarquia customizada é ruído |
| **`interface` vs `abstract class`** | P3 usa apenas `abstract class`. `interface` nasce na P5 | Ensinar as duas juntas é a origem clássica do "qual eu uso?". Na P5 a interface tem motivo real: trocar implementação |
| **Genéricos** | Fora. Consumo de `List<T>` sim; criação de tipo genérico não | Senão alguém tenta escrever `Repositorio<T>` na P5 e perde dois dias |
| **LINQ** | Dentro da P4, limitado a `Any`, `Where`, `Count` | É onde validação de coleção acontece. Laço manual não ensina POO e custa 40 min |
| **Composição vs herança** | Mencionar na P3 como critério, não cobrar | Com 5 classes a discussão é acadêmica. Cobrar de quem escreveu a primeira classe há 3 dias é crueldade |
| **`record`, `struct`, propriedade computada** | Fora, exceto propriedade computada na P1 | Propriedade computada resolve a condição derivada. O resto é sintaxe sem parede |
| **`static`** | Fora, e ativamente desencorajado | Iniciante usa `static` para fugir de instanciação, e isso destrói a P1 |

---

## 5. Extensões

Destinadas à dupla que vence a parede antes do tempo. **Aprofundam a mesma parede; nunca avançam para a próxima** — avançar quebra a sincronia da seção 1.2.

| Parede | Extensão |
|---|---|
| P1 | Substituir um primitivo por tipo próprio que recusa valor inválido no construtor |
| P2 | Adicionar um estado à máquina e listar tudo que precisou mudar |
| P3 | Implementar a 4ª categoria sem tocar em nenhuma classe existente |
| P4 | Sugerir o próximo horário ou recurso livre, em vez de apenas recusar |
| P5 | Escrever uma terceira implementação da interface de repositório |

**Segunda opção: monitoria rotativa.** A dupla que venceu apoia outra, dentro da escada de suporte definida no Doc 5. A rotatividade é obrigatória — se virar rotina fixa, o aluno forte para de codar e vira professor não remunerado.

**Nota operacional:** esta turma provavelmente não terá duplas rápidas. As extensões existem para que a decisão não precise ser tomada em cima da hora, caso tenha.

---

## 6. Cortes e revogações

### 6.1 P7 — Testabilidade

**Cortada.** Testes automatizados exigem que a separação da P5 já esteja consolidada, o que não acontece antes do D12. Ensinar teste em cima de arquitetura fresca produz teste decorado, não disciplina de teste.

### 6.2 P8 — Aberto/fechado

**Cortada como parede, preservada como extensão.** O conteúdo sobrevive integralmente na extensão da P3 ("adicione a 4ª categoria sem tocar em nada"), disponível para quem tiver folga.

### 6.3 P6 — Troca de persistência

**Fundida na P5.** Separação de responsabilidades e troca de persistência são a mesma lição — o domínio não deve saber onde os dados moram. Manter duas paredes duplicava o conceito e consumia um dia que não existe.

### 6.4 SQLite

**Sacrificado deliberadamente**, e não por falta de tempo.

O projeto será reaproveitado no módulo seguinte, de Computação em Nuvem: API em C#, frontend construído à mão, banco em nuvem. Gastar o D13 com ADO.NET local antecipa mal aquilo que o módulo seguinte fará melhor e com mais tempo.

A prova da P5 passa a ser a troca **memória → arquivo texto**: mesma lição, nenhuma ferramenta nova, cerca de 40 minutos, e prepara melhor o gancho da nuvem.

### 6.5 Título × Exemplar — revogação de nota do Doc 2

O Doc 2 (seção 2.1) solicitou posição no mapa para a distinção Título × Exemplar. **Solicitação revogada.**

Motivo: a distinção não é universal. Existe em Biblioteca, Oficina (veículo do cliente) e Estúdio fotográfico (equipamento); não existe em Barbearia, Clínica odontológica ou Conserto de celulares. Como parede mapeada, quebraria a garantia de sincronia da D2-06 — metade da turma bateria e metade assistiria.

**Status final:** característica do domínio-espelho, usada como ilustração de modelagem durante o preenchimento do Contrato no D3, e disponível como aprofundamento opcional para as duplas cujo domínio a possua.

---

## 7. Registro de decisões

| ID | Decisão | Resolução |
|---|---|---|
| **D3-01** | Título × Exemplar entra no mapa? | Não. Característica do domínio-espelho (ver 6.5) |
| **D3-02** | Esquema de uma entrada de parede | 9 campos, sem menção a linguagem ou tecnologia |
| **D3-03** | Escopo conceitual — o que fica fora | 7 decisões travadas (seção 4) |
| **D3-04** | Máquina de estados sem violar "dor antes do modelo" | Contrato quebrado de domínio fictício no D2, 45 min, defeitos plantados |
| **D3-05** | Dupla rápida | Extensão pré-escrita por parede; monitoria rotativa como segunda opção |
| **D3-06** | P6 parede ou demonstração | Fundida na P5. SQLite sacrificado; prova passa a ser memória → arquivo |
| **D3-07** | Nome voltado ao aluno | Cada parede é uma pergunta. É a pergunta que vai ao mural e à plataforma |

---

## 8. SSOT — fonte de verdade única

| ID | Conteúdo |
|---|---|
| `D3-MAPA` | As 5 paredes, ordem e dependência |
| `D3-ESQUEMA` | Os 9 campos de uma entrada de parede |
| `D3-ESCOPO` | O que fica dentro e fora de cada parede (seção 4) |
| `D3-SUPERACAO` | Os critérios de superação, binários e verificáveis |
| `D3-EXTENSOES` | As 5 extensões |
| `D3-CORTES` | P7, P8, P6, SQLite e Título × Exemplar: o que saiu e por quê |
| `D3-ORDEM` | O princípio dor → demonstração → resolução, e o time-box de 40 min |

Referenciado aqui, dono é outro:

| Fato | Dono |
|---|---|
| Dias e ritmo diário | Doc 4 |
| Escada de suporte e condução até a parede | Doc 5 |
| Peso de cada parede na avaliação | Doc 6 |
| Checklist, mural e visibilidade | Doc 7 |

---

## 9. Notas cross-doc geradas por este documento

| Destino | Nota |
|---|---|
| **Doc 2** | **Requer v1.1.** A seção 3.3 (liberação antecipada do banco antes do D1) está revogada — não há contato com a turma antes do primeiro dia. A escolha de domínio inteira passa a caber em D1–D3, e a trilha desafio fica mais arriscada: quem pegar Perícia Criminal ou Atracação Portuária pesquisa em horário de aula |
| **Doc 2** | Nota de Título × Exemplar revogada (ver 6.5) |
| **Doc 4** | Time-box de parede: 40 min de tentativa antes de qualquer demonstração |
| **Doc 4** | O D2 ganha 45 min do exercício de contrato quebrado (D3-04). Verificar o que sai do D2 para compensar |
| **Doc 4** | A P5 tem prova em dois momentos: construção no D10, troca demonstrada no D11 |
| **Doc 4** | Ritual diário de push no GitHub precisa de janela fixa no ritmo das 3h |
| **Doc 4** | **Restrição dura:** nenhuma parede, extensão ou critério pode pressupor trabalho em casa |
| **Doc 5** | Precisa de critério de contagem para gatilhos de decisão e de protocolo de rebaixamento da trilha desafio |
| **Doc 6** | Os critérios de superação são binários e pertencem ao Doc 3. Qualidade é instrumento separado |
| **Doc 6** | Cada critério de superação precisa ser verificável a partir do repositório público, não só na máquina do aluno |
| **Doc 7** | O mural do "Precisamos Saber" é organizado por **pergunta**, não por número de parede |
| **Doc 7** | Checklist de superação por parede, por dupla, com os critérios binários desta doc |
| **Doc 7** | Visibilidade de qual dupla pegou extensão e qual está em monitoria |
| **Módulo seguinte (Nuvem)** | A interface de repositório da P5 é o gancho de continuidade: primeira aula é a terceira implementação, contra banco em nuvem |

---

## 10. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Documento fechado. Decisões D3-01 a D3-07 resolvidas. Mapa reduzido de 8 para 5 paredes: P6 fundida na P5, P7 cortada, P8 preservada como extensão da P3. SQLite sacrificado em favor de continuidade com o módulo de nuvem; prova da P5 passa a ser memória → arquivo. Nota de Título × Exemplar do Doc 2 revogada. Linguagem principal confirmada como C#, com Python mantido como espelho no D14 |
| 1.1 | Referências ao Contrato de Domínio renumeradas de P para **C1–C7**, eliminando a colisão com a numeração das paredes P1–P5. Emitida junto com a v1.1 do Doc 2. Nenhuma mudança de conteúdo pedagógico |
| 1.2 | Correção: dia previsto da prova da P5 era "D12 ou D13", contradizendo o Doc 4 — agora D11. §1.3 deixa de repetir a restrição de trabalho em casa e passa a referenciar `D2-SEM-PREVIO` |
