# BACKLOG DE ISSUES — Plataforma de Condução Pedagógica (PCP)

| | |
|---|---|
| **Deriva de** | `doc-7-spec-plataforma.md` v1.2 |
| **Versão deste backlog** | 1.1 |
| **Total** | 25 issues — 19 do Doc 7 §7 · 4 derivadas das features que a errata acrescentou ao §4 · 2 de infraestrutura |
| **Stack** | Next.js (App Router) + TypeScript + PostgreSQL, hospedado em PaaS gerenciada |

> **Regra que atravessa todas as issues.** Issue é fila de trabalho, não fonte de verdade (Doc 7 §0.4). Se uma regra parecer faltar, ela mora nos Docs 1 a 6 — nunca invente aqui. Se realmente não existir em documento nenhum, **pare** e aplique o protocolo do Doc 1 §0.3 antes de implementar.
>
> **Regra de generalização (Doc 7 §1).** Nenhuma entidade, coluna, rota ou componente pode mencionar POO, C#, parede, dupla ou biblioteca. O vocabulário é genérico: `Obstaculo`, `Tema`, `Grupo`, `FormularioDeEscopo`, `Incremento`, `Estrutura`. Hardcode de conceito do curso é bug, não atalho.
>
> **Nenhuma quantidade é constante.** Número de temas, tamanho de grupo, limiar de adiantamento, pesos de eixo — tudo é configuração por curso.

---

## Milestones

| Milestone | Prazo | Natureza |
|---|---|---|
| `M0 — antes do D1` | Primeiro dia de aula | Sem isso o D1 não acontece |
| `M1 — antes do D3` | Aprovação dos contratos | **Dependência crítica** |
| `M2 — antes do D4` | Início das paredes | **Dependência crítica** |
| `M3 — antes do D6` | Primeira crítica | Degrada com elegância |
| `M4 — antes do D12` | Envelope de incremento | Tem fallback manual de ~2h |
| `M5 — antes do D15` | Entrega e notas | — |

## Labels

`infra` · `modelo` · `validacao` · `instrutor` · `aluno` · `avaliacao` · `publico`

---

# INFRA-1 — Scaffold do projeto e pipeline de deploy

**Milestone:** `M0 — antes do D1` · **Labels:** `infra`

## Contexto
Decisão de desenvolvedor, autorizada por Doc 7 §0.2. Não deriva de nenhum documento pedagógico e por isso não carrega SSOT.

Next.js com App Router, TypeScript estrito, PostgreSQL gerenciado, ORM com migrations versionadas. Deploy contínuo em PaaS a partir da branch principal. Ambiente de preview por pull request.

## Critérios de aceite
- [ ] `npm run build` passa com TypeScript em modo estrito → teste: `build_passa_em_modo_estrito`
- [ ] Migrations rodam do zero contra banco limpo → teste: `migrations_aplicam_em_banco_vazio`
- [ ] Suíte de testes roda em CI a cada push → teste: `ci_executa_suite_em_cada_push`
- [ ] Push na branch principal publica em produção → teste: manual, uma vez
- [ ] Seed de desenvolvimento cria um curso completo de exemplo → teste: `seed_cria_curso_completo`

## Fora de escopo
- Multi-tenancy, billing, observabilidade avançada
- Qualquer entidade de domínio (vem nas issues 1 e 2)

---

# INFRA-2 — Autenticação e papéis

**Milestone:** `M0 — antes do D1` · **Labels:** `infra`, `instrutor`, `aluno`

## Contexto
Implementa a matriz de permissões de Doc 7 §3. Os dois papéis são **Instrutor** e **Aluno**; o mecanismo de login é decisão de desenvolvedor.

Restrição operacional herdada de `D2-SEM-PREVIO`: parte da turma não tem computador em casa e o primeiro contato é no D1. O cadastro precisa ser feito em minutos, em sala, sem depender de e-mail confirmado.

## SSOT
Doc 7 §3 (papéis) · `D2-SEM-PREVIO` (nenhum artefato pressupõe trabalho prévio).

## Critérios de aceite
- [ ] Instrutor acessa todas as rotas de instrutor → teste: `instrutor_acessa_rotas_de_instrutor`
- [ ] Aluno recebe 403 em qualquer rota de instrutor → teste: `aluno_nao_acessa_rotas_de_instrutor`
- [ ] Aluno não vê avaliação de outro grupo → teste: `aluno_nao_ve_avaliacao_de_outro_grupo`
- [ ] Aluno não vê incremento antes da liberação → teste: `aluno_nao_ve_incremento_antes_da_liberacao`
- [ ] Aluno não vê nota antes da agregação final → teste: `aluno_nao_ve_nota_antes_da_agregacao`
- [ ] Instrutor cria acesso de aluno em lote, sem confirmação por e-mail → teste: `instrutor_cria_alunos_em_lote`

## Fora de escopo
- SSO, OAuth de terceiros, recuperação de senha por e-mail

---

# 1 — Modelo genérico: Curso, Turma, Aluno, Grupo

**Milestone:** `M0 — antes do D1` · **Labels:** `modelo`

## Contexto
Implementa a estrutura de Doc 7 §2.1 e as regras de integridade de §2.4.

## SSOT
Doc 2 §2.4.1 (tamanho do grupo) · Doc 5 §6 (repositório individual) · Doc 6 §9.1 (copiloto) — ver documento dono antes de alterar qualquer regra.

## Critérios de aceite
- [ ] `Grupo` aceita **1 ou 2** alunos; 3 é rejeitado → teste: `grupo_aceita_um_ou_dois_alunos`
- [ ] Cada `Aluno` tem `Repositorio` próprio, mesmo compartilhando `Tema` → teste: `cada_aluno_tem_repositorio_proprio`
- [ ] `Aluno` tem estado `copiloto`, falso por padrão → teste: `aluno_tem_estado_copiloto`
- [ ] Aluno solo é válido e mantém tema e repositório próprios → teste: `aluno_solo_e_valido`
- [ ] Nenhum campo do modelo menciona conceito do curso → teste: `modelo_nao_menciona_conceito_do_curso`

## Fora de escopo
- Formulário de escopo, temas, avaliação

---

# 2 — Modelo genérico: Dia, Bloco, Marco

**Milestone:** `M0 — antes do D1` · **Labels:** `modelo`

## Contexto
O calendário do curso é dado, não código. Um curso tem N dias; cada dia tem blocos ordenados com duração e tipo; um dia pode ter um marco.

## SSOT
`D4-CALENDARIO` · `D4-RITMO` · `D4-MARCOS`.

## Critérios de aceite
- [ ] `Dia` tem blocos ordenados com duração e tipo → teste: `dia_tem_blocos_ordenados`
- [ ] `Marco` é opcional e tem tipo `duro` ou `triagem` → teste: `marco_tem_tipo_duro_ou_triagem`
- [ ] Número de dias é configurável, não fixo em 15 → teste: `numero_de_dias_e_configuravel`
- [ ] Soma das durações dos blocos é exibida por dia → teste: `soma_das_duracoes_por_dia`

## Fora de escopo
- Conteúdo pedagógico dos blocos — a plataforma não gera conteúdo (Doc 7 §6)

---

# 3 — BancoDeTemas com dificuldade, trilha e briefing

**Milestone:** `M0 — antes do D1` · **Labels:** `modelo`, `aluno`

## Contexto
O banco é fechado, com válvula: proposta própria exige formulário preenchido antes. A trilha desafio exige briefing anexado, porque não há janela de pesquisa prévia.

## SSOT
`D2-BANCO` · `D2-BRIEFING` · `D2-TRILHAS`.

## Critérios de aceite
- [ ] Exibe **todos** os temas cadastrados, com dificuldade e trilha → teste: `exibe_todos_os_temas_cadastrados`
- [ ] Tema da trilha desafio exibe briefing anexado → teste: `tema_desafio_exibe_briefing`
- [ ] Tema já alocado a um grupo aparece como indisponível → teste: `tema_alocado_aparece_indisponivel`
- [ ] Quantidade de temas não é constante em lugar nenhum → teste: `quantidade_de_temas_nao_e_constante`

## Fora de escopo
- Alocação em si (issue 8)

---

# 4 — Slides interativos de abertura

**Milestone:** `M0 — antes do D1` · **Labels:** `instrutor`, `aluno`

## Contexto
**Dependência crítica de D1** (Doc 7 §5): sem os slides, o primeiro dia não tem material. `MaterialInterativo` é vinculado a um `Dia`.

A plataforma **não gera conteúdo pedagógico** (Doc 7 §6) — ela apresenta o material que o instrutor cadastrar.

## SSOT
Doc 4, D1.

## Critérios de aceite
- [ ] Material interativo é vinculado a um dia → teste: `material_interativo_pertence_a_um_dia`
- [ ] Aluno abre o material do dia corrente → teste: `aluno_abre_material_do_dia`
- [ ] Instrutor navega em modo apresentação → teste: `instrutor_navega_em_modo_apresentacao`

## Fora de escopo
- Editor de slides completo. Conteúdo entra como markdown ou upload

---

# 5 — Pergunta condutora persistente

**Milestone:** `M0 — antes do D1` · **Labels:** `aluno`

## Contexto
A pergunta condutora é elemento canônico do PBL. Fica afixada na parede da sala do D1 ao D15 e precisa estar visível na plataforma com a mesma permanência. É texto configurável por curso, nunca hardcode.

## SSOT
`D1-PERGUNTA`.

## Critérios de aceite
- [ ] Pergunta condutora aparece em **todas** as telas do aluno → teste: `pergunta_condutora_em_todas_as_telas_do_aluno`
- [ ] Texto é campo do curso, não literal no código → teste: `pergunta_condutora_e_configuravel`

## Fora de escopo
- Nada mais. Issue deliberadamente pequena

---

# 6 — FormularioDeEscopo configurável

**Milestone:** `M1 — antes do D3` · **Labels:** `modelo`, `aluno`

## Contexto
O formulário é a versão genérica do Contrato de Domínio: 7 perguntas (C1–C7) mais a tabela de tradução papel → nome de negócio → nome de classe. **A quantidade de perguntas é configuração**, não constante — outro módulo terá outro formulário.

## SSOT
`D2-CONTRATO`.

## Critérios de aceite
- [ ] Formulário é composto por perguntas configuráveis, com enunciado e critério de aceite → teste: `formulario_tem_perguntas_configuraveis`
- [ ] Resposta de escopo pertence ao **grupo**, não ao aluno → teste: `resposta_de_escopo_pertence_ao_grupo`
- [ ] Tabela de tradução tem uma linha por papel obrigatório da `Estrutura` → teste: `tabela_de_traducao_cobre_todos_os_papeis`
- [ ] Aluno edita o próprio rascunho antes da submissão → teste: `aluno_edita_rascunho`

## Fora de escopo
- Validação (issue 7) · fila de aprovação (issue 9)

---

# 7 — Motor de validação automática

**Milestone:** `M1 — antes do D3` · **Labels:** `validacao`

## Contexto
**Dependência crítica** (Doc 7 §5). Sem ela é impossível aprovar 11 formulários nos 95 minutos do D3. Funciona como pré-filtro: o formulário só chega ao instrutor depois de passar por ela, preservando o tempo humano para os 4 julgamentos que exigem leitura.

As validações são **declaradas na pergunta**, não codificadas por número — o motor executa regras configuradas.

## SSOT
Doc 2 §4.6.

## Critérios de aceite
- [ ] Rejeita formulário com pergunta em branco → teste: `rejeita_pergunta_em_branco`
- [ ] Rejeita menos de 3 ou mais de 5 estados → teste: `rejeita_quantidade_de_estados_fora_da_faixa`
- [ ] Rejeita quantidade de categorias diferente de 3 → teste: `rejeita_quantidade_de_categorias_invalida`
- [ ] Rejeita menos de 3 itens em "fora de escopo" → teste: `rejeita_fora_de_escopo_insuficiente`
- [ ] Rejeita transição ilegal que cite estado não declarado → teste: `rejeita_transicao_com_estado_nao_declarado`
- [ ] Rejeita nome genérico na tabela de tradução, por lista negra configurável → teste: `rejeita_nome_generico_na_traducao`
- [ ] Rejeita tema já alocado a outro grupo → teste: `rejeita_tema_ja_alocado`
- [ ] Formulário reprovado **não** entra na fila do instrutor → teste: `reprovado_nao_entra_na_fila`
- [ ] Faixas e limites vêm da configuração da pergunta → teste: `limites_vem_da_configuracao`

## Fora de escopo
- Os 4 julgamentos humanos: se a C1 descreve evento, se as 3 fórmulas diferem em estrutura, se o recurso é finito, se a imutabilidade é de negócio. **Estes nunca são automatizados.**

---

# 8 — Alocação de tema com unicidade

**Milestone:** `M1 — antes do D3` · **Labels:** `instrutor`, `aluno`

## Contexto
Cada tema pertence a no máximo um grupo por turma. A razão não é estética: o incremento do D12 é escrito por tema, e tema repetido significa envelope repetido, com risco de vazamento entre grupos no dia mais importante da avaliação.

Alocação é por negociação livre entre os grupos, com sorteio como desempate — a plataforma registra o resultado, não conduz a negociação.

## SSOT
`D2-BANCO` (unicidade e alocação).

## Critérios de aceite
- [ ] Um tema pertence a no máximo um grupo por turma → teste: `tema_pertence_a_no_maximo_um_grupo`
- [ ] Tentativa de alocar tema ocupado falha com mensagem clara → teste: `alocacao_de_tema_ocupado_falha`
- [ ] Corrida entre dois grupos pelo mesmo tema resolve para um só → teste: `alocacao_concorrente_resolve_para_um`
- [ ] Instrutor realoca tema, liberando o anterior → teste: `instrutor_realoca_tema`

## Fora de escopo
- Sorteio automatizado — o desempate acontece em sala

---

# 9 — Fila de aprovação do instrutor e máquina de estados do formulário

**Milestone:** `M1 — antes do D3` · **Labels:** `instrutor`, `validacao`

## Contexto
Aprovação **rolling**: o instrutor circula e aprova conforme os grupos terminam. A fila mostra apenas os 4 julgamentos humanos, porque os 7 mecânicos já passaram no motor da issue 7. Orçamento real: 3 a 4 minutos por formulário.

Estados: `rascunho` → `submetido` → `aprovado` | `devolvido`.

## SSOT
Doc 2 §4.5 e §4.6.

## Critérios de aceite
- [ ] Transições ilegais entre estados são recusadas → teste: `recusa_transicao_ilegal_do_formulario`
- [ ] Instrutor vê apenas os 4 julgamentos humanos na fila → teste: `fila_mostra_apenas_julgamentos_humanos`
- [ ] Formulário aprovado torna-se somente leitura para o aluno → teste: `aprovado_e_somente_leitura_para_aluno`
- [ ] Devolução exige motivo escrito → teste: `devolucao_exige_motivo`
- [ ] Fila ordena por tempo de espera → teste: `fila_ordena_por_tempo_de_espera`

## Fora de escopo
- Edição pós-aprovação (issue 10)

---

# 10 — Edição pós-aprovação restrita a poda

**Milestone:** `M1 — antes do D3` · **Labels:** `instrutor`

## Contexto
O formulário aprovado é imutável, com **uma única exceção**: poda de escopo por rebaixamento de trilha. O instrutor reduz o escopo declarado mantendo o mesmo tema, e o formulário editado passa a ser o gabarito de correção e a base do incremento a partir dali.

O grupo nunca edita depois da aprovação, em nenhuma circunstância.

## SSOT
Doc 2 §4.5.1 · Doc 5 §5.3 (rebaixamento é poda, não troca de tema).

## Critérios de aceite
- [ ] Instrutor edita formulário aprovado apenas com motivo `poda` → teste: `edicao_pos_aprovacao_exige_motivo_poda`
- [ ] Aluno não consegue editar formulário aprovado → teste: `aluno_nao_edita_aprovado`
- [ ] Poda preserva o tema alocado → teste: `poda_preserva_o_tema`
- [ ] Histórico guarda a versão anterior à poda → teste: `poda_preserva_versao_anterior`

## Fora de escopo
- Gatilho do rebaixamento — é julgamento do instrutor na abertura do D7

---

# 11 — RegistroDiario: avaliação 0–3, log e push

**Milestone:** `M2 — antes do D4` · **Labels:** `avaliacao`, `aluno`

## Contexto
**Dependência crítica** (Doc 7 §5). Sem captura contínua, a avaliação desaba para um fim de semana corrigindo 22 repositórios — e corrige mal, porque nada do que importa sobrevive no código final.

`RegistroDiario` pendura em **`Aluno`**, não em `Grupo` (Doc 7 §2.2). Avaliar o Eixo 1 por grupo faria um aluno ausente herdar a nota do parceiro.

## SSOT
`D6-CAPTURA` · `D6-ESCALA` · Doc 6 §1.1 (unidade) · Doc 5 §6 (push).

## Critérios de aceite
- [ ] Avaliação de obstáculo aceita apenas 0, 1, 2 ou 3 → teste: `avaliacao_aceita_apenas_zero_a_tres`
- [ ] Registro diário pertence a um aluno e a um dia → teste: `registro_diario_pertence_a_aluno_e_dia`
- [ ] Lançamento por grupo preenche os dois alunos com o mesmo valor por padrão → teste: `lancamento_por_grupo_preenche_ambos`
- [ ] Instrutor diverge a nota de um aluno em relação ao parceiro → teste: `instrutor_diverge_nota_individual`
- [ ] Log de obstáculo é texto livre, por aluno e por dia → teste: `log_de_obstaculo_por_aluno_e_dia`
- [ ] Confirmação de push é por aluno → teste: `confirmacao_de_push_por_aluno`

## Fora de escopo
- Painel agregado (issue 14) · qualquer leitura automática do GitHub

---

# 12 — Contrato diário

**Milestone:** `M2 — antes do D4` · **Labels:** `aluno`

## Contexto
Duas linhas na abertura, uma no fechamento. A segunda linha — *hoje NÃO faremos* — é a que importa: é a vacina contra scope creep diário e cumpre no dia a mesma função que o "fora de escopo" cumpre no projeto inteiro.

Custa 3 minutos por dia. O histórico acumulado é insumo direto da retrospectiva do D15.

## SSOT
`D5-CONTRATODIARIO`.

## Critérios de aceite
- [ ] Contrato diário exige as duas linhas antes de fechar o dia → teste: `contrato_diario_exige_as_duas_linhas`
- [ ] Fechamento registra cumprido ou não, com motivo → teste: `fechamento_registra_cumprimento`
- [ ] Histórico acumulado é consultável do D1 até o dia corrente → teste: `historico_de_contratos_e_consultavel`

## Fora de escopo
- Notificação, lembrete, gamificação

---

# 13 — Registro de recuperação

**Milestone:** `M2 — antes do D4` · **Labels:** `aluno`, `instrutor`

## Contexto
É a única visibilidade do instrutor sobre quem está de fato acompanhando, e alimenta a triagem dos Marcos 2 e 3. Custa 30 segundos ao aluno.

A recuperação acontece pelo material, não por aula repetida. Janela: os 20 minutos de abertura, do D4 ao D13, mais os 75 minutos do D14.

## SSOT
`D5-RECUPERACAO`.

## Critérios de aceite
- [ ] Registro exige aluno, dia, o que perdeu, o que repôs e por quem → teste: `registro_de_recuperacao_exige_todos_os_campos`
- [ ] Instrutor lista todas as recuperações de um aluno → teste: `instrutor_lista_recuperacoes_por_aluno`
- [ ] Aluno solo pode registrar reposição por colega fora do grupo → teste: `aluno_solo_registra_reposicao_por_colega`

## Fora de escopo
- Gatilho automático de copiloto. **Não existe número de faltas que dispare** — é julgamento do instrutor (Doc 5 §3.4)

---

# 14 — Painel do instrutor e limiar de adiantamento

**Milestone:** `M2 — antes do D4` · **Labels:** `instrutor`, `avaliacao`

## Contexto
Um instrutor, 11 grupos, 180 minutos. O painel responde em segundos a uma pergunta só: quantos grupos superaram o obstáculo de hoje?

O limiar existe porque adiantar só é permitido para a turma inteira — algumas duplas adiantando destrói a sincronia, que é a fundação do método. **O limiar é proporção configurável**, não "9 em 11".

## SSOT
Doc 4 §5.2 (`D4-BANCO`) · Doc 6 §2 (definição de superado).

## Critérios de aceite
- [ ] Painel calcula quantos grupos superaram o obstáculo do dia → teste: `painel_calcula_grupos_que_superaram`
- [ ] Painel considera superado apenas avaliação **≥ 1** → teste: `superado_e_avaliacao_maior_ou_igual_a_um`
- [ ] Painel sinaliza quando o limiar configurado é atingido → teste: `painel_sinaliza_limiar_atingido`
- [ ] Limiar é proporção configurável por curso → teste: `limiar_e_proporcao_configuravel`
- [ ] Dia sem registro aparece como pendente → teste: `dia_sem_registro_aparece_pendente`

## Fora de escopo
- Decidir o adiantamento. A plataforma sinaliza; quem decide é o instrutor

---

# 15 — Mural digital do "Precisamos Saber"

**Milestone:** `M3 — antes do D6` · **Labels:** `aluno`, `instrutor`

## Contexto
Artefato canônico do PBL: torna visível o *need to know* que os obstáculos produzem. O mural físico continua existindo — a plataforma **espelha**, não substitui (Doc 7 §6).

É consultado na abertura de todo dia e é o degrau 2 da escada de suporte, o que o torna a primeira tela do aluno.

**Organização por pergunta de obstáculo, nunca por número.** O grupo escreve a dúvida, não o pedido de solução.

## SSOT
`D5-MURAL`.

## Critérios de aceite
- [ ] Item de mural exige vínculo com uma pergunta de obstáculo → teste: `item_de_mural_exige_vinculo_com_obstaculo`
- [ ] Apenas instrutor pode marcar item como resolvido → teste: `apenas_instrutor_risca_item`
- [ ] Mural é agrupado por pergunta, não por identificador numérico → teste: `mural_agrupa_por_pergunta`
- [ ] Mural é acessível durante o bloco de implementação → teste: `mural_acessivel_durante_implementacao`

## Fora de escopo
- Moderação, votação, comentários em thread

---

# 16 — Rodadas de crítica com sorteio e roteiros

**Milestone:** `M3 — antes do D6` · **Labels:** `aluno`, `instrutor`

## Contexto
Duas rodadas com pareamento **diferente**, para que cada grupo enxergue dois temas alheios. C1 (D6) revisa arquitetura; C2 (D13) revisa **como o colega absorveu o incremento** — é o teste de transferência mais puro do curso e não pode ser gerado por ferramenta alguma.

Regra comum às duas: antes de comentar qualquer linha, o revisor explica o tema do colega em uma frase e entrega ao menos um cenário concreto que quebra. Sem isso, crítica entre iniciantes vira elogio mútuo.

## SSOT
`D5-CRITICA` (pareamento, regra comum, roteiros de C1 e C2, formato).

## Critérios de aceite
- [ ] Sorteio da rodada 2 não repete par da rodada 1 → teste: `sorteio_da_rodada_2_nao_repete_par`
- [ ] Registro de crítica exige a frase de explicação do tema alheio → teste: `critica_exige_explicacao_do_tema_alheio`
- [ ] Registro exige ao menos um cenário concreto de quebra → teste: `critica_exige_cenario_de_quebra`
- [ ] Rodada incompleta aparece pendente para **ambas** as partes → teste: `rodada_incompleta_pendente_para_ambos`
- [ ] Cada rodada tem roteiro próprio, configurável → teste: `roteiro_e_configuravel_por_rodada`

## Fora de escopo
- Nota da crítica. Ela entra no Eixo 3 pela existência do registro

---

# 17 — Gerador de incremento e liberação temporizada

**Milestone:** `M4 — antes do D12` · **Labels:** `instrutor`, `avaliacao`

## Contexto
O incremento **não se escreve — ele se deriva** da resposta de escopo do grupo. O instrutor abre o formulário, lê as respostas de estados, transições e categorias, e preenche quatro lacunas: cerca de 10 minutos por incremento.

As lacunas são **campos, não texto livre** (nota do Doc 6 ao Doc 7).

**Fallback documentado:** se esta issue atrasar, os incrementos são escritos à mão em ~2h. É o único milestone com fallback.

## SSOT
`D6-ENVELOPE` · Doc 6 §4.2 e §4.6 · Doc 5 §5.2 (triagem do Marco 3).

## Critérios de aceite
- [ ] Gerador pré-carrega estados e categorias a partir do formulário aprovado → teste: `gerador_precarrega_do_formulario`
- [ ] Incremento exige remetente nomeado → teste: `incremento_exige_remetente_nomeado`
- [ ] Incremento exige ao menos 2 itens em "o que não muda" → teste: `incremento_exige_dois_itens_imutaveis`
- [ ] Versão reduzida omite a mudança de estado → teste: `versao_reduzida_omite_mudanca_de_estado`
- [ ] Não gera incremento para grupo sem formulário aprovado → teste: `nao_gera_incremento_sem_formulario_aprovado`
- [ ] Incremento não é visível ao aluno antes da liberação → teste: `incremento_invisivel_antes_da_liberacao`

## Fora de escopo
- Redigir o conteúdo do incremento. A plataforma estrutura; o instrutor decide

---

# 18 — Agregação da rubrica e defesa oral

**Milestone:** `M5 — antes do D15` · **Labels:** `avaliacao`, `instrutor`

## Contexto
A nota do D15 é **agregação, não correção** (Doc 6 §0.3). Toda evidência já foi capturada ao vivo nos momentos que existem no cronograma.

Cada eixo declara sua **unidade**: Eixo 1 por aluno, Eixo 2 por grupo, Eixo 3 por aluno. O obstáculo carrega um campo `peso` — não existe flag de "central".

A defesa oral instancia perguntas de um banco configurável e ajusta os Eixos 1 e 2, para cima ou para baixo.

## SSOT
`D6-EIXOS` · `D6-ESCALA` · `D6-PESOS-PAREDE` · `D6-DEFESA` · Doc 6 §1.1 e §9.1.

## Critérios de aceite
- [ ] Agregação respeita os pesos configurados por eixo → teste: `agregacao_respeita_pesos_por_eixo`
- [ ] Eixo com unidade `aluno` agrega por aluno; unidade `grupo` agrega por grupo → teste: `agregacao_respeita_unidade_do_eixo`
- [ ] Obstáculo com peso 2 contribui em dobro no Eixo 1 → teste: `obstaculo_com_peso_dois_conta_em_dobro`
- [ ] Aluno com estado `copiloto` tem o Eixo 1 vindo apenas da defesa oral → teste: `copiloto_avaliado_pela_defesa_oral`
- [ ] Copiloto **não** tem teto de nota → teste: `copiloto_nao_tem_teto_de_nota`
- [ ] Defesa oral registra quais perguntas foram usadas → teste: `defesa_registra_perguntas_usadas`
- [ ] Banco de perguntas é configurável por curso → teste: `banco_de_perguntas_e_configuravel`
- [ ] Nota não é visível ao aluno antes da agregação final → teste: `nota_invisivel_antes_da_agregacao`

## Fora de escopo
- Exportação para diário de classe institucional

---

# 19 — Índice público da turma

**Milestone:** `M5 — antes do D15` · **Labels:** `publico`

## Contexto
O repositório não é apenas entrega — é o **produto público** do curso, no sentido que o PBL dá ao termo. Enquadrado no D1, compartilhado no D15, e permanece no ar depois.

Página única, sem autenticação, listando tema e repositório de cada grupo. Custo de construção baixo; o requisito já existia, faltava o enquadramento.

## SSOT
Doc 5 §6.2.

## Critérios de aceite
- [ ] Índice lista tema e repositório de cada grupo → teste: `indice_publico_lista_tema_e_repositorio`
- [ ] Índice é acessível sem autenticação → teste: `indice_publico_dispensa_autenticacao`
- [ ] Índice não expõe nota, avaliação nem incremento → teste: `indice_publico_nao_expoe_avaliacao`

## Fora de escopo
- Página por aluno, portfólio, domínio próprio

---

# 20 — Escopos pré-aprovados (contratos de emergência)

**Milestone:** `M0 — antes do D1` · **Labels:** `instrutor`

## Contexto
> Deriva de uma funcionalidade listada em Doc 7 §4 (M0) que ainda não tem linha na tabela do §7.

O instrutor mantém formulários pré-aprovados de temas fáceis, escritos antes do D1. Sem essa rede, ele cede e aprova um formulário ruim — e formulário ruim contamina os 12 dias seguintes. É o que permite o Marco 1 ser genuinamente duro sem deixar nenhum grupo encalhado.

Nenhuma linha de código do projeto do aluno antes da aprovação, **inclusive** para quem recebe um escopo de emergência.

## SSOT
Doc 5 §5.1 (`D5-NAOAPROVACAO`).

## Critérios de aceite
- [ ] Instrutor cadastra escopo pré-aprovado antes do início do curso → teste: `instrutor_cadastra_escopo_pre_aprovado`
- [ ] Atribuir escopo pré-aprovado a um grupo o deixa em estado `aprovado` → teste: `escopo_pre_aprovado_entra_como_aprovado`
- [ ] Escopo pré-aprovado respeita a unicidade de tema → teste: `escopo_pre_aprovado_respeita_unicidade`
- [ ] Escopo pré-aprovado não usado não aparece para nenhum aluno → teste: `escopo_pre_aprovado_nao_usado_e_invisivel`

## Fora de escopo
- Escrever o conteúdo dos escopos — é artefato da fila de preparo pré-D1

---

# 21 — Material de referência com liberação temporizada

**Milestone:** `M0 — antes do D1` · **Labels:** `instrutor`, `aluno`

## Contexto
> Deriva de uma funcionalidade listada em Doc 7 §4 (M0) que ainda não tem linha na tabela do §7. Critério de aceite verificado em M2.

O repositório-espelho do instrutor é o **único material de recuperação do curso** (dependência crítica do índice). Ele é liberado ao fim de cada dia, um commit por obstáculo.

O atraso é deliberado e pedagógico: libera antes e a ordem "dor → demonstração → resolução" desmorona, porque a resposta fica disponível durante o bloco em que travar é o produto do exercício. A regra protege o dia corrente, não os anteriores.

## SSOT
Doc 5 §3.1 e §3.2 (`D5-RECUPERACAO`) · `D3-ORDEM`.

## Critérios de aceite
- [ ] Material de referência tem dia de liberação → teste: `material_de_referencia_tem_dia_de_liberacao`
- [ ] Material **não** aparece ao aluno antes do dia de liberação → teste: `material_invisivel_antes_do_dia_de_liberacao`
- [ ] Material de dias anteriores permanece acessível → teste: `material_de_dias_anteriores_permanece_acessivel`
- [ ] Instrutor vê todo o material, independentemente do dia → teste: `instrutor_ve_todo_o_material`

## Fora de escopo
- Hospedar o código — o material é uma URL para o repositório

---

# 22 — Atribuição de extensão e monitoria

**Milestone:** `M2 — antes do D4` · **Labels:** `instrutor`

## Contexto
> Deriva de um critério de aceite acrescentado ao Doc 7 §4 (M2) que ainda não tem linha na tabela do §7. Nota original do Doc 3 ao Doc 7.

O grupo que vence o obstáculo antes do tempo recebe **extensão** — aprofundamento do mesmo obstáculo — ou entra em **monitoria rotativa**. Nunca avança para o obstáculo seguinte: avançar quebra a sincronia, que é o que torna possível um instrutor conduzir 11 projetos.

A rotatividade da monitoria é obrigatória. Se virar rotina fixa, o aluno forte para de codar e vira professor não remunerado.

## SSOT
`D3-EXTENSOES` · Doc 3 §5 · Doc 5 §1.2.

## Critérios de aceite
- [ ] Instrutor registra atribuição de extensão ou monitoria, por aluno e obstáculo → teste: `instrutor_registra_atribuicao`
- [ ] Atribuição tem tipo `extensao` ou `monitoria` → teste: `atribuicao_tem_tipo_extensao_ou_monitoria`
- [ ] Painel mostra quem está em extensão e quem está em monitoria no dia → teste: `painel_mostra_extensao_e_monitoria`
- [ ] Histórico de monitoria por aluno é visível, para sustentar a rotatividade → teste: `historico_de_monitoria_por_aluno`

## Fora de escopo
- Sugerir automaticamente quem deve monitorar quem

---

# 23 — Reflexões de fechamento

**Milestone:** `M5 — antes do D15` · **Labels:** `aluno`, `avaliacao`

## Contexto
> Deriva de funcionalidades listadas em Doc 7 §4 (M5) que ainda não têm linha na tabela do §7.

Duas reflexões escritas, ambas itens do Eixo 3. A da retrospectiva é a **única captura do pensamento** — todos os outros instrumentos capturam o código, e sem ela a tese central do curso não é avaliada em lugar nenhum.

Não há resposta certa. Avalia-se se a resposta demonstra consciência da mudança, não se usa o vocabulário correto.

## SSOT
Doc 6 §5.1 (reflexão sobre a tese) · Doc 6 §7 (reflexão da linguagem espelho) · `D6-EIXOS`.

## Critérios de aceite
- [ ] Reflexão de fechamento pertence a um aluno e a um dia → teste: `reflexao_pertence_a_aluno_e_dia`
- [ ] Enunciado da reflexão é configurável por curso → teste: `enunciado_da_reflexao_e_configuravel`
- [ ] Reflexão entra como item do Eixo 3 → teste: `reflexao_entra_no_eixo_3`
- [ ] Reflexão pendente aparece ao instrutor na agregação → teste: `reflexao_pendente_aparece_na_agregacao`

## Fora de escopo
- Qualquer correção automática do texto

---

## Changelog

| Versão | Mudança |
|---|---|
| 1.1 | **Ressincronização de ponteiro, nenhuma issue alterada.** "Deriva de" passa de `doc-7-spec-plataforma.md` v1.1 para v1.2. As cinco correções do Doc 7 v1.2 foram conferidas uma a uma contra o corpo deste backlog e já estavam refletidas: registro diário por aluno (issue 11), `peso` do obstáculo sem flag de "central" e pesos configurados por eixo (issue 18), reflexão da linguagem espelho (issue 23) e `Grupo` de 1 ou 2 alunos (issue 1). Nenhum critério de aceite mudou, nenhuma issue publicada no GitHub ficou dessincronizada |
| 1.0 | Backlog criado a partir do Doc 7 v1.1 §7. 25 issues — 19 do §7, 4 das features acrescentadas ao §4 pela errata, 2 de infraestrutura |
