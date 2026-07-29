# DOC 1 — MÉTODO

| | |
|---|---|
| **Estado** | Fechado |
| **Versão** | 1.0 |
| **Curso** | POO aplicada com C#/.NET — 60h / 15 dias |
| **Depende de** | — (documento raiz conceitual) |
| **É consumido por** | Todos os demais |

> **Nota de ordem.** Este é o primeiro documento da série e foi o último a ser escrito. É consolidação retrospectiva: todo o raciocínio já existia distribuído nos Docs 2 a 6, e aqui ele é reunido. Se algum documento contradisser este, o erro está aqui — este documento não decide nada novo, apenas registra o porquê do que já foi decidido.

---

## 0. Como usar esta série

### 0.1 Estrutura

Sete documentos. Cada fato tem **um único dono**; todos os outros documentos o referenciam por ID e nunca o redefinem.

| Doc | Título | Responde |
|---|---|---|
| **1** | Método | Por que o curso é assim |
| **2** | Chassi de Domínio | O que todos os projetos têm em comum e como o aluno escolhe o seu |
| **3** | Mapa de Paredes | Quais são os problemas, o que se ensina em cada um, e o que fica de fora |
| **4** | Cronograma | O que acontece em cada um dos 15 dias |
| **5** | Protocolos de Execução | Como se conduz, apoia, recupera, critica e entrega |
| **6** | Avaliação | Como se mede |
| **7** | Spec da Plataforma | Como isso vira software |

### 0.2 Regra de derivação

O **Doc 7 nunca inventa fato.** Ele referencia os Docs 1 a 6. Uma regra que só existe na plataforma e não existe em nenhum documento anterior é um desvio, não uma decisão.

### 0.3 Protocolo de mudança

Durante o desenvolvimento, regras vão mudar. Quando isso acontecer:

1. **Identifique o documento dono** pelo ID SSOT (seção 7)
2. **Altere lá**, incremente a versão, registre no changelog com o motivo
3. **Verifique as notas cross-doc** do documento alterado — mudança que não propaga cria inconsistência silenciosa
4. **Nunca registre a mudança no Doc 7** se o fato pertence a outro documento

Uma decisão tomada no terminal e não registrada aqui deixa de existir na semana seguinte. Este é o mecanismo que impede o projeto de sair do eixo sem que ninguém perceba.

### 0.4 Rejeições são parte do registro

Vários documentos contêm seções de "avaliado e rejeitado" — dupla-irmã, Hemocentro, Torre de Controle, troca de domínio no rebaixamento, paredes P7 e P8, SQLite.

Elas existem para que uma ideia descartada com motivo não volte três semanas depois parecendo boa. **Antes de reintroduzir qualquer coisa, procure se ela já foi rejeitada.**

---

## 1. Pergunta condutora

> ## Como escrever um sistema que sobrevive a uma mudança de regra que eu não previ?

Vai na parede da sala no D1 e permanece até o D15.

**Por que ela e não outra.** Ela é literalmente respondida pelo envelope de incremento do D12: no penúltimo terço do curso, cada dupla recebe uma mudança de regra que não podia prever, e mede quanto precisou reescrever para absorvê-la.

Toda parede do curso existe para preparar essa resposta. Sempre que um aluno perguntar *"por que isso importa?"*, a resposta aponta para a mesma frase na parede.

---

## 2. Tese pedagógica

> **POO é uma orientação mental, não um conjunto de sintaxes.**

O curso não ensina `class`, `abstract` e `interface`. Ensina a decidir **o que uma coisa é** no negócio antes de decidir como escrevê-la — e as construções da linguagem aparecem como resposta a problemas que o aluno já sentiu.

Consequência direta no desenho: nenhuma construção de linguagem é apresentada antes do problema que a justifica. Se um aluno consegue escrever `abstract class` sem ter sofrido a cascata de `if`, o curso falhou naquele ponto mesmo que o código esteja correto.

---

## 3. Os quatro princípios de operação

### 3.1 Dor antes do modelo

Ordem fixa, em todas as paredes, sem exceção:

```
1. A dupla tenta e falha          (40 min, time-box)
2. O instrutor codifica ao vivo    no domínio-espelho
3. A dupla resolve                 no domínio dela
```

Inverter 1 e 2 transforma transferência em transcrição. O aluno troca `Exemplar` por `Cadeira` e sente que entendeu.

Este princípio é **incortável**. Consta da lista de itens que nunca se sacrificam (Doc 4, §7), inclusive sob atraso.

### 3.2 Transferência por domínio paralelo

O instrutor codifica ao vivo o próprio domínio — **Biblioteca / Acervo** — e ele é estruturalmente distante dos domínios das duplas.

Isso é deliberado: se o domínio do instrutor fosse mapeável 1:1 ao do aluno, a solução seria copiável por renomeação. Sendo distante, o aluno precisa extrair o **princípio** — o núcleo, o fluxo, o porquê — e reinstanciá-lo em entidades diferentes.

Três mecanismos sustentam isso:

| Mecanismo | Doc |
|---|---|
| Regra de distância entre domínios | 2, §2.2 |
| Renomeação obrigatória de entidades | 2, §2.3 |
| Liberação atrasada do repositório-espelho (só no fim do dia) | 5, §3.1 |

### 3.3 Sincronia

Todas as duplas batem na mesma parede no mesmo dia. Não é conveniência de agenda — é o que torna possível um instrutor conduzir 11 projetos diferentes.

Garantida por: chassi obrigatório integral (Doc 2, D2-06) · orçamento de complexidade · Contrato aprovado antes do código · proibição de adiantamento individual (Doc 4, §5.2).

A dupla que termina antes recebe **extensão**, nunca a parede seguinte.

### 3.4 Escolha real dentro de chassi fixo

O aluno escolhe o domínio; a estrutura é fixa. Essa combinação é o que faz o curso ser simultaneamente PBL de verdade e administrável.

Escolha sem chassi produz 11 projetos incomparáveis e um instrutor afogado. Chassi sem escolha produz exercício com tema, e a cópia entre alunos volta a ser possível.

---

## 4. Aderência ao PBL

Auditoria permanente. Cada elemento e onde ele vive.

| Elemento | Estado | Onde |
|---|---|---|
| Conhecimento-chave no centro | Pleno | Doc 3 |
| **Pergunta condutora** | Pleno | Doc 1, §1 · afixada no D1 |
| Investigação sustentada | Pleno | Doc 3 §1.1 · Doc 4 §2 · Doc 5 §1–2 |
| Voz e escolha do aluno | Pleno | Doc 2 §2–4 |
| Reflexão | Pleno | Doc 5 §7 · Doc 6 §5 · retrospectiva do D15 |
| Crítica e revisão | Pleno | Doc 5 §4 · Doc 6 §4 |
| **Produto público** | Pleno | Repositórios públicos (Doc 5, §6) · índice da turma · D15 |
| Autenticidade | **Limitação assumida** | Ver §4.1 |

### 4.1 Autenticidade — limitação assumida

Domínio real escolhido pelo aluno, vocabulário de negócio real, workflow de versionamento real. **Sem cliente real.**

Em 15 dias contínuos, com turma iniciante e sem contato prévio, cliente externo não é viável e tentar seria pior do que assumir.

**Reforço adotado:** o envelope de incremento vem assinado por um interessado nomeado do domínio — *"a direção da biblioteca decidiu"*, *"o dono da oficina pediu"*. A mudança deixa de ser tarefa do professor e passa a ser pedido de alguém. Custo: uma linha no gabarito (Doc 6, §4.2).

### 4.2 O que separa este desenho de "projeto como sobremesa"

A maioria dos cursos que se dizem PBL ensina primeiro e aplica depois. Aqui a ordem é inversa: o aluno bate no problema, precisa da resposta, e só então recebe.

O motor de *need to know* é genuíno, e é o que o mural do "Precisamos Saber" (Doc 5, §8) torna visível.

---

## 5. O que foi deliberadamente sacrificado

Registro para que nada disso volte como "esquecimento".

| Sacrifício | Motivo | Onde |
|---|---|---|
| Paredes P7 (testabilidade) e P8 (aberto/fechado) | Exigem arquitetura consolidada que não existe antes do D12. P8 sobrevive como extensão da P3 | Doc 3, §6 |
| SQLite e qualquer banco | O projeto é reaproveitado no módulo de Computação em Nuvem. Persistência local antecipa mal o que o módulo seguinte faz melhor | Doc 2, §1.6 |
| Python como segunda implementação | Custaria 8–10h e ensinaria pouco de POO que o C# já não ensinou. Fica como espelho conceitual de 90 min | Doc 4, D4-01 |
| Herança e polimorfismo no bloco de TS | Ensaiar a P3 em TS transformaria a parede central do curso em revisão | Doc 4, D4-02 |
| Interface visual, autenticação, relatórios | Fora de escopo em todos os domínios | Doc 2, §1.5 |
| Policiamento de uso de IA | Resolvido na saída, não na entrada. Ver Doc 6, §8 | Doc 6 |

---

## 6. Restrições da turma que moldaram o desenho

Todo o resto da série deriva destas quatro. Se alguma mudar, a série precisa ser revisada.

| Restrição | Consequência |
|---|---|
| **45h efetivas** (60h nominais, ~3h úteis/dia) | Orçamento de complexidade, corte de paredes, 5 classes por projeto |
| **Sem contato prévio com a turma** | Nada publicado antes do D1. Escolha de domínio comprimida em D1–D3. Briefings da trilha desafio |
| **Boa parte da turma sem computador em casa** | Nenhum artefato pressupõe trabalho fora de sala. Estudo em casa é ganho, nunca carga |
| **Turma homogênea, majoritariamente iniciante** | Pareamento cruzado entre duplas rejeitado. Escada de suporte aberta |

---

## 7. Mapa SSOT da série

Onde cada fato mora. Use esta tabela antes de alterar qualquer coisa.

| Documento | IDs |
|---|---|
| **Doc 1** | `D1-PERGUNTA` · `D1-TESE` · `D1-PRINCIPIOS` · `D1-PBL` · `D1-SACRIFICIOS` · `D1-RESTRICOES` · `D1-PROTOCOLO` |
| **Doc 2** | `D2-CHASSI` · `D2-CONTRATO` · `D2-BANCO` · `D2-ORCAMENTO` · `D2-DISTANCIA` · `D2-NOMES` · `D2-TRILHAS` · `D2-BRIEFING` · `D2-SEM-PREVIO` |
| **Doc 3** | `D3-MAPA` · `D3-ESQUEMA` · `D3-ESCOPO` · `D3-SUPERACAO` · `D3-EXTENSOES` · `D3-CORTES` · `D3-ORDEM` |
| **Doc 4** | `D4-CALENDARIO` · `D4-RITMO` · `D4-MARCOS` · `D4-BANCO` · `D4-SACRIFICIO` · `D4-RESERVA` |
| **Doc 5** | `D5-ESCADA` · `D5-CONDUCAO` · `D5-RECUPERACAO` · `D5-CRITICA` · `D5-NAOAPROVACAO` · `D5-ENTREGA` · `D5-CONTRATODIARIO` · `D5-MURAL` |
| **Doc 6** | `D6-EIXOS` · `D6-ESCALA` · `D6-PESOS-PAREDE` · `D6-ENVELOPE` · `D6-DEFESA` · `D6-CAPTURA` · `D6-IA` |
| **Doc 7** | (derivado — não possui fatos próprios) |

---

## 8. SSOT deste documento

| ID | Conteúdo |
|---|---|
| `D1-PERGUNTA` | A pergunta condutora |
| `D1-TESE` | POO como orientação mental |
| `D1-PRINCIPIOS` | Os quatro princípios de operação |
| `D1-PBL` | A auditoria de aderência e a limitação de autenticidade |
| `D1-SACRIFICIOS` | O que foi cortado e por quê |
| `D1-RESTRICOES` | As quatro restrições da turma |
| `D1-PROTOCOLO` | Regra de derivação e protocolo de mudança |

---

## 9. Changelog

| Versão | Mudança |
|---|---|
| 1.0 | Documento criado como consolidação retrospectiva dos Docs 2 a 6. Pergunta condutora formalizada pela primeira vez. Auditoria PBL registrada em caráter permanente. Protocolo de mudança estabelecido para uso durante o desenvolvimento da plataforma |
