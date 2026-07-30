import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
  boolean,
  check,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Modelo genérico do Doc 7 §2.1 e §2.2, com as regras de integridade do §2.4.
//
// Nenhum nome aqui pode mencionar conceito de curso (CLAUDE.md §4.2), e
// nenhuma quantidade com significado pedagógico é constante (§4.3) — por
// isso o tamanho do grupo é coluna de `cursos`, não literal.

// Doc 7 §3 fixa exatamente dois papéis. Não é quantidade pedagógica
// configurável — é a matriz de permissão da spec.
export const papelEnum = pgEnum('papel', ['instrutor', 'aluno'])

/**
 * Identidade. Uma pessoa, um registro — seja ela instrutor ou aluno.
 *
 * `alunos` deixa de carregar identidade e passa a ser a matrícula de um
 * usuário numa turma: o mesmo GitHub pode ser aluno numa turma e instrutor
 * em outro curso sem duplicar pessoa.
 */
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Chave imutável (ADR 0002 §2). O login é exibição: o GitHub deixa trocar,
  // e o antigo fica livre para outra pessoa registrar.
  githubUserId: bigint('github_user_id', { mode: 'number' }).notNull().unique(),
  githubLogin: text('github_login').notNull(),
  nome: text('nome').notNull(),
  papel: papelEnum('papel').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const cursos = pgTable(
  'cursos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    // Doc 2 §2.4.1 diz "1 ou 2" para o curso da série. Aqui é configuração:
    // outro curso instancia outro valor.
    tamanhoMaximoDeGrupo: integer('tamanho_maximo_de_grupo').notNull(),
    // `D1-PERGUNTA`. Fica afixada na sala do primeiro ao último dia, e na
    // plataforma com a mesma permanência. Texto do curso, nunca literal.
    perguntaCondutora: text('pergunta_condutora').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tamanho_maximo_de_grupo_positivo', sql`${t.tamanhoMaximoDeGrupo} >= 1`),
    // Curso sem pergunta condutora não é curso por projetos. Vazio ou só
    // espaço é rejeitado pelo banco, não pela aplicação.
    check('pergunta_condutora_nao_vazia', sql`length(btrim(${t.perguntaCondutora})) > 0`),
  ],
)

// Doc 4 §4 e Doc 7 §2.1: go/no-go duro, ou triagem com consequência. São
// termos genéricos da spec, não vocabulário do curso.
export const marcoTipoEnum = pgEnum('marco_tipo', ['duro', 'triagem'])

/**
 * Um dia do curso. `ordem` é 1..N e N é configuração — nunca 15 (Doc 7 §2.4:
 * "nenhum limiar ou quantidade é constante").
 */
export const dias = pgTable(
  'dias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('dia_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    check('dia_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * Bloco de um dia. `tipo` é TEXTO, não enum: o Doc 4 §2 nomeia os blocos com
 * vocabulário do curso, e enumerá-los aqui violaria a regra de generalização
 * (Doc 7 §1). A taxonomia é dado que o instrutor cadastra.
 */
export const blocos = pgTable(
  'blocos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    diaId: uuid('dia_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    duracaoMinutos: integer('duracao_minutos').notNull(),
    tipo: text('tipo').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('bloco_ordem_unica_no_dia').on(t.diaId, t.ordem),
    check('bloco_ordem_positiva', sql`${t.ordem} >= 1`),
    check('bloco_duracao_positiva', sql`${t.duracaoMinutos} >= 1`),
  ],
)

/** Marco pendura no DIA (Doc 4 §4), e é opcional: no máximo um por dia. */
export const marcos = pgTable('marcos', {
  id: uuid('id').primaryKey().defaultRandom(),
  diaId: uuid('dia_id')
    .notNull()
    .unique()
    .references(() => dias.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  tipo: marcoTipoEnum('tipo').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Obstáculo do curso (Doc 7 §2.1: `Curso ── Obstaculo (1..N)`).
 *
 * `peso` é COLUNA e não flag de "central" — a regra é literal no Doc 7 §2.4,
 * ancorada em `D6-PESOS-PAREDE`. O obstáculo mais importante de um curso pesa
 * mais; qual é ele, e quanto mais, é configuração. Uma flag booleana só
 * conseguiria dizer "é o central" e obrigaria o código a saber quanto isso
 * vale.
 *
 * Sem `default` no peso: um valor padrão aqui decidiria em código o que o curso
 * tem de declarar. Quem cadastra o obstáculo diz o peso.
 *
 * `numeric` em vez de `integer` porque nada nos documentos-dono limita o peso a
 * múltiplo inteiro, e escolher inteiro proibiria algo que ninguém proibiu.
 */
export const obstaculos = pgTable(
  'obstaculos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    /**
     * O obstáculo É uma pergunta, e é a pergunta que chega à plataforma
     * (`D3-07`). Um `nome` seria rótulo inventado por cima de uma identidade que
     * o documento-dono já declarou — e o mural da issue 15 agrupa por pergunta,
     * não por ordinal.
     */
    pergunta: text('pergunta').notNull(),
    peso: numeric('peso', { precision: 6, scale: 2, mode: 'number' }).notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('obstaculo_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    check('obstaculo_ordem_positiva', sql`${t.ordem} >= 1`),
    // Peso zero ou negativo tiraria o obstáculo da conta sem tirá-lo do curso —
    // o aluno seria avaliado num item que não vale nada, e ninguém veria.
    check('obstaculo_peso_positivo', sql`${t.peso} > 0`),
  ],
)

/**
 * Os níveis da escala de avaliação, por curso (`D6-ESCALA`).
 *
 * O Doc 6 §2 declara quatro níveis e o descritor de cada um, e declara também
 * que "superado = nível ≥ 1". Nada disso vira literal em código: o Doc 7 §1
 * fecha a questão — "nenhum limiar ou quantidade é constante, todos
 * configuráveis por curso". Então a escala é DADO, e a escala deste curso é
 * quatro linhas de seed com os descritores do Doc 6.
 *
 * `contaComoSuperacao` é a coluna que apaga o `>= 1` do código. O painel de
 * superação e o limiar de adiantamento (Doc 4 §5.2) leem esta coluna em vez de
 * comparar com um número, o que faz um curso com escala de cinco níveis
 * funcionar sem tocar em uma linha.
 *
 * Os descritores também são dados: são frases do método ("superou com apoio
 * direto do instrutor"), e escrevê-las em código seria pôr conteúdo de curso
 * dentro da plataforma.
 */
export const niveisDeAvaliacao = pgTable(
  'niveis_de_avaliacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    /** O número que o instrutor lança. */
    valor: integer('valor').notNull(),
    /** O que esse número significa, escrito para o instrutor ler na tela. */
    descritor: text('descritor').notNull(),
    /** Este nível conta como obstáculo superado? Substitui o `>= 1` em código. */
    contaComoSuperacao: boolean('conta_como_superacao').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('nivel_unico_por_curso').on(t.cursoId, t.valor)],
)

export const turmas = pgTable('turmas', {
  id: uuid('id').primaryKey().defaultRandom(),
  cursoId: uuid('curso_id')
    .notNull()
    .references(() => cursos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Material interativo de um dia (Doc 7 §2.1: "MaterialInterativo (slides, por
 * Dia)").
 *
 * Cada linha é uma **lâmina**. A leitura é literal: a spec fala em "slides,
 * por Dia", e o material do dia é o conjunto ordenado. Isso satisfaz os três
 * critérios da issue 4 sem inventar delimitador de conteúdo nem segunda
 * tabela — e a navegação em modo apresentação é percorrer `ordem`.
 *
 * A plataforma NÃO gera conteúdo pedagógico (Doc 7 §6): ela apresenta o que o
 * instrutor cadastrar.
 */
export const materiaisInterativos = pgTable(
  'materiais_interativos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    diaId: uuid('dia_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    titulo: text('titulo').notNull(),
    /** Markdown. Conteúdo entra como texto ou upload — sem editor próprio. */
    conteudo: text('conteudo').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Mesma disciplina de `blocos`: a ordem é do dado e é determinística.
    unique('lamina_ordem_unica_no_dia').on(t.diaId, t.ordem),
    check('lamina_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * Material de referência (Doc 7 §2.1: "MaterialDeReferencia (url, dia de
 * liberação)").
 *
 * É o repositório-espelho do instrutor, e é o **único material de recuperação
 * do curso** (Doc 5 §3.1). A plataforma não hospeda o código — guarda a URL.
 *
 * O atraso é deliberado e pedagógico (`D3-ORDEM`): liberar antes desmonta a
 * ordem dor → demonstração → resolução, porque a resposta fica disponível
 * durante o bloco em que travar é o produto do exercício.
 *
 * `diaDeLiberacao` é o dia a partir do qual o aluno vê. Qual dia escolher é
 * decisão do instrutor, não regra do código: o Doc 5 §3.1 diz que a proteção
 * vale para o dia corrente e não para os anteriores, e é o instrutor quem
 * traduz isso em calendário.
 */
export const materiaisDeReferencia = pgTable(
  'materiais_de_referencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    diaDeLiberacaoId: uuid('dia_de_liberacao_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    url: text('url').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A plataforma não hospeda código: se não é endereço, não é material de
    // referência. Rejeitado no banco, não na aplicação.
    check('material_de_referencia_e_url', sql`${t.url} ~ '^https?://'`),
  ],
)

// Doc 2 §3.1 e §3.2 · `D2-TRILHAS`. Não é taxonomia do curso: é distinção
// estrutural, porque a trilha desafio é opt-in e exige briefing.
export const trilhaEnum = pgEnum('trilha', ['padrao', 'desafio'])

/** Doc 7 §2.1 nomeia o banco como entidade própria, filha de `Curso`. */
export const bancosDeTemas = pgTable('bancos_de_temas', {
  id: uuid('id').primaryKey().defaultRandom(),
  cursoId: uuid('curso_id')
    .notNull()
    .references(() => cursos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const temas = pgTable(
  'temas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bancoDeTemasId: uuid('banco_de_temas_id')
      .notNull()
      .references(() => bancosDeTemas.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    // TEXTO, não enum: o Doc 2 §3.1 usa Fácil/Médio/Difícil neste curso, e
    // enumerar fixaria três níveis. O uso do nível na alocação é julgamento
    // do instrutor, não do sistema, então ordenação não é requisito.
    dificuldade: text('dificuldade').notNull(),
    trilha: trilhaEnum('trilha').notNull(),
    briefing: text('briefing'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Doc 2 §3.4: sem janela de pesquisa prévia, o briefing é o que substitui
    // a pesquisa. Trilha desafio sem briefing é tema inutilizável em sala.
    check(
      'desafio_exige_briefing',
      sql`${t.trilha} <> 'desafio' or ${t.briefing} is not null`,
    ),
  ],
)

export const grupos = pgTable(
  'grupos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turmas.id, { onDelete: 'cascade' }),
    temaId: uuid('tema_id').references(() => temas.id, { onDelete: 'set null' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * "Um `Tema` pertence a no máximo um `Grupo` por `Turma`" — Doc 7 §2.4,
     * `D2-BANCO`.
     *
     * Índice único PARCIAL: vários grupos podem estar sem tema, e `NULL` não
     * colide. É exatamente a capacidade pela qual a ADR 0001 §2 escolheu
     * Drizzle em vez de Prisma.
     *
     * Entra aqui porque a issue 20 cobra `escopo_pre_aprovado_respeita_
     * unicidade` e a constraint é o que garante isso. A issue 8 continua dona
     * do comportamento sob CONCORRÊNCIA, que é outro teste.
     */
    uniqueIndex('tema_unico_por_turma')
      .on(t.turmaId, t.temaId)
      .where(sql`${t.temaId} is not null`),
  ],
)

export const alunos = pgTable(
  'alunos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turmas.id, { onDelete: 'cascade' }),

    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    // Doc 6 §9.1: altera a origem da nota do Eixo 1, e não tem teto de nota.
    copiloto: boolean('copiloto').notNull().default(false),

    grupoId: uuid('grupo_id').references(() => grupos.id, { onDelete: 'set null' }),
    posicaoNoGrupo: integer('posicao_no_grupo'),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Uma matrícula por pessoa por turma.
    unique('aluno_unico_por_turma').on(t.usuarioId, t.turmaId),
    // Duas vagas iguais no mesmo grupo não existem. É isto que serializa
    // duas alocações concorrentes.
    unique('aluno_posicao_unica_no_grupo').on(t.grupoId, t.posicaoNoGrupo),
    check('posicao_no_grupo_positiva', sql`${t.posicaoNoGrupo} is null or ${t.posicaoNoGrupo} >= 1`),
    // Sem grupo não há posição; com grupo, há.
    check(
      'posicao_coerente_com_grupo',
      sql`(${t.grupoId} is null) = (${t.posicaoNoGrupo} is null)`,
    ),
  ],
)

/**
 * A `Estrutura` — o chassi que todos os grupos compartilham.
 *
 * O aluno escolhe o tema; a estrutura é fixa, e é essa combinação que faz o
 * curso ser administrável (Doc 1 §3). Uma por curso.
 */
export const estruturas = pgTable('estruturas', {
  id: uuid('id').primaryKey().defaultRandom(),
  cursoId: uuid('curso_id')
    .notNull()
    .unique()
    .references(() => cursos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Os papéis da estrutura.
 *
 * Quantos e quais são **configuração**, não enum: outro módulo terá outro
 * chassi. `obrigatorio` é o que a tabela de tradução precisa cobrir — papel
 * opcional pode ficar de fora sem invalidar o escopo.
 */
export const papeisDaEstrutura = pgTable(
  'papeis_da_estrutura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estruturaId: uuid('estrutura_id')
      .notNull()
      .references(() => estruturas.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    nome: text('nome').notNull(),
    obrigatorio: boolean('obrigatorio').notNull().default(true),
  },
  (t) => [
    unique('papel_ordem_unica_na_estrutura').on(t.estruturaId, t.ordem),
    unique('papel_nome_unico_na_estrutura').on(t.estruturaId, t.nome),
    check('papel_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * O formulário de escopo — versão genérica do contrato de domínio (`D2-CONTRATO`).
 *
 * A QUANTIDADE DE PERGUNTAS É CONFIGURAÇÃO. O Doc 2 §4.3 descreve sete neste
 * curso; nada aqui conta perguntas, e outro módulo instancia outro formulário.
 */
export const formularios = pgTable('formularios', {
  id: uuid('id').primaryKey().defaultRandom(),
  cursoId: uuid('curso_id')
    .notNull()
    .references(() => cursos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Pergunta do formulário.
 *
 * `criterioDeAceite` é o que torna a pergunta verificável — é dele que a issue
 * 7 vai derivar a validação. Sem critério declarado, a pergunta é opinião.
 */
export const perguntasDoFormulario = pgTable(
  'perguntas_do_formulario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formularioId: uuid('formulario_id')
      .notNull()
      .references(() => formularios.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    enunciado: text('enunciado').notNull(),
    criterioDeAceite: text('criterio_de_aceite').notNull(),
  },
  (t) => [
    unique('pergunta_ordem_unica_no_formulario').on(t.formularioId, t.ordem),
    check('pergunta_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * Tipos de regra que o motor de validação sabe executar.
 *
 * É a única lista fechada do motor, e ela descreve MECANISMOS, não perguntas.
 * Nenhum tipo aqui menciona "estados", "categorias" ou "C5": qual pergunta usa
 * qual mecanismo, com quais limites, é configuração (`Doc 2 §4.6`).
 */
export const tipoDeRegraEnum = pgEnum('tipo_de_regra', [
  /** A resposta não pode estar em branco. */
  'nao_vazio',
  /** A quantidade de itens da resposta fica numa faixa. */
  'contagem_de_itens',
  /** Todo item citado precisa existir na resposta de outra pergunta. */
  'referencia_declarada',
  /** Nenhum termo de uma lista negra pode aparecer. */
  'lista_negra',
])

/**
 * Regra de validação declarada NA PERGUNTA.
 *
 * A ADR 0001 §5 é explícita: o motor não é um schema Zod. As validações são
 * declaradas na pergunta e o motor interpreta — escrever `min(3).max(5)` em
 * código seria exatamente o literal com significado pedagógico que a regra 4.3
 * do CLAUDE.md proíbe.
 *
 * Por isso os limites moram em colunas, e a mensagem também: quem configura a
 * pergunta escreve o que o aluno vai ler quando errar.
 */
export const regrasDeValidacao = pgTable(
  'regras_de_validacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perguntaId: uuid('pergunta_id')
      .notNull()
      .references(() => perguntasDoFormulario.id, { onDelete: 'cascade' }),
    tipo: tipoDeRegraEnum('tipo').notNull(),

    /** Faixa de `contagem_de_itens`. Nulo em cada ponta significa sem limite. */
    minimo: integer('minimo'),
    maximo: integer('maximo'),

    /** Pergunta que declara o vocabulário aceito, para `referencia_declarada`. */
    perguntaDeReferenciaId: uuid('pergunta_de_referencia_id').references(
      (): AnyPgColumn => perguntasDoFormulario.id,
      { onDelete: 'cascade' },
    ),

    /** Termos recusados por `lista_negra`. Configurável por curso. */
    termos: text('termos').array(),

    /** O que o aluno lê quando a regra reprova. Escrito por quem configurou. */
    mensagem: text('mensagem').notNull(),
  },
  (t) => [
    unique('regra_unica_por_pergunta_e_tipo').on(t.perguntaId, t.tipo),
    // Faixa invertida seria regra que nunca passa, e o erro apareceria como
    // "formulário sempre reprovado" no D3 — longe da causa.
    check(
      'faixa_coerente',
      sql`${t.minimo} is null or ${t.maximo} is null or ${t.minimo} <= ${t.maximo}`,
    ),
  ],
)

/**
 * Julgamento que só um humano faz, declarado no formulário.
 *
 * O Doc 2 §4.6 separa as verificações em duas famílias: as que o motor executa
 * e as que dependem de leitura humana. As primeiras moram em
 * `regrasDeValidacao`; estas moram aqui, e é a lista que o instrutor percorre
 * na fila de aprovação.
 *
 * É TABELA, não constante, porque quantos julgamentos existem depende do
 * formulário do curso — e "quatro" é quantidade com significado pedagógico,
 * exatamente o que o CLAUDE.md §4.3 proíbe embutir em código.
 *
 * `perguntaId` é opcional: um julgamento normalmente aponta para a resposta que
 * ele avalia, mas pode ser sobre o conjunto.
 */
export const julgamentosHumanos = pgTable(
  'julgamentos_humanos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formularioId: uuid('formulario_id')
      .notNull()
      .references(() => formularios.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    /** O que o instrutor precisa decidir, escrito para ele ler em segundos. */
    enunciado: text('enunciado').notNull(),
    perguntaId: uuid('pergunta_id').references(() => perguntasDoFormulario.id, {
      onDelete: 'cascade',
    }),
  },
  (t) => [
    unique('julgamento_ordem_unica_no_formulario').on(t.formularioId, t.ordem),
    check('julgamento_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * Estados do formulário de escopo (Doc 2 §4.5).
 *
 * `rascunho` → `submetido` → `aprovado` | `devolvido`, e `devolvido` volta a
 * `submetido`. `aprovado` é terminal: a única mudança admitida depois dele é a
 * poda da issue 10, que não troca de estado.
 */
export const estadoDoEscopoEnum = pgEnum('estado_do_escopo', [
  'rascunho',
  'submetido',
  'aprovado',
  'devolvido',
])

/**
 * A resposta de escopo (Doc 7 §2.2: `RespostaDeEscopo` pendura em `Grupo`).
 *
 * Pertence ao GRUPO, não ao aluno: o contrato é preenchido e entregue uma vez
 * por grupo (Doc 2 §4.2). É o oposto do repositório, que é individual.
 *
 * `estado` e `submetidoEm` descrevem o mesmo fato por ângulos diferentes, e os
 * CHECKs abaixo impedem que discordem. `submetidoEm` continua sendo o instante
 * da submissão vigente porque é dele que sai a ordem da fila.
 *
 * A decisão do instrutor é UMA: aprovar ou devolver. Por isso `decididoEm` e
 * `decididoPorId` são um par só, e `estado` diz qual foi — em vez de
 * `aprovadoEm` e `devolvidoEm`, que admitiriam os dois preenchidos ao mesmo
 * tempo.
 */
export const respostasDeEscopo = pgTable(
  'respostas_de_escopo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    grupoId: uuid('grupo_id')
      .notNull()
      .unique()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    formularioId: uuid('formulario_id')
      .notNull()
      .references(() => formularios.id, { onDelete: 'restrict' }),
    estado: estadoDoEscopoEnum('estado').notNull().default('rascunho'),
    submetidoEm: timestamp('submetido_em', { withTimezone: true }),

    /** Quando o instrutor decidiu, e quem. Nulo enquanto não houve decisão. */
    decididoEm: timestamp('decidido_em', { withTimezone: true }),
    // `restrict`: apagar o instrutor não pode apagar o registro de quem
    // aprovou — a aprovação é o que autoriza o grupo a construir.
    decididoPorId: uuid('decidido_por_id').references(() => usuarios.id, { onDelete: 'restrict' }),

    /** O que o grupo precisa corrigir. Só existe enquanto devolvido. */
    motivoDaDevolucao: text('motivo_da_devolucao'),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Rascunho é exatamente "ainda não submetido". Sem isso, um estado poderia
    // dizer submetido com data nula e a fila ordenaria por nada.
    check('estado_coerente_com_submissao', sql`(${t.estado} = 'rascunho') = (${t.submetidoEm} is null)`),
    // Decisão registrada existe se e somente se houve decisão. Ao reenviar um
    // devolvido, o par se apaga junto com o motivo.
    check(
      'decisao_coerente_com_estado',
      sql`(${t.estado} in ('aprovado', 'devolvido'))
          = (${t.decididoEm} is not null and ${t.decididoPorId} is not null)`,
    ),
    // "Devolução exige motivo escrito" (Doc 2 §4.5): devolver sem dizer o que
    // corrigir gastaria de novo os 3 a 4 minutos que a fila tem por grupo.
    check(
      'devolucao_exige_motivo',
      sql`${t.estado} <> 'devolvido' or btrim(coalesce(${t.motivoDaDevolucao}, '')) <> ''`,
    ),
    // E o motivo não sobrevive à devolução: motivo pendurado em escopo
    // aprovado apareceria na tela do grupo como correção pendente.
    check('motivo_so_enquanto_devolvido', sql`${t.estado} = 'devolvido' or ${t.motivoDaDevolucao} is null`),
  ],
)

/** Uma resposta por pergunta, dentro da resposta de escopo do grupo. */
export const respostasDePergunta = pgTable(
  'respostas_de_pergunta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    respostaDeEscopoId: uuid('resposta_de_escopo_id')
      .notNull()
      .references(() => respostasDeEscopo.id, { onDelete: 'cascade' }),
    perguntaId: uuid('pergunta_id')
      .notNull()
      .references(() => perguntasDoFormulario.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('resposta_unica_por_pergunta').on(t.respostaDeEscopoId, t.perguntaId)],
)

/**
 * Registro diário de um aluno (Doc 7 §2.2: `Aluno ── RegistroDiario (por Dia)`).
 *
 * Pendura em `Aluno`, não em `Grupo`, e a razão está escrita: "avaliar o Eixo 1
 * por grupo faria um aluno ausente herdar a nota do parceiro" (Doc 7 §2.2,
 * `D6-CAPTURA` · Doc 6 §1.1). É a diferença entre uma nota que descreve alguém
 * e uma que descreve o vizinho dele.
 *
 * É o CONTÊINER do dia: avaliação de obstáculo, log e confirmação de push
 * penduram aqui, e o contrato diário (issue 12) e a reflexão de fechamento
 * (issue 23) vão pendurar no mesmo lugar. Sem contêiner, cada instrumento
 * carregaria `alunoId` e `diaId` por conta própria e a coerência entre eles
 * viraria convenção.
 *
 * Toda evidência é capturada AO VIVO, nos momentos que já existem no cronograma
 * (Doc 6 §0.3). Nada aqui é preenchido depois, num fim de semana de correção.
 */
export const registrosDiarios = pgTable(
  'registros_diarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    alunoId: uuid('aluno_id')
      .notNull()
      .references(() => alunos.id, { onDelete: 'cascade' }),
    diaId: uuid('dia_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'cascade' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  // Um registro por aluno por dia. Dois abririam a porta para duas avaliações
  // do mesmo obstáculo no mesmo dia, com valores diferentes, e nenhuma tela
  // saberia qual mostrar.
  (t) => [unique('registro_unico_por_aluno_e_dia').on(t.alunoId, t.diaId)],
)

/**
 * Avaliação de um obstáculo, na escala do curso (Doc 7 §2.4: "`AvaliacaoObstaculo`
 * só aceita 0–3", `D6-ESCALA`).
 *
 * O 0–3 não aparece aqui como CHECK. Ele é a escala DESTE curso, e mora em
 * `niveisDeAvaliacao`; a chave estrangeira é o que garante que só nível
 * configurado seja lançado. Escrever `between 0 and 3` cumpriria a linha do
 * Doc 7 §2.4 e violaria a do §1 na mesma tabela — e é o §1 que a regra 4.3 do
 * CLAUDE.md repete.
 *
 * `lancadoPorId` responde "quem lançou". Numa avaliação que pode divergir entre
 * integrantes do mesmo grupo, saber quem registrou a divergência é o que torna a
 * decisão discutível na defesa oral.
 *
 * Não existe coluna `divergente`. Divergência é a ausência de igualdade com o
 * parceiro — dado derivável, e uma flag poderia discordar dos números que ela
 * descreve.
 */
export const avaliacoesDeObstaculo = pgTable(
  'avaliacoes_de_obstaculo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDiarioId: uuid('registro_diario_id')
      .notNull()
      .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
    obstaculoId: uuid('obstaculo_id')
      .notNull()
      .references(() => obstaculos.id, { onDelete: 'cascade' }),
    // `restrict`: apagar o instrutor não pode apagar a nota que ele lançou.
    nivelId: uuid('nivel_id')
      .notNull()
      .references(() => niveisDeAvaliacao.id, { onDelete: 'restrict' }),
    lancadoPorId: uuid('lancado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    lancadoEm: timestamp('lancado_em', { withTimezone: true }).notNull().defaultNow(),
    /**
     * A nota de um obstaculo pode ser ajustada depois, para cima ou para baixo,
     * pelas perguntas da defesa oral (Doc 6 §3.2). Com só `lancadoEm` — que não
     * se move num UPDATE — o ajuste ficaria indistinguível do lançamento do dia,
     * e é no fechamento da nota que ele precisa ser auditável.
     */
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('avaliacao_unica_por_obstaculo_no_dia').on(t.registroDiarioId, t.obstaculoId)],
)

/**
 * Log de obstáculo: texto livre do aluno, por obstáculo, dentro do dia.
 *
 * Item do Eixo 3 (Doc 6 §5). Quantas linhas se espera é configuração do curso e
 * assunto do motor de validação, não desta tabela — aqui o texto é livre porque
 * o que o aluno escreve sobre onde travou não cabe em campo estruturado.
 *
 * Pendura no registro diário, e não direto no aluno, porque o log é do dia: é
 * escrito enquanto a memória do obstáculo é fresca.
 */
export const logsDeObstaculo = pgTable(
  'logs_de_obstaculo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDiarioId: uuid('registro_diario_id')
      .notNull()
      .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
    obstaculoId: uuid('obstaculo_id')
      .notNull()
      .references(() => obstaculos.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('log_unico_por_obstaculo_no_dia').on(t.registroDiarioId, t.obstaculoId),
    // Log em branco não é log: entraria na conta do Eixo 3 sem conteúdo.
    check('log_nao_vazio', sql`btrim(${t.texto}) <> ''`),
  ],
)

/**
 * Confirmação do push do dia (Doc 7 §2.2 · Doc 5 §6).
 *
 * "Mínimo 1 por dia, no fechamento da aula" e "o que se verifica é a existência
 * do push do dia" (Doc 5 §6 e §6.1). Existência, não granularidade — daí não
 * haver contagem de commits nem hash: a tabela registra que houve, e mais nada.
 *
 * É por ALUNO porque o repositório é individual (Doc 5 §6). Uma confirmação por
 * grupo daria ao ausente o push do parceiro.
 *
 * `confirmadoPorId` guarda quem confirmou em vez de assumir que foi o aluno ou o
 * instrutor: nenhum documento-dono diz qual dos dois declara, e inventar a
 * resposta aqui seria fixar em coluna uma decisão que ainda não existe. A matriz
 * de permissões resolve quem pode.
 *
 * A plataforma não lê o GitHub — isso está fora de escopo por decisão da issue.
 */
export const confirmacoesDePush = pgTable('confirmacoes_de_push', {
  id: uuid('id').primaryKey().defaultRandom(),
  registroDiarioId: uuid('registro_diario_id')
    .notNull()
    .unique()
    .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
  confirmadoPorId: uuid('confirmado_por_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  confirmadoEm: timestamp('confirmado_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Poda de escopo: a única edição admitida depois da aprovação.
 *
 * O formulário aprovado é imutável, com uma exceção — o instrutor reduz o escopo
 * declarado mantendo o mesmo tema (Doc 2 §4.5.1), porque rebaixamento de trilha
 * é poda, não troca de tema (Doc 5 §5.3).
 *
 * A tabela é o registro obrigatório dessa exceção, não um log opcional: o
 * gatilho só libera a escrita em escopo aprovado para quem apresenta o `id` de
 * uma poda desta mesma resposta. Sem linha aqui, não há edição — e é isso que
 * garante que nenhuma poda aconteça sem deixar rastro.
 *
 * Não existe `tipo`: o nome da tabela é o motivo admitido. Abrir outra razão
 * para editar depois da aprovação exigiria migration e decisão de documento-dono,
 * que é exatamente a fricção desejada.
 */
export const podas = pgTable(
  'podas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    respostaDeEscopoId: uuid('resposta_de_escopo_id')
      .notNull()
      .references(() => respostasDeEscopo.id, { onDelete: 'cascade' }),
    // `restrict`: apagar o instrutor não pode apagar o registro de quem podou o
    // escopo que passou a valer como gabarito de correção.
    podadoPorId: uuid('podado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    /** O que foi reduzido e por quê, escrito pelo instrutor. */
    motivo: text('motivo').notNull(),
    podadoEm: timestamp('podado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('poda_exige_motivo', sql`btrim(${t.motivo}) <> ''`)],
)

/**
 * A resposta como estava antes da poda.
 *
 * "Histórico guarda a versão anterior à poda" (Doc 2 §4.5.1). Guardar só a
 * versão nova perderia a informação de que houve redução — e a comparação entre
 * as duas é o que mostra o que o grupo deixou de entregar.
 *
 * É cópia congelada de propósito. `perguntaId` referencia a pergunta para a tela
 * conseguir rotular, mas o texto não acompanha edição posterior: o histórico
 * registra o que estava escrito naquele instante.
 */
export const respostasAnteriores = pgTable(
  'respostas_anteriores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    podaId: uuid('poda_id')
      .notNull()
      .references(() => podas.id, { onDelete: 'cascade' }),
    perguntaId: uuid('pergunta_id')
      .notNull()
      .references(() => perguntasDoFormulario.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
  },
  (t) => [unique('versao_anterior_unica_por_pergunta').on(t.podaId, t.perguntaId)],
)

/**
 * Tabela de tradução: papel da estrutura → nome no negócio → nome no código.
 *
 * "Nome de classe" no Doc 2 é vocabulário do curso; aqui é `nomeNoCodigo`,
 * pela tradução que o CLAUDE.md §2.3 exige.
 */
export const linhasDeTraducao = pgTable(
  'linhas_de_traducao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    respostaDeEscopoId: uuid('resposta_de_escopo_id')
      .notNull()
      .references(() => respostasDeEscopo.id, { onDelete: 'cascade' }),
    papelId: uuid('papel_id')
      .notNull()
      .references(() => papeisDaEstrutura.id, { onDelete: 'cascade' }),
    nomeNoNegocio: text('nome_no_negocio').notNull(),
    nomeNoCodigo: text('nome_no_codigo').notNull(),
  },
  (t) => [unique('traducao_unica_por_papel').on(t.respostaDeEscopoId, t.papelId)],
)

/**
 * Escopo pré-aprovado (Doc 7 §2.3: "EscopoPreAprovado — formulário de
 * emergência, pronto antes do D1").
 *
 * Doc 5 §5.1: o instrutor mantém contratos pré-aprovados de temas fáceis,
 * escritos antes do primeiro dia. Sem essa rede ele cede e aprova um contrato
 * ruim — e contrato ruim contamina os doze dias seguintes. É o que permite o
 * marco ser genuinamente duro sem deixar nenhum grupo encalhado.
 *
 * A QUANTIDADE não é constante: o Doc 5 fala de dois neste curso, e aqui é
 * apenas quantas linhas existirem. Nada no código conta escopos.
 *
 * E a plataforma NÃO valida "tema de nível fácil": `dificuldade` é rótulo
 * livre (issue 3), e checar "Fácil" seria hardcode de conceito do curso. Qual
 * tema merece um escopo de emergência é julgamento do instrutor.
 */
export const escoposPreAprovados = pgTable(
  'escopos_pre_aprovados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Um escopo pronto por tema: guardar dois para o mesmo tema não faz
    // sentido, e o tema é o que carrega a unicidade na alocação.
    temaId: uuid('tema_id')
      .notNull()
      .unique()
      .references(() => temas.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    /** O formulário já respondido, pronto para entregar. */
    conteudo: text('conteudo').notNull(),
    /** Grupo que recebeu. Nulo enquanto o escopo está de reserva. */
    grupoId: uuid('grupo_id')
      .unique()
      .references(() => grupos.id, { onDelete: 'set null' }),
    atribuidoEm: timestamp('atribuido_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Atribuído e sem data, ou com data e sem grupo, seria estado impossível.
    check(
      'atribuicao_coerente',
      sql`(${t.grupoId} is null) = (${t.atribuidoEm} is null)`,
    ),
  ],
)

export const repositorios = pgTable('repositorios', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Doc 5 §6 e Doc 7 §2.2: pendura em Aluno, não em Grupo. Um por aluno —
  // avaliar o Eixo 1 por grupo faria um aluno ausente herdar a nota do par.
  alunoId: uuid('aluno_id')
    .notNull()
    .unique()
    .references(() => alunos.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  publico: boolean('publico').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
