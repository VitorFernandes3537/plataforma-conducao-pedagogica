# DOC 2 — CHASSI DE DOMÍNIO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.4 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | — (documento raiz da série) |
| **É consumido por** | Doc 3 (Mapa de Paredes) · Doc 4 (Cronograma) · Doc 5 (Protocolos) · Doc 6 (Avaliação) · Doc 7 (Plataforma) |

> **Nota de versão.** A v1.1 revoga a liberação antecipada do banco de domínios (não há contato com a turma antes do D1), remove o SQLite do escopo técnico, resolve a pendência de Título × Exemplar e renomeia as perguntas do Contrato para **C1–C7**, eliminando a colisão com a numeração das paredes (P1–P5) do Doc 3. Detalhes na seção 9.

---

## 0. Propósito e fronteira

### 0.1 O que este documento responde

- Qual é o esqueleto invariante que todos os projetos do curso compartilham
- Como o aluno instancia esse esqueleto no domínio de negócio que escolher
- Quais domínios são admissíveis e quais estão fora
- Qual é o teto de complexidade permitido
- Como o aluno declara formalmente seu domínio (Contrato de Domínio)

### 0.2 O que este documento NÃO responde

| Pergunta | Documento dono |
|---|---|
| Quais conceitos de POO nascem em cada ponto do esqueleto | Doc 3 |
| Quando cada coisa acontece no calendário | Doc 4 |
| O que acontece com quem não tem o contrato aprovado | Doc 5 |
| Regras de entrega, GitHub e versionamento | Doc 5 |
| Como se avalia a **qualidade** do modelo construído | Doc 6 |
| Como isso vira tela, formulário e registro | Doc 7 |

### 0.3 Fronteira delicada

O Doc 2 define **admissibilidade**: este domínio cabe no chassi? Julgamento feito uma vez, no D3.

O Doc 6 define **qualidade**: este modelo está bem construído? Julgamento contínuo, do D4 ao D15.

Dois julgamentos diferentes sobre o mesmo artefato, em momentos diferentes. Não misturar.

---

## 1. O chassi

### 1.1 Nome e definição

**Chassi: Atendimento Agendado.**

A entidade central é um atendimento marcado para alguém, em algum momento, consumindo algum recurso finito, com alguma grandeza calculada por regra variável.

Todos os projetos do curso compartilham esse esqueleto. O que muda entre eles é exclusivamente o vocabulário do negócio e o conteúdo das regras — nunca a estrutura.

### 1.2 Critérios de admissibilidade

Um domínio só é admissível se satisfizer os **três** critérios. Dois não bastam.

#### Critério 1 — Ciclo de vida

A entidade central muda de estado ao longo do tempo, e nem toda transição entre estados é legal.

*Por que existe:* produz invariantes, encapsulamento e métodos de negócio. Sem ciclo de vida, o projeto vira CRUD e o modelo nasce anêmico.

#### Critério 2 — Escassez e conflito

Existe um recurso finito e contável, disputado entre atendimentos. Dois atendimentos podem ser individualmente válidos e mutuamente impossíveis.

*Por que existe:* produz raciocínio de agregado e validação de coleção — a percepção de que validar objeto por objeto não basta.

#### Critério 3 — Cálculo variável

A mesma grandeza é calculada por fórmulas **estruturalmente diferentes** conforme a categoria do item ou serviço.

A grandeza pode ser preço, prazo, prioridade, validade, multa ou taxa. Cada domínio declara a sua no Contrato.

> **Atenção — o erro mais comum.** Três categorias que usam a mesma fórmula com constantes diferentes (`14 dias`, `7 dias`, `3 dias`) **não** satisfazem este critério. Isso é um campo, não polimorfismo. As fórmulas precisam ter forma diferente, não só valor diferente.

*Por que existe:* produz polimorfismo — a parede central do curso.

### 1.3 Esqueleto invariante — os 4 papéis

```
Cliente  --solicita-->  Atendimento  --contem-->  Item / Servico
                             |
                          consome
                             v
                     Recurso escasso
```

| Papel | Função no chassi | Obrigatório |
|---|---|---|
| **Cliente** | Quem solicita o atendimento | Sim |
| **Atendimento** | Raiz do agregado. Tem estado, ciclo de vida e regras de transição | Sim |
| **Item / Serviço** | O que é feito. Categorizado — a categoria determina o cálculo variável | Sim |
| **Recurso escasso** | O que é disputado. Fonte do conflito impossível | Sim |

Os quatro papéis são **obrigatórios em todos os domínios, sem exceção** (decisão D2-06). O nome de cada papel muda; a existência dele, não.

### 1.4 Orçamento de complexidade

Teto rígido. Domínio que exigir mais é rejeitado ou podado no D3.

| Limite | Valor |
|---|---|
| Classes de domínio | Máximo 5 |
| Máquinas de estado | Exatamente 1 |
| Categorias com cálculo variável | Exatamente 3 |
| Estados na máquina | Entre 3 e 5 |

O orçamento não é sugestão. Existe porque 45 horas efetivas com alunos no primeiro contato com POO não comportam mais, e porque um projeto maior impede que todas as duplas cheguem à mesma parede no mesmo dia.

### 1.5 Escopo técnico

| Item | Decisão |
|---|---|
| Linguagem principal | C# / .NET |
| Linguagem espelho | Python, apenas a hierarquia de cálculo variável, no D14 |
| Interface | Console apenas, do D4 ao D15 |
| Persistência | Lista em memória até a P5. A partir da P5, duas implementações da mesma interface: **memória e arquivo texto** |
| Banco de dados | **Fora de escopo.** Ver 1.6 |
| Autenticação, relatórios, integrações | Fora de escopo em todos os domínios |

### 1.6 Por que não há banco de dados

O SQLite foi **sacrificado deliberadamente**, não por falta de tempo.

O projeto C# será reaproveitado na disciplina seguinte, de Computação em Nuvem: API em C#, frontend construído à mão pelo aluno, banco em nuvem. Gastar um dia com persistência local antecipa mal aquilo que o módulo seguinte fará melhor e com tempo adequado.

A troca **memória → arquivo texto** cumpre integralmente a função pedagógica (provar que o domínio não depende de onde os dados moram), custa cerca de 40 minutos e não introduz nenhuma ferramenta nova. Ver Doc 3, parede P5.

---

## 2. Regras de escolha de domínio

### 2.1 Domínio de demonstração do instrutor

**Biblioteca / Acervo.**

Critérios que o domínio do instrutor precisa satisfazer — diferentes dos do aluno:

| Critério | Razão |
|---|---|
| **Transparência**, não empolgação | A empolgação mora no domínio do aluno. Todo minuto explicando o negócio é um minuto não ensinando POO |
| **Legível em 2 minutos** | Qualquer aluno entende biblioteca sem pesquisa |
| **Estruturalmente não-mapeável** aos domínios dos alunos | Se o mapeamento for 1:1, o aluno renomeia em vez de transferir |

Instanciação do chassi:

| Papel | Biblioteca |
|---|---|
| Cliente | Leitor |
| Atendimento | Empréstimo |
| Item / Serviço | Tipo de acervo |
| Recurso escasso | Exemplar |
| Grandeza variável | Multa por atraso |

**Característica que justifica a escolha:** Biblioteca calcula **três** grandezas variáveis de uma vez — prazo, multa e direito a renovação — todas determinadas pelo tipo de acervo. Uma hierarquia, três comportamentos. É o exemplo mais forte disponível para a parede de polimorfismo.

**Sobre Título × Exemplar.** A distinção entre a obra e o objeto físico na prateleira é uma característica do domínio-espelho, **não uma parede mapeada**. Ela não é universal: existe em Biblioteca, Oficina (veículo do cliente) e Estúdio fotográfico (equipamento), e não existe em Barbearia, Clínica odontológica ou Conserto de celulares. Como parede, quebraria a sincronia garantida pela D2-06. Uso definitivo: ilustração de modelagem durante o preenchimento do Contrato no D3, e aprofundamento opcional para as duplas cujo domínio a possua. *(Resolvido em Doc 3, seção 6.5.)*

### 2.2 Regra de distância

| Regra | Conteúdo |
|---|---|
| **R1** | O domínio Biblioteca/Acervo é proibido para alunos |
| **R2** | Nenhum domínio de aluguel, locação ou empréstimo de bem é admissível (locadora de jogos, aluguel de equipamento, aluguel de traje) |
| **R3** | Nenhum aluno pode escolher domínio do mesmo setor do instrutor |

*Nota:* R2 é a exclusão gerada pela escolha de Biblioteca. Nenhum candidato do banco atual é afetado — o banco é integralmente composto de domínios de atendimento e serviço.

### 2.3 Renomeação obrigatória

> **Cláusula de renomeação.** É obrigatório que todas as entidades do projeto sejam nomeadas no vocabulário do domínio escolhido pela dupla. Nomes genéricos do chassi — `Atendimento`, `Cliente`, `Servico`, `Recurso` — são **rejeitados no código**. A dupla declara a correspondência entre papel do chassi e nome de negócio na Tabela de Tradução do Contrato de Domínio, e o código precisa refletir exatamente essa tabela.

**Razão pedagógica:** a renomeação obrigatória é o mecanismo mais barato existente para impedir cópia-e-rename. Ao tornar a renomeação uma exigência, ela deixa de servir como disfarce. E força o aluno a responder *"o que isso É no meu negócio?"* — a pergunta central do pensamento orientado a objetos.

**Efeito operacional:** a Tabela de Tradução vira o índice de navegação do código de cada aluno na visão de instrutor da plataforma. O instrutor lê a tabela, não o vocabulário inteiro de todos os projetos.

### 2.4 Unicidade e alocação

| Regra | Conteúdo |
|---|---|
| **Unicidade** | Cada domínio pertence a exatamente uma dupla. Sem repetição |
| **Alocação** | Negociação livre entre as duplas |
| **Desempate** | Sorteio |
| **Prazo** | Domínio definido até o D3, junto com a entrega do Contrato |

**Razão da unicidade:** o envelope de mudança de regra do D12 é escrito por domínio. Domínio repetido significa envelope repetido, e risco de vazamento entre duplas no dia mais importante da avaliação.

**Dimensionamento:** turma de aproximadamente 20 alunos presentes, formando 10 a 12 duplas. O banco tem 18 domínios — folga de 6 a 8, suficiente para permitir negociação real em vez de alocação forçada.

**Repositórios:** cada aluno mantém o seu, mesmo que o domínio seja compartilhado com o parceiro de dupla. Regras de entrega e versionamento: Doc 5.

### 2.4.1 Aluno sem par

Turma ímpar, ou aluno cujo parceiro deixou o curso, trabalha **sozinho no próprio domínio**. A dupla não é requisito do chassi — é mecanismo de apoio.

| Regra | Conteúdo |
|---|---|
| Composição | Um grupo tem **1 ou 2 alunos** |
| Aluno solo | Mantém domínio próprio e repositório próprio |
| Compensação | Recebe **scaffolding maior** do instrutor — mais tempo de acompanhamento na escada de suporte |
| Se alguém faltar na formação | É adicionado ao aluno solo, restaurando a dupla |

Consequência para a recuperação: o aluno solo não tem parceiro como fonte, e depende do material e dos colegas (Doc 5, §3.2).

### 2.5 Banco fechado com válvula

O banco de domínios é **fechado**. Uma dupla pode propor domínio próprio sob uma única condição: **apresentar o Contrato de Domínio integralmente preenchido antes de propor**.

**Razão:** o preenchimento é o próprio filtro. Domínio que não cabe no chassi não passa das perguntas C4 e C5 do Contrato. Quem consegue preencher, cabe; quem não consegue, desiste sozinho — e o instrutor não gasta autoridade dizendo não.

Isso preserva a escolha real do aluno (18 opções + porta aberta) sem pagar o preço do caos de escolha ilimitada, que trava aluno iniciante.

---

## 3. Banco de domínios

### 3.1 Trilha Padrão — 15 domínios

Nível de dificuldade reflete a complexidade do recurso escasso e das regras de conflito, **não** a complexidade do negócio.

| # | Domínio | Grandeza variável | Recurso escasso | Nível |
|---|---|---|---|---|
| 1 | Barbearia | Preço por tipo de corte | Barbeiro + cadeira | Fácil |
| 2 | Clínica odontológica | Preço por procedimento | Dentista + consultório | Fácil |
| 3 | Conserto de celulares | Preço por tipo de reparo | Técnico + bancada | Fácil |
| 4 | Estética automotiva | Preço por pacote | Box + lavador | Fácil |
| 5 | Clínica veterinária | Preço por porte e procedimento | Veterinário + sala | Médio |
| 6 | Oficina mecânica | Preço por serviço + peça | Mecânico + elevador | Médio |
| 7 | Estúdio de tatuagem | Preço por tamanho e estilo | Tatuador + maca | Médio |
| 8 | Studio de personal trainer | Preço por modalidade | Treinador + horário | Médio |
| 9 | Escola de música | Preço por instrumento e nível | Professor + sala + instrumento | Médio |
| 10 | Ateliê de costura sob medida | Prazo por complexidade da peça | Costureira + máquina | Médio |
| 11 | Manutenção domiciliar de eletrodomésticos | Preço + deslocamento por região | Técnico + janela de rota | Médio |
| 12 | Estúdio fotográfico | Preço por ensaio e entrega | Fotógrafo + estúdio + equipamento | Difícil |
| 13 | Escolinha esportiva | Mensalidade por turma e faixa etária | Quadra + professor + turma | Difícil |
| 14 | Produtora de eventos | Orçamento por tipo de evento | Equipe + equipamento + data | Difícil |
| 15 | Torneio esportivo | Pontuação por modalidade | Quadra + árbitro | Difícil |

**Uso do nível na alocação:** duplas mais frágeis recebem domínios **Fácil**. Isso não é rebaixamento — é garantir que cheguem à parede de polimorfismo, que é o núcleo do curso. Uma dupla frágil travada na modelagem de "Produtora de eventos" perde o conteúdo principal.

### 3.2 Trilha Desafio — 3 domínios

Opt-in. Disponível apenas para dupla que aceite estudar fora das 3h diárias de aula.

Selecionados por serem **fora da curva** — praticamente nunca aparecem em exercícios de programação, o que elimina qualquer solução pronta disponível e força modelagem real de entidades do mundo.

| Domínio | Cliente | Atendimento | Item / Serviço | Recurso escasso | Grandeza variável |
|---|---|---|---|---|---|
| **Central de Despacho de Emergência** | Solicitante | Chamado | Natureza da ocorrência | Viatura + equipe | Prioridade e tempo-alvo de resposta |
| **Perícia Criminal** | Delegacia / inquérito | Exame pericial | Tipo de perícia | Perito + equipamento | Prazo legal por tipo de exame |
| **Atracação Portuária** | Armador | Atracação | Tipo de carga | Berço + guindaste | Taxa por tonelagem e tempo de berço |

Os três encaixam nos 4 papéis do chassi sem ressalva e sem adaptação.

**Domínios avaliados e rejeitados para esta trilha:**

| Domínio | Motivo da rejeição |
|---|---|
| Torre de Controle de Voos | O papel `Cliente` não existe naturalmente — um voo não é cliente de ninguém. Exigiria ressalva e negociação, consumindo tempo de modelagem |
| Hemocentro | Quebra o chassi em dois pontos: possui dois fluxos concorrentes (doação e transfusão), e compatibilidade sanguínea é tabela de consulta, não polimorfismo |

### 3.3 Apresentação do banco — REVOGA a liberação antecipada

> **Revogação.** A v1.0 previa publicar o banco de domínios antes do D1. **Isso está cancelado.** O instrutor assume a turma no primeiro dia, sem contato prévio: não há canal, não há plataforma acessível e não há como pedir preparação anterior.

Consequências assumidas:

| Consequência | Tratamento |
|---|---|
| A escolha de domínio inteira comprime-se em D1–D3 | Absorvido pelo Doc 4 |
| Não há como pedir instalação de ambiente como tarefa prévia | Setup ocorre no D4, dentro da aula |
| A trilha desafio perde a janela de pesquisa prévia | Mitigado pelos briefings da seção 3.4 |

**Restrição derivada, válida para toda a série:** nenhum artefato deste curso pode pressupor trabalho feito em casa. Parte relevante da turma não tem computador próprio. Estudo fora de sala é ganho para quem puder, nunca carga distribuída.

### 3.4 Briefing dos domínios da trilha desafio

Sem janela de pesquisa prévia, uma dupla que escolha Perícia Criminal ou Atracação Portuária gastaria horário de aula pesquisando o negócio em vez de modelando. A mitigação é eliminar a necessidade de pesquisa.

**Artefato:** uma página por domínio da trilha desafio — três ao todo — entregue no D1 junto com o banco.

Conteúdo obrigatório de cada briefing:

1. O que a organização faz, em um parágrafo
2. Quem solicita e quem executa
3. As etapas pelas quais o atendimento passa, em linguagem de negócio
4. Qual recurso é escasso e por quê
5. Três categorias de item/serviço com tratamento diferente
6. Vocabulário do setor — 8 a 10 termos com tradução

**Critério do briefing:** ao terminar de ler, a dupla precisa conseguir responder as 7 perguntas do Contrato sem consultar nenhuma fonte externa. Se não conseguir, o briefing está incompleto — não a dupla.

---

## 4. Contrato de Domínio

### 4.1 O que é

Documento de 7 perguntas (**C1 a C7**) preenchido pela dupla e aprovado pelo instrutor no **D3 (Marco 1)**. Nenhuma linha de código do projeto é escrita antes da aprovação.

O Contrato acumula três funções simultâneas:

1. **Artefato de análise** — o exercício de modelagem que antecede o código
2. **Gabarito de correção** — é contra ele que o instrutor avalia o projeto durante todo o curso
3. **Lista de casos de teste** — cada resposta vira uma verificação executável
4. **Fonte do envelope de incremento** — o envelope do D12 é derivado de C2, C3 e C5, não escrito do zero (Doc 6, §4.1)

### 4.2 Regras de preenchimento

- Preenchido **em dupla**, entregue uma vez por dupla
- Escrito no vocabulário do negócio, não em vocabulário de programação
- Nenhuma resposta pode ser "depende" ou "a definir"
- Contrato reprovado retorna para correção no mesmo dia; tratamento de reprovação persistente é do Doc 5

### 4.3 As 7 perguntas

---

#### C1 — Qual é o atendimento no seu domínio?

*Descreva em uma frase o evento central que o sistema gerencia.*

**Critério de aceite**
- Nomeia um **evento** com começo, fim e possibilidade de cancelamento
- Não nomeia uma coisa, um cadastro ou um relatório

**Rejeições comuns:** "gerenciar os clientes da barbearia" (cadastro, não evento) · "controlar o estoque de peças" (coisa, não evento)

**Exemplo — Biblioteca**
> Um empréstimo é a retirada de um exemplar por um leitor, com prazo de devolução definido pelo tipo de acervo.

---

#### C2 — Quais são os estados do atendimento?

*Liste de 3 a 5 estados, na ordem em que ocorrem.*

**Critério de aceite**
- Entre 3 e 5 estados
- Exatamente um estado inicial
- Ao menos um estado final
- Nomes no vocabulário do negócio (`Ativo`, `Inativo`, `Status1` são rejeitados)
- Nenhum item da lista é uma **condição derivada**

> **Condição derivada não é estado.** "Atrasado" não é um estado do empréstimo — é uma condição calculada comparando a data atual com a data de devolução. Se dá para descobrir olhando outros dados, não é estado. Estado é o que precisa ser guardado porque não dá para deduzir.

**Exemplo — Biblioteca**
> `Reservado` -> `Emprestado` -> `Devolvido`
> `Cancelado` (a partir de Reservado ou Emprestado)

---

#### C3 — Cite 2 transições ilegais

*Duas mudanças de estado que o sistema precisa impedir, com a razão de negócio de cada uma.*

**Critério de aceite**
- Cada item nomeia estado de origem **e** estado de destino
- Cada item traz a razão de negócio, não a razão técnica
- As duas transições são realmente impossíveis, não apenas incomuns

**Exemplo — Biblioteca**
> 1. `Devolvido` -> `Emprestado`. Um empréstimo encerrado não volta a vigorar. Se o leitor quiser o mesmo exemplar de novo, isso é um empréstimo novo, com prazo novo.
> 2. `Cancelado` -> `Devolvido`. Não se devolve o que nunca foi retirado.

---

#### C4 — Qual é o recurso escasso, e qual conflito é impossível?

*Nomeie o recurso finito disputado, e descreva a situação em que dois atendimentos individualmente válidos não podem coexistir.*

**Critério de aceite**
- O recurso é **contável e finito**
- O conflito é **verificável** comparando dois atendimentos
- O conflito não depende de informação externa ao sistema

**Rejeições comuns:** "o tempo do funcionário" sem quantificar · "a paciência do cliente" (não contável)

**Exemplo — Biblioteca**
> Recurso: o **exemplar** (não o título — a biblioteca pode ter 4 exemplares da mesma obra).
> Conflito impossível: dois empréstimos ativos do mesmo exemplar no mesmo período.

---

#### C5 — Qual é a grandeza variável, e quais são as 3 categorias que a calculam de formas diferentes?

*Nomeie uma grandeza (preço, prazo, prioridade, multa, taxa, validade) e as 3 categorias de item/serviço, com a fórmula de cada uma.*

**Critério de aceite** — o mais rigoroso do Contrato
- Uma grandeza, exatamente 3 categorias
- As 3 fórmulas têm **forma estruturalmente diferente**, não apenas constantes diferentes
- Cada fórmula é escrita de modo que alguém consiga calculá-la à mão

> **Rejeição automática.** `14 dias` / `7 dias` / `3 dias` é a mesma fórmula com três valores. Isso é um campo, não polimorfismo, e não sustenta a parede central do curso. A dupla refaz a C5 até que as três fórmulas difiram em **estrutura**.

**Exemplo — Biblioteca**
> Grandeza: **multa por atraso**.
> - **Acervo geral:** R$ 0,50 por dia de atraso, sem teto.
> - **Periódico:** R$ 2,00 por dia, e o valor dobra a cada 7 dias completos de atraso.
> - **Multimídia:** sem multa diária. Passados 15 dias, cobra-se o valor de reposição do item e o leitor é bloqueado até quitação.

---

#### C6 — Qual dado é imutável após a criação do atendimento?

*Nomeie ao menos um dado que, uma vez registrado, nunca pode ser alterado — e explique por quê.*

**Critério de aceite**
- Ao menos um dado nomeado
- A justificativa é de negócio, não de banco de dados
- O dado é realmente imutável, não apenas "raramente alterado"

**Exemplo — Biblioteca**
> O **exemplar** e a **data de retirada**. Trocar o exemplar de um empréstimo em curso não é correção — é encerrar um empréstimo e abrir outro. Alterar a data de retirada falsificaria o cálculo de multa.

---

#### C7 — O que este sistema NÃO vai fazer?

*Liste no mínimo 3 funcionalidades que alguém poderia razoavelmente esperar deste sistema e que estão declaradamente fora de escopo.*

**Critério de aceite**
- Mínimo 3 itens
- Cada item é algo que alguém **plausivelmente pediria** — não absurdos como "não vai pilotar um avião"
- Nenhum item contradiz os 4 papéis obrigatórios do chassi

**Função desta pergunta:** encerra a discussão de escopo antes que ela comece. Dá ao instrutor um argumento pré-acordado quando a dupla quiser inflar o projeto, e treina negociação de escopo — habilidade que a turma estudou em metodologias ágeis e nunca praticou.

**Exemplo — Biblioteca**
> 1. Não gerencia aquisição ou compra de acervo.
> 2. Não faz cadastro de leitor com foto, documento ou carteirinha.
> 3. Não controla reserva de sala de estudo nem de computador.

---

### 4.4 Tabela de Tradução

Preenchida junto com as 7 perguntas. Vira o índice de navegação do código da dupla.

| Papel do chassi | Nome no domínio | Nome da classe no código |
|---|---|---|
| Cliente | | |
| Atendimento | | |
| Item / Serviço | | |
| Recurso escasso | | |

**Exemplo — Biblioteca**

| Papel do chassi | Nome no domínio | Nome da classe no código |
|---|---|---|
| Cliente | Leitor | `Leitor` |
| Atendimento | Empréstimo | `Emprestimo` |
| Item / Serviço | Tipo de acervo | `TipoDeAcervo` |
| Recurso escasso | Exemplar | `Exemplar` |

### 4.5 Critério de aprovação no D3

O Contrato é aprovado quando **todos** os itens abaixo são verdadeiros:

- [ ] As 7 perguntas estão respondidas
- [ ] Cada resposta satisfaz seu critério de aceite
- [ ] A Tabela de Tradução está completa e sem nomes genéricos
- [ ] O orçamento de complexidade é respeitado (5 / 1 / 3, estados entre 3 e 5)
- [ ] O domínio é único na turma
- [ ] O domínio não viola a regra de distância

Reprovação e recuperação: **Doc 5**.

### 4.5.1 Edição do Contrato após a aprovação

O Contrato aprovado é **editável pelo instrutor**, em um único caso: **poda de escopo por rebaixamento de trilha** (Doc 5, §5.3).

Nesse caso o instrutor reduz o escopo declarado — menos estados, conflito mais simples, fórmulas mais diretas — mantendo o mesmo domínio. O Contrato editado passa a ser o gabarito de correção e a base do envelope de incremento a partir daquele momento.

Fora dessa hipótese, o Contrato aprovado é imutável. A dupla não o altera em nenhuma circunstância.

### 4.6 Validação automática × validação humana

Referência para o Doc 7. Nem todo critério de aceite pode ser verificado por software.

| Verificação | Automática | Humana |
|---|---|---|
| 7 perguntas respondidas, sem campo vazio | Sim | |
| Entre 3 e 5 estados declarados | Sim | |
| Exatamente 3 categorias na C5 | Sim | |
| Mínimo 3 itens na C7 | Sim | |
| Transições ilegais referenciam estados declarados na C2 | Sim | |
| Tabela de Tradução sem nomes genéricos (lista negra) | Sim | |
| Unicidade do domínio na turma | Sim | |
| A C1 descreve um evento e não um cadastro | | Sim |
| As 3 fórmulas diferem em **estrutura** | | Sim |
| O recurso declarado é realmente finito e contável | | Sim |
| A imutabilidade da C6 é de negócio, não técnica | | Sim |

A validação automática funciona como pré-filtro: o Contrato só chega ao instrutor depois de passar por ela. Isso preserva o tempo de instrutor para os 4 julgamentos que exigem leitura.

---

## 5. Registro de decisões

| ID | Decisão | Resolução |
|---|---|---|
| **D2-01** | Domínio de demonstração do instrutor | Biblioteca / Acervo |
| **D2-02** | Banco fechado ou aberto | Fechado, com válvula: proposta própria exige Contrato preenchido antes |
| **D2-03** | Renomear entidades ou manter genérico | Renomeação obrigatória, com Tabela de Tradução |
| **D2-04** | Domínios repetidos entre duplas | Unicidade obrigatória. Alocação por negociação, sorteio como desempate |
| **D2-05** | Campo "fora de escopo" no Contrato | Sim, obrigatório, mínimo 3 itens. Contrato vai a 7 perguntas |
| **D2-06** | Chassi obrigatório integral ou parcial | Integral, sem exceção. Flexível apenas no número de estados (3–5) e no conteúdo das 3 regras |

---

## 6. SSOT — fonte de verdade única

Fatos de propriedade deste documento. Nenhum outro documento os redefine; todos os referenciam por ID.

| ID | Conteúdo |
|---|---|
| `D2-CHASSI` | Esqueleto invariante, 4 papéis, 3 critérios de admissibilidade |
| `D2-CONTRATO` | As 7 perguntas C1–C7, critérios de aceite, Tabela de Tradução |
| `D2-BANCO` | Os 18 domínios, níveis de dificuldade, trilhas |
| `D2-ORCAMENTO` | 5 classes / 1 máquina de estados / 3 categorias / 3–5 estados |
| `D2-DISTANCIA` | Regras R1, R2, R3 |
| `D2-NOMES` | Cláusula de renomeação obrigatória |
| `D2-TRILHAS` | Definição de trilha padrão e trilha desafio |
| `D2-BRIEFING` | Estrutura obrigatória do briefing de domínio desafio |
| `D2-SEM-PREVIO` | Restrição: nenhum artefato pressupõe trabalho prévio ou em casa |

Referenciado aqui, mas de propriedade de outro documento:

| Fato | Dono |
|---|---|
| Data de aprovação do Contrato (D3 / Marco 1) | Doc 4 |
| Paredes, escopo conceitual e critérios de superação | Doc 3 |
| Reprovação, recuperação, rebaixamento de trilha, regras de GitHub | Doc 5 |
| Critérios de qualidade da modelagem | Doc 6 |
| Formulário, validação e telas | Doc 7 |

---

## 7. Notas cross-doc abertas

| Destino | Nota |
|---|---|
| **Doc 4** | Escolha de domínio, apresentação do banco e entrega dos 3 briefings comprimem-se em D1–D3 |
| **Doc 4** | Setup de ambiente ocorre dentro do D4; não há como pedir instalação prévia |
| **Doc 4** | Nenhum item do cronograma pode pressupor trabalho em casa |
| **Doc 5** | Regras de GitHub (repositório público individual, push diário, estrutura) precisam de dono formal |
| **Doc 5** | Critério de rebaixamento: dupla da trilha desafio que travar volta à trilha padrão sem perder marco |
| **Doc 6** | O Contrato é o gabarito de correção. Os critérios de qualidade precisam mapear para C1–C7 |
| **Doc 7** | Tabela de Tradução vira índice de navegação por aluno na visão de instrutor |
| **Doc 7** | Validação do Contrato é feature da plataforma (ver 4.6), não correção manual |
| **Doc 7** | "Banco de domínios" é entidade **genérica** da plataforma, reutilizável para qualquer tema. Não pode ser hardcode de POO/C# |

*Notas resolvidas e encerradas:* posição de Título × Exemplar no mapa (resolvida em Doc 3, seção 6.5) · renomeação da parede de precificação para cálculo variável (aplicada em Doc 3) · introdução de máquina de estados (resolvida em Doc 3, decisão D3-04).

---

## 8. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Documento fechado. Decisões D2-01 a D2-06 resolvidas. Critério 3 do chassi renomeado de "precificação variável" para "cálculo variável". Torre de Controle de Voos e Hemocentro avaliados e rejeitados. Contrato de Domínio redigido na íntegra |
| 1.1 | Ver seção 9 |
| 1.2 | Contrato de Domínio recebe uma quarta função: fonte de derivação do envelope de incremento (§4.1). Nota vinda do Doc 6 |
| 1.3 | Cláusula de edição do Contrato após aprovação, restrita à poda por rebaixamento de trilha (§4.5.1). Nota pendente do Doc 5, §5.3 |
| 1.4 | Correção: §2.4 dizia "envelope do D11", contradizendo o Doc 4 e o próprio §4.1 — agora D12. Regra de aluno sem par adicionada (§2.4.1): grupo aceita 1 ou 2 alunos |

---

## 9. Detalhamento da v1.1

| # | Mudança | Seção | Motivo |
|---|---|---|---|
| 1 | **Liberação antecipada do banco revogada** | 3.3 | O instrutor assume a turma no D1 sem contato prévio. Não há canal para publicar nada antes |
| 2 | **Briefing de domínio desafio criado** | 3.4 | Sem janela de pesquisa prévia, os 3 domínios fora da curva consumiriam horário de aula em pesquisa. O briefing elimina a necessidade |
| 3 | **Restrição "sem trabalho em casa" formalizada** | 3.3 | Parte relevante da turma não tem computador próprio. Vira restrição dura de toda a série |
| 4 | **SQLite removido do escopo técnico** | 1.5, 1.6 | Sacrificado deliberadamente em favor da continuidade com a disciplina de Computação em Nuvem. Persistência passa a ser memória → arquivo texto |
| 5 | **Título × Exemplar resolvido** | 2.1 | Não é parede: a distinção não é universal e quebraria a sincronia da D2-06. Vira ilustração do domínio-espelho |
| 6 | **Perguntas do Contrato renomeadas para C1–C7** | 4.3 e todas as referências | Eliminação da colisão com a numeração das paredes P1–P5 do Doc 3. O Doc 3 foi corrigido na mesma emissão |
| 7 | **Regra de repositório individual registrada** | 2.4 | Cada aluno mantém o próprio repositório, mesmo com domínio compartilhado. Dono formal das regras de entrega: Doc 5 |
| 8 | **Python removido do título** | cabeçalho | Python permanece apenas como espelho comparativo no D14; não é linguagem do curso |
