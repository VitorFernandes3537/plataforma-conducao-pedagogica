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

// Doc 4 §4 e Doc 7 §2.1: go/no-go duro, ou triagem com consequência. São
// termos genéricos da spec, não vocabulário do curso.
export const marcoTipoEnum = pgEnum('marco_tipo', ['duro', 'triagem'])

/**
 * Sobre o que a superação é aferida (ADR 0005).
 *
 * NÃO é um fato do método: é escolha pedagógica do instrutor. Aluno falta, um
 * integrante se compromete menos que o outro, um par produz junto e outro
 * divide pela metade — qual desses conta como "superou" depende do objetivo do
 * módulo, não da plataforma.
 */
export const unidadeDeSuperacaoEnum = pgEnum('unidade_de_superacao', ['aluno', 'grupo'])

/**
 * Como o veredito de um grupo sai dos vereditos dos integrantes.
 *
 * Só faz sentido quando a unidade é `grupo`. As duas opções são defensáveis e
 * opostas: `todos_os_integrantes` protege quem ficaria para trás, ao custo de
 * travar a turma por um aluno; `qualquer_integrante` deixa a turma andar, ao
 * custo de carregar quem não acompanhou.
 *
 * Proporção de integrantes não entra: com grupo de 1 ou 2 pessoas ela colapsa
 * numa das duas, e seria um botão que não gira.
 */
export const criterioDeSuperacaoDoGrupoEnum = pgEnum('criterio_de_superacao_do_grupo', [
  'todos_os_integrantes',
  'qualquer_integrante',
])

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

    /**
     * Proporção de unidades que precisam ter superado para a turma adiantar.
     *
     * **Proporção, nunca número absoluto** (Doc 4 §5.2): o curso pode rodar com
     * oito grupos ou com quatorze, e um limiar absoluto significaria coisas
     * diferentes em cada turma.
     */
    limiarDeAdiantamento: numeric('limiar_de_adiantamento', {
      precision: 5,
      scale: 4,
      mode: 'number',
    }).notNull(),

    /** Sobre o que o limiar conta. Escolha do instrutor, não da plataforma. */
    unidadeDeSuperacao: unidadeDeSuperacaoEnum('unidade_de_superacao').notNull(),

    /** Como o grupo herda o veredito dos integrantes. Só quando a unidade é grupo. */
    criterioDeSuperacaoDoGrupo: criterioDeSuperacaoDoGrupoEnum('criterio_de_superacao_do_grupo'),

    /**
     * Quantos itens a seção "o que não muda" do incremento exige.
     *
     * A seção é obrigatória porque sem ela metade da turma entra em pânico e
     * reescreve o projeto inteiro — e o instrumento mede absorção, não reação ao
     * susto (Doc 6 §4.3). Quantos itens bastam para conter o pânico é
     * configuração: o gabarito do Doc 6 §4.2 mostra dois.
     */
    minimoDeItensImutaveis: integer('minimo_de_itens_imutaveis').notNull(),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tamanho_maximo_de_grupo_positivo', sql`${t.tamanhoMaximoDeGrupo} >= 1`),
    // Proporção é fração de 1. Zero deixaria a turma adiantar sempre, e acima de
    // 1 nunca — os dois desligam o limiar sem dizer que o desligaram.
    check(
      'limiar_e_proporcao',
      sql`${t.limiarDeAdiantamento} > 0 and ${t.limiarDeAdiantamento} <= 1`,
    ),
    // O critério de grupo existe se e somente se a unidade é grupo. Sem isso
    // haveria curso com política de grupo e aferição por aluno, que nenhuma tela
    // sabe desenhar.
    check('minimo_de_itens_imutaveis_positivo', sql`${t.minimoDeItensImutaveis} >= 1`),
    check(
      'criterio_de_grupo_coerente_com_unidade',
      sql`(${t.unidadeDeSuperacao} = 'grupo') = (${t.criterioDeSuperacaoDoGrupo} is not null)`,
    ),
    // Curso sem pergunta condutora não é curso por projetos. Vazio ou só
    // espaço é rejeitado pelo banco, não pela aplicação.
    check('pergunta_condutora_nao_vazia', sql`length(btrim(${t.perguntaCondutora})) > 0`),
  ],
)

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
    /**
     * O obstáculo trabalhado neste dia, quando há um.
     *
     * Nulo é o normal em boa parte do calendário: os dias de abertura, de marco
     * e de fechamento não têm obstáculo. Um obstáculo, por outro lado, ocupa
     * mais de um dia — o Doc 4 dá o mesmo obstáculo a dois dias seguidos —, e é
     * por isso que a referência mora aqui e não do outro lado.
     *
     * O dono do calendário é o Doc 4 (Doc 3 §2 chama o "dia previsto" de apenas
     * referência), e é o Doc 4 que atribui cada obstáculo aos seus dias.
     */
    obstaculoId: uuid('obstaculo_id').references((): AnyPgColumn => obstaculos.id, {
      onDelete: 'set null',
    }),
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
  /**
   * Quando a agregação da turma foi fechada.
   *
   * Nulo significa aberta, e é o fato que a matriz de permissões lê: "aluno não
   * vê nota antes da agregação" (Doc 7 §3). Nota parcial vazando no meio do
   * curso viraria o aluno estudando para o número em vez de para o obstáculo.
   */
  agregacaoFinalizadaEm: timestamp('agregacao_finalizada_em', { withTimezone: true }),
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
    /**
     * Esta resposta alimenta a derivação do incremento (Doc 6 §4.4).
     *
     * O documento nomeia as perguntas do curso dele; aqui é uma marca, porque
     * quais respostas o instrutor lê para derivar o incremento é configuração —
     * e escrever os códigos daquele formulário em código seria vocabulário de
     * curso na plataforma.
     */
    alimentaIncremento: boolean('alimenta_incremento').notNull().default(false),
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
 * Contrato diário (Doc 7 §2.2 · `D5-CONTRATODIARIO`).
 *
 * Duas linhas na abertura, uma no fechamento:
 *
 * > Hoje faremos: ___
 * > Hoje NÃO faremos: ___
 *
 * A segunda linha é a que importa. É a vacina contra o crescimento de escopo
 * dentro do dia, e cumpre no dia a mesma função que o "fora de escopo" cumpre
 * no projeto inteiro (Doc 5 §7.1). Por isso as duas são `notNull` com CHECK de
 * conteúdo: um contrato com metade das linhas não é contrato, e deixar a segunda
 * opcional a transformaria justamente no campo que ninguém preenche.
 *
 * Pendura no registro diário, que pendura em `Aluno`: o item de avaliação é
 * "participação no fechamento" (Doc 6 §5), e o Eixo 3 tem unidade de aluno
 * (Doc 6 §1.1).
 *
 * `cumprido` nulo significa dia ainda aberto. É fato, não estado inventado — a
 * abertura e o fechamento acontecem em momentos diferentes do dia, com 2 e 1
 * minuto de orçamento.
 */
export const contratosDiarios = pgTable(
  'contratos_diarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDiarioId: uuid('registro_diario_id')
      .notNull()
      .unique()
      .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
    faremos: text('faremos').notNull(),
    naoFaremos: text('nao_faremos').notNull(),
    /** Nulo enquanto o dia não foi fechado. */
    cumprido: boolean('cumprido'),
    /** "Cumpriu ou não, **e por quê**" (Doc 5 §7). O porquê não é opcional. */
    motivoDoFechamento: text('motivo_do_fechamento'),
    abertoEm: timestamp('aberto_em', { withTimezone: true }).notNull().defaultNow(),
    fechadoEm: timestamp('fechado_em', { withTimezone: true }),
  },
  (t) => [
    check('contrato_exige_o_que_faremos', sql`btrim(${t.faremos}) <> ''`),
    check('contrato_exige_o_que_nao_faremos', sql`btrim(${t.naoFaremos}) <> ''`),
    // Fechado é exatamente "tem veredito". Sem isso existiria contrato com data
    // de fechamento e sem resposta, que nenhuma tela sabe desenhar.
    check('fechamento_coerente', sql`(${t.cumprido} is null) = (${t.fechadoEm} is null)`),
    // O porquê acompanha o veredito. Fechar sem dizer por que perderia o insumo
    // da retrospectiva, que é o único retorno do custo diário (Doc 5 §7.2).
    check(
      'fechamento_exige_motivo',
      sql`${t.cumprido} is null or btrim(coalesce(${t.motivoDoFechamento}, '')) <> ''`,
    ),
    check(
      'motivo_so_no_fechamento',
      sql`${t.cumprido} is not null or ${t.motivoDoFechamento} is null`,
    ),
  ],
)

/**
 * Registro de recuperação (Doc 7 §2.3 · `D5-RECUPERACAO`).
 *
 * Cinco campos obrigatórios: aluno, dia, o que perdeu, o que repôs e por quem
 * (Doc 5 §3.3). Aluno e dia vêm do registro diário; os outros três moram aqui.
 *
 * É a única visibilidade do instrutor sobre quem está de fato acompanhando, e
 * alimenta a triagem dos marcos. Custa 30 segundos ao aluno — daí os campos
 * serem três, e nenhum deles opcional: um registro com metade preenchida não
 * responde a pergunta que o instrutor faz.
 *
 * **Sem unicidade por dia.** Quem perdeu duas coisas e repôs de formas
 * diferentes escreve duas linhas. O documento diz "por aluno e por dia", que é
 * onde o registro pendura, não quantos cabem.
 *
 * O "por quem" tem duas formas porque o Doc 5 §3.2 lista quatro fontes, e só
 * duas são pessoas: `repostoPorAlunoId` quando foi um colega, `fonteDeReposicao`
 * quando foi o material. Exatamente uma das duas — "por quem" tem uma resposta.
 *
 * Nada aqui dispara conversão a copiloto. "Não existe número de faltas que o
 * dispare" (Doc 5 §3.4): um limiar numérico transformaria exceção humana em
 * regra burocrática, e é justamente o tipo de constante que o CLAUDE.md §4.3
 * proíbe.
 */
export const registrosDeRecuperacao = pgTable(
  'registros_de_recuperacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDiarioId: uuid('registro_diario_id')
      .notNull()
      .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
    oQuePerdeu: text('o_que_perdeu').notNull(),
    oQueRepos: text('o_que_repos').notNull(),
    /**
     * Colega que repôs. **Qualquer colega da turma**, sem designação prévia
     * (Doc 5 §3.2) — e por isso não há vínculo com grupo aqui. O aluno solo não
     * tem parceiro de grupo, e restringir ao grupo o deixaria sem fonte humana.
     */
    repostoPorAlunoId: uuid('reposto_por_aluno_id').references(() => alunos.id, {
      onDelete: 'restrict',
    }),
    /** A fonte, quando não foi pessoa: material do dia, repositório-espelho. */
    fonteDeReposicao: text('fonte_de_reposicao'),
    registradoEm: timestamp('registrado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('recuperacao_exige_o_que_perdeu', sql`btrim(${t.oQuePerdeu}) <> ''`),
    check('recuperacao_exige_o_que_repos', sql`btrim(${t.oQueRepos}) <> ''`),
    // "Por quem" tem uma resposta: um colega OU uma fonte, nunca as duas nem
    // nenhuma. Sem isso o instrutor leria "repôs" sem saber com o quê.
    check(
      'recuperacao_exige_por_quem',
      sql`(${t.repostoPorAlunoId} is not null)
          <> (btrim(coalesce(${t.fonteDeReposicao}, '')) <> '')`,
    ),
  ],
)

/**
 * Situação de um item do mural (Doc 7 §2.3: `ItemDeMural (pergunta, autor,
 * status, Obstaculo)`).
 *
 * Dois valores, e não um booleano, porque o Doc 7 declara o campo como `status`
 * e porque riscar é ato com autor e instante — um booleano não teria onde
 * pendurá-los.
 */
export const statusDoItemDeMuralEnum = pgEnum('status_do_item_de_mural', ['aberto', 'resolvido'])

/**
 * Item do mural do "precisamos saber" (`D5-MURAL` · Doc 5 §8).
 *
 * Artefato canônico do método: torna visível o que os obstáculos produzem de
 * dúvida, em vez de deixá-la presumida. O mural físico continua existindo — a
 * plataforma **espelha**, não substitui (Doc 7 §6).
 *
 * `obstaculoId` é `notNull` porque a organização é por PERGUNTA de obstáculo,
 * nunca por número (Doc 5 §8.1, `D3-07`). Um item solto não tem onde aparecer:
 * é a pergunta que agrupa, e sem vínculo o item some da única tela que existe.
 *
 * O autor é o GRUPO, não o aluno. O Doc 5 §8.1 diz que quem escreve é o grupo,
 * sempre que trava — e quem digitou não é o fato registrado, quem travou é.
 *
 * (O documento-dono usa aqui o termo do curso; a tradução para `Grupo` é a
 * fronteira do CLAUDE.md §2.3 funcionando, não uma paráfrase solta.)
 *
 * Não há validação do texto. O Doc 5 §8.3 distingue a dúvida do pedido de
 * solução com exemplos, e essa é leitura humana; automatizá-la seria a
 * plataforma corrigindo conteúdo, que o Doc 7 §6 exclui.
 */
export const itensDeMural = pgTable(
  'itens_de_mural',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    grupoId: uuid('grupo_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    obstaculoId: uuid('obstaculo_id')
      .notNull()
      .references(() => obstaculos.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    status: statusDoItemDeMuralEnum('status').notNull().default('aberto'),
    // `restrict`: apagar o instrutor não pode apagar o registro de quem riscou.
    resolvidoPorId: uuid('resolvido_por_id').references(() => usuarios.id, {
      onDelete: 'restrict',
    }),
    resolvidoEm: timestamp('resolvido_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('item_de_mural_nao_vazio', sql`btrim(${t.texto}) <> ''`),
    // Riscado é exatamente "tem quem riscou e quando". Sem isso existiria item
    // resolvido sem responsável, e o mural é consultado na abertura de todo dia
    // justamente para saber o que já foi respondido e por quem.
    check(
      'resolucao_coerente_com_status',
      sql`(${t.status} = 'resolvido')
          = (${t.resolvidoEm} is not null and ${t.resolvidoPorId} is not null)`,
    ),
  ],
)

/**
 * Rodada de crítica entre pares (Doc 7 §2.3 · `D5-CRITICA`).
 *
 * Quantas rodadas existem é configuração: o Doc 5 §4 descreve duas para o curso
 * da série, e `ordem` é 1..N. O roteiro de cada uma é próprio — a primeira
 * revisa arquitetura, a segunda revisa como o colega absorveu a mudança —, e
 * por isso as perguntas moram em tabela e não em código.
 */
export const rodadasDeCritica = pgTable(
  'rodadas_de_critica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    nome: text('nome').notNull(),
    /** O dia em que acontece. O dono do calendário é o Doc 4. */
    diaId: uuid('dia_id').references(() => dias.id, { onDelete: 'set null' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('rodada_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    check('rodada_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * Pergunta do roteiro de uma rodada (Doc 5 §4.3 e §4.4).
 *
 * São conduzidas em voz alta, não respondidas por escrito — o que se registra
 * na plataforma é a explicação do tema alheio e o cenário de quebra (§4.2). O
 * roteiro existe para o revisor iniciante ter por onde começar, e muda entre as
 * rodadas porque o objeto da revisão muda.
 */
export const perguntasDoRoteiro = pgTable(
  'perguntas_do_roteiro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rodadaId: uuid('rodada_id')
      .notNull()
      .references(() => rodadasDeCritica.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    enunciado: text('enunciado').notNull(),
  },
  (t) => [
    unique('pergunta_do_roteiro_unica_na_rodada').on(t.rodadaId, t.ordem),
    check('pergunta_do_roteiro_ordem_positiva', sql`${t.ordem} >= 1`),
    check('pergunta_do_roteiro_nao_vazia', sql`btrim(${t.enunciado}) <> ''`),
  ],
)

/**
 * Um sentido da crítica: quem revisa e quem é revisado (Doc 7 §2.3).
 *
 * O par de grupos trabalha nos DOIS sentidos na mesma sessão — "25 minutos por
 * direção" (Doc 5 §4.5), que somados à plenária dão os 55 minutos do primeiro
 * encontro. Por isso um emparelhamento produz duas linhas aqui, e não uma.
 *
 * `unique(rodada, revisor)` porque um grupo revisa um só na rodada, e
 * `unique(rodada, revisado)` porque recebe de um só. Juntas, as duas fazem do
 * sorteio um emparelhamento de verdade em vez de uma lista de pares soltos.
 */
export const paresDeCritica = pgTable(
  'pares_de_critica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rodadaId: uuid('rodada_id')
      .notNull()
      .references(() => rodadasDeCritica.id, { onDelete: 'cascade' }),
    revisorId: uuid('revisor_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    revisadoId: uuid('revisado_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('revisor_unico_na_rodada').on(t.rodadaId, t.revisorId),
    unique('revisado_unico_na_rodada').on(t.rodadaId, t.revisadoId),
    // Grupo não revisa a si mesmo: o ponto da crítica é enxergar tema alheio.
    check('critica_nao_e_do_proprio_grupo', sql`${t.revisorId} <> ${t.revisadoId}`),
  ],
)

/**
 * O registro escrito de um sentido da crítica (Doc 5 §4.2 e §4.5).
 *
 * Os dois campos são obrigatórios e são a regra inteira:
 *
 * > Antes de comentar qualquer linha, o revisor precisa explicar o tema do
 * > colega em uma frase. E precisa entregar pelo menos um cenário concreto que
 * > quebra — não uma opinião.
 *
 * Sem eles a crítica entre iniciantes vira elogio mútuo e o curso perde 115
 * minutos. Por isso são `notNull` com CHECK de conteúdo: um registro sem os dois
 * não é registro, e deixá-los opcionais os transformaria nos campos que ninguém
 * preenche.
 *
 * A nota da crítica não existe aqui. Ela entra no eixo de prática pela
 * EXISTÊNCIA do registro, e pontuar a qualidade da crítica faria o iniciante
 * escrever para a nota em vez de para o colega.
 */
export const registrosDeCritica = pgTable(
  'registros_de_critica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parId: uuid('par_id')
      .notNull()
      .unique()
      .references(() => paresDeCritica.id, { onDelete: 'cascade' }),
    /** O tema do colega, em uma frase, escrito antes de olhar o código. */
    explicacaoDoTema: text('explicacao_do_tema').notNull(),
    /** Um cenário concreto que quebra. "Achei confuso" não é cenário. */
    cenarioQueQuebra: text('cenario_que_quebra').notNull(),
    registradoEm: timestamp('registrado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('critica_exige_explicacao', sql`btrim(${t.explicacaoDoTema}) <> ''`),
    check('critica_exige_cenario', sql`btrim(${t.cenarioQueQuebra}) <> ''`),
  ],
)

/**
 * Versão do incremento entregue a um grupo (Doc 5 §5.2 · Doc 6 §4.6).
 *
 * A triagem do terceiro marco decide qual das duas o grupo recebe. "Mesma
 * estrutura, menos superfície": a versão reduzida não é mais fácil, é menor — e
 * não tem teto de nota diferente.
 */
export const versaoDoIncrementoEnum = pgEnum('versao_do_incremento', ['integral', 'reduzida'])

/**
 * Uma das mudanças que o incremento pede, declarada pelo CURSO (`D6-ENVELOPE`).
 *
 * O Doc 6 §4.1 diz que as mudanças são as mesmas para toda a turma,
 * instanciadas por domínio — variar os tipos torna os resultados incomparáveis
 * e triplica o custo de autoria. Então o curso declara quais são, e o instrutor
 * só instancia.
 *
 * Está em tabela, e não em código, por duas razões que se somam. O Doc 6 nomeia
 * as mudanças com vocabulário do chassi, que a regra §4.2 do CLAUDE.md proíbe em
 * coluna. E outro curso terá outras mudanças — o instrumento é o formato, não o
 * conteúdo.
 *
 * `entraNaVersaoReduzida` é o que faz a redução ser dado. A versão reduzida não
 * some com uma mudança por condicional em código: ela inclui só o que o curso
 * marcou, e o próprio curso decide o que sobrevive.
 */
export const modelosDeMudanca = pgTable(
  'modelos_de_mudanca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    /** O que esta mudança é, escrito para o instrutor ler ao preencher. */
    rotulo: text('rotulo').notNull(),
    entraNaVersaoReduzida: boolean('entra_na_versao_reduzida').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('modelo_de_mudanca_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    check('modelo_de_mudanca_ordem_positiva', sql`${t.ordem} >= 1`),
    check('modelo_de_mudanca_rotulo_nao_vazio', sql`btrim(${t.rotulo}) <> ''`),
  ],
)

/**
 * Uma lacuna declarada de uma mudança.
 *
 * O Doc 6 §13 é explícito ao endereçar o Doc 7: **"as lacunas do gabarito são
 * campos, não texto livre"**. Um único campo de texto por mudança cumpriria a
 * função de guardar e perderia a de estruturar — e o gabarito existe justamente
 * para o instrutor não ter de reconstruir o formato a cada grupo.
 *
 * `chave` é o identificador estável que a tela usa; `rotulo` é o que o humano
 * lê. Os dois separados porque o rótulo é conteúdo do curso e pode mudar sem
 * quebrar nada que já foi preenchido.
 */
export const lacunasDoModelo = pgTable(
  'lacunas_do_modelo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modeloDeMudancaId: uuid('modelo_de_mudanca_id')
      .notNull()
      .references(() => modelosDeMudanca.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    chave: text('chave').notNull(),
    rotulo: text('rotulo').notNull(),
    obrigatoria: boolean('obrigatoria').notNull(),
  },
  (t) => [
    unique('lacuna_ordem_unica_no_modelo').on(t.modeloDeMudancaId, t.ordem),
    unique('lacuna_chave_unica_no_modelo').on(t.modeloDeMudancaId, t.chave),
    check('lacuna_ordem_positiva', sql`${t.ordem} >= 1`),
    check('lacuna_chave_nao_vazia', sql`btrim(${t.chave}) <> ''`),
  ],
)

/**
 * O incremento de um grupo (Doc 7 §2.2: pendura em `Grupo` · `D6-ENVELOPE`).
 *
 * "O envelope não se escreve — ele se deriva da resposta de escopo do grupo"
 * (Doc 6 §4.1). `respostaDeEscopoId` não é referência decorativa: é a prova da
 * derivação, e um gatilho exige que ela esteja **aprovada**, cumprindo o
 * Doc 7 §2.4.
 *
 * `remetente` é obrigatório. O envelope vem assinado por um interessado nomeado
 * do domínio, e isso não é enfeite — é o que faz a mudança deixar de ser tarefa
 * do professor e virar pedido de alguém (Doc 6 §4.2.1). Custo: uma linha.
 *
 * `diaDeLiberacaoId` reusa o mecanismo do material de referência: o aluno não
 * vê antes do dia chegar, e o filtro é de consulta, não de tela.
 */
export const incrementos = pgTable(
  'incrementos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    grupoId: uuid('grupo_id')
      .notNull()
      .unique()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    // `restrict`: apagar o escopo aprovado apagaria a origem da derivação.
    respostaDeEscopoId: uuid('resposta_de_escopo_id')
      .notNull()
      .references(() => respostasDeEscopo.id, { onDelete: 'restrict' }),
    /** O interessado do domínio que assina o pedido. */
    remetente: text('remetente').notNull(),
    /** Uma frase de negócio que situa a mudança. */
    contexto: text('contexto').notNull(),
    versao: versaoDoIncrementoEnum('versao').notNull(),
    diaDeLiberacaoId: uuid('dia_de_liberacao_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'restrict' }),
    criadoPorId: uuid('criado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('incremento_exige_remetente', sql`btrim(${t.remetente}) <> ''`),
    check('incremento_exige_contexto', sql`btrim(${t.contexto}) <> ''`),
  ],
)

/** O que o instrutor preencheu numa lacuna. */
export const valoresDaLacuna = pgTable(
  'valores_da_lacuna',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incrementoId: uuid('incremento_id')
      .notNull()
      .references(() => incrementos.id, { onDelete: 'cascade' }),
    lacunaId: uuid('lacuna_id')
      .notNull()
      .references(() => lacunasDoModelo.id, { onDelete: 'cascade' }),
    valor: text('valor').notNull(),
  },
  (t) => [
    unique('valor_unico_por_lacuna').on(t.incrementoId, t.lacunaId),
    check('valor_da_lacuna_nao_vazio', sql`btrim(${t.valor}) <> ''`),
  ],
)

/**
 * Um item da seção "o que não muda".
 *
 * A seção é obrigatória: sem ela metade da turma entra em pânico e reescreve o
 * projeto inteiro, e o instrumento mede absorção, não reação ao susto
 * (Doc 6 §4.3). Quantos itens bastam é configuração do curso.
 */
export const itensImutaveis = pgTable(
  'itens_imutaveis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incrementoId: uuid('incremento_id')
      .notNull()
      .references(() => incrementos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    texto: text('texto').notNull(),
  },
  (t) => [
    unique('item_imutavel_ordem_unica').on(t.incrementoId, t.ordem),
    check('item_imutavel_ordem_positiva', sql`${t.ordem} >= 1`),
    check('item_imutavel_nao_vazio', sql`btrim(${t.texto}) <> ''`),
  ],
)

/** Sobre quem um eixo da rubrica é apurado (Doc 6 §1.1 · Doc 7 §2.3). */
export const unidadeDoEixoEnum = pgEnum('unidade_do_eixo', ['aluno', 'grupo'])

/**
 * De onde o eixo tira as notas que agrega.
 *
 * É a única lista fechada do agregador, e descreve MECANISMOS, não eixos: qual
 * curso tem quantos eixos, com que peso e lendo qual fonte, é configuração. Faz
 * o mesmo papel que `tipoDeRegraEnum` faz no motor de validação.
 *
 * Cresce por migration quando uma issue traz uma fonte nova — o eixo de prática
 * depende de instrumentos que a issue 23 ainda vai fechar.
 */
export const fonteDoEixoEnum = pgEnum('fonte_do_eixo', [
  'avaliacao_de_obstaculo',
  'avaliacao_de_incremento',
  'presenca_de_instrumentos',
])

/**
 * Instrumentos cuja PRESENÇA o agregador sabe conferir.
 *
 * O eixo de prática não pontua qualidade — pontua entrega. O Doc 6 §5 é
 * explícito no push: "frequência, existência do push, não granularidade". E o
 * §5.1 repete sobre commits: o que conta é a existência do registro.
 *
 * Mecanismos, não itens de curso: qual eixo confere quais instrumentos, e com
 * que peso, é configuração. `historico_de_commits` não entra porque a
 * plataforma não lê o GitHub — está fora de escopo em toda issue que toca o
 * assunto.
 */
export const tipoDeInstrumentoEnum = pgEnum('tipo_de_instrumento', [
  'confirmacao_de_push',
  'log_de_obstaculo',
  'contrato_diario',
  'registro_de_critica',
  'reflexao_de_fechamento',
])

/**
 * Um eixo da rubrica (Doc 7 §2.3: `Rubrica ── Eixo (peso, unidade)`).
 *
 * Quantos eixos, com que peso e sobre quem — tudo configuração. O Doc 6 §13
 * endereça isso ao Doc 7 com todas as letras: "três agregações distintas, com
 * **pesos configuráveis**".
 *
 * `unidade` é o que o Doc 6 §1.1 declara e o Doc 7 §2.4 repete: um eixo apura
 * por aluno, outro por grupo. Avaliar tudo por grupo faria um aluno ausente
 * herdar a nota do parceiro; avaliar tudo por aluno partiria em dois um
 * instrumento que é entregue em conjunto.
 *
 * **Não existe tabela de item de avaliação.** O Doc 7 §2.3 esboça
 * `Eixo ── ItemDeAvaliacao (escala, peso)`, mas os itens já existem como
 * entidades: os itens do primeiro eixo são os obstáculos, e o peso deles é
 * `obstaculos.peso`, que o próprio Doc 7 §2.4 declara. Criar a tabela daria dois
 * donos ao mesmo peso, e o Doc 7 é derivado — o §2 diz "sem tipos, sem SQL, isso
 * é decisão do desenvolvedor".
 */
export const eixos = pgTable(
  'eixos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    nome: text('nome').notNull(),
    /** Proporção do total. A soma dos eixos do curso é conferida na leitura. */
    peso: numeric('peso', { precision: 6, scale: 4, mode: 'number' }).notNull(),
    unidade: unidadeDoEixoEnum('unidade').notNull(),
    fonte: fonteDoEixoEnum('fonte').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('eixo_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    unique('eixo_fonte_unica_no_curso').on(t.cursoId, t.fonte),
    check('eixo_ordem_positiva', sql`${t.ordem} >= 1`),
    // Peso zero tiraria o eixo da nota sem tirá-lo da rubrica: o aluno seria
    // avaliado num eixo que não vale nada, e ninguém veria.
    check('eixo_peso_positivo', sql`${t.peso} > 0`),
    check('eixo_nome_nao_vazio', sql`btrim(${t.nome}) <> ''`),
  ],
)

/**
 * Um instrumento que o eixo confere, com o peso dele.
 *
 * O Doc 6 §5 dá pesos diferentes: a reflexão da linguagem espelho tem "peso
 * pequeno" (§7) e o histórico de commits, "peso baixo" (§5.1). Quanto vale cada
 * um é do curso — e sem peso por instrumento o eixo trataria a confirmação de
 * push e a reflexão que captura o pensamento como a mesma coisa.
 */
export const instrumentosDoEixo = pgTable(
  'instrumentos_do_eixo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eixoId: uuid('eixo_id')
      .notNull()
      .references(() => eixos.id, { onDelete: 'cascade' }),
    tipo: tipoDeInstrumentoEnum('tipo').notNull(),
    peso: numeric('peso', { precision: 6, scale: 4, mode: 'number' }).notNull(),
  },
  (t) => [
    unique('instrumento_unico_no_eixo').on(t.eixoId, t.tipo),
    check('instrumento_peso_positivo', sql`${t.peso} > 0`),
  ],
)

/**
 * Uma reflexão de fechamento declarada pelo curso (Doc 6 §5.1 e §7).
 *
 * São duas no curso da série, e as duas capturam coisas diferentes: uma olha o
 * código pela linguagem espelho, e a outra olha o PENSAMENTO. O §5.1 diz que a
 * segunda é "o único instrumento que captura o pensamento, e sem ele a tese
 * central não é avaliada em lugar nenhum".
 *
 * O enunciado é dado, e por dois motivos que se somam: é conteúdo do curso, e a
 * pergunta é o instrumento inteiro — trocar a pergunta é trocar o que se
 * captura.
 *
 * `diaId` é o dia em que a reflexão é respondida. Um gatilho amarra a resposta
 * a ele, senão a retrospectiva do último dia poderia ser respondida no
 * primeiro, quando não há o que retrospectar.
 */
export const reflexoesDeFechamento = pgTable(
  'reflexoes_de_fechamento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    enunciado: text('enunciado').notNull(),
    diaId: uuid('dia_id')
      .notNull()
      .references(() => dias.id, { onDelete: 'restrict' }),
  },
  (t) => [
    unique('reflexao_ordem_unica_no_curso').on(t.cursoId, t.ordem),
    check('reflexao_ordem_positiva', sql`${t.ordem} >= 1`),
    check('reflexao_enunciado_nao_vazio', sql`btrim(${t.enunciado}) <> ''`),
  ],
)

/**
 * A resposta de um aluno a uma reflexão.
 *
 * Pendura no registro diário, que pendura em aluno e dia — é o mesmo contêiner
 * do push, do log e do contrato, e é o que dá a "pertence a um aluno e a um
 * dia" sem cada instrumento carregar os dois por conta própria.
 *
 * "Não há resposta certa. Avalia-se se a resposta demonstra consciência da
 * mudança, não se ela usa o vocabulário correto" (Doc 6 §5.1). Por isso o texto
 * é livre e nada aqui o pontua: o eixo confere que a reflexão existe.
 */
export const respostasDeReflexao = pgTable(
  'respostas_de_reflexao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDiarioId: uuid('registro_diario_id')
      .notNull()
      .references(() => registrosDiarios.id, { onDelete: 'cascade' }),
    reflexaoId: uuid('reflexao_id')
      .notNull()
      .references(() => reflexoesDeFechamento.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('resposta_unica_por_reflexao').on(t.registroDiarioId, t.reflexaoId),
    check('resposta_de_reflexao_nao_vazia', sql`btrim(${t.texto}) <> ''`),
  ],
)

/**
 * A nota de uma das mudanças do incremento (Doc 6 §4.5).
 *
 * "M1 absorvida sem alterar classe existente" e "M2 absorvida com as
 * invariantes preservadas", cada uma na escala do curso. Pendura no incremento,
 * que pendura no grupo — é o único eixo cuja unidade é o grupo, porque o
 * incremento é um por domínio e absorvido em conjunto (Doc 6 §1.1).
 */
export const avaliacoesDeMudanca = pgTable(
  'avaliacoes_de_mudanca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incrementoId: uuid('incremento_id')
      .notNull()
      .references(() => incrementos.id, { onDelete: 'cascade' }),
    modeloDeMudancaId: uuid('modelo_de_mudanca_id')
      .notNull()
      .references(() => modelosDeMudanca.id, { onDelete: 'cascade' }),
    nivelId: uuid('nivel_id')
      .notNull()
      .references(() => niveisDeAvaliacao.id, { onDelete: 'restrict' }),
    lancadoPorId: uuid('lancado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('avaliacao_unica_por_mudanca').on(t.incrementoId, t.modeloDeMudancaId)],
)

/**
 * O banco de perguntas da defesa oral (`D6-DEFESA`).
 *
 * O Doc 6 §6 lista seis para o curso da série, instanciadas na hora sobre o
 * código de cada grupo. Quantas existem e quais são é configuração — são
 * conteúdo do curso, e escrevê-las em código seria pôr o roteiro da avaliação
 * dentro da plataforma.
 */
export const perguntasDaDefesa = pgTable(
  'perguntas_da_defesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    enunciado: text('enunciado').notNull(),
  },
  (t) => [
    unique('pergunta_da_defesa_ordem_unica').on(t.cursoId, t.ordem),
    check('pergunta_da_defesa_ordem_positiva', sql`${t.ordem} >= 1`),
    check('pergunta_da_defesa_nao_vazia', sql`btrim(${t.enunciado}) <> ''`),
  ],
)

/**
 * A defesa oral de um grupo (Doc 7 §2.3 · Doc 6 §6).
 *
 * Pendura no grupo porque a apresentação é do grupo — inclusive a do aluno
 * convertido a copiloto, que apresenta em conjunto (Doc 5 §3.4).
 */
export const registrosDeDefesa = pgTable('registros_de_defesa', {
  id: uuid('id').primaryKey().defaultRandom(),
  grupoId: uuid('grupo_id')
    .notNull()
    .unique()
    .references(() => grupos.id, { onDelete: 'cascade' }),
  registradoPorId: uuid('registrado_por_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  realizadaEm: timestamp('realizada_em', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Quais perguntas do banco foram usadas nesta defesa.
 *
 * Registrar isso é o que torna a defesa auditável: duas perguntas por grupo,
 * escolhidas na hora, e sem o registro ninguém consegue depois explicar por que
 * a nota de um grupo subiu e a de outro não.
 */
export const perguntasUsadasNaDefesa = pgTable(
  'perguntas_usadas_na_defesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDeDefesaId: uuid('registro_de_defesa_id')
      .notNull()
      .references(() => registrosDeDefesa.id, { onDelete: 'cascade' }),
    perguntaId: uuid('pergunta_id')
      .notNull()
      .references(() => perguntasDaDefesa.id, { onDelete: 'restrict' }),
    ordem: integer('ordem').notNull(),
  },
  (t) => [
    unique('pergunta_usada_unica_na_defesa').on(t.registroDeDefesaId, t.perguntaId),
    unique('ordem_unica_na_defesa').on(t.registroDeDefesaId, t.ordem),
    check('pergunta_usada_ordem_positiva', sql`${t.ordem} >= 1`),
  ],
)

/**
 * O que a defesa disse sobre um eixo.
 *
 * `alunoId` nulo quando o eixo apura por grupo; preenchido quando apura por
 * aluno — e um gatilho amarra os dois, porque nota de aluno num eixo de grupo
 * seria uma nota que a agregação não sabe onde somar.
 *
 * Para o aluno em estado de copiloto, esta é a ÚNICA origem do eixo do modelo:
 * ele é avaliado pela defesa, não pelo repositório (Doc 6 §9.1). Para os
 * demais, o Doc 6 §6 diz que as respostas "ajustam para cima ou para baixo" sem
 * dizer quanto — então o valor fica registrado e a agregação o entrega ao lado
 * da nota apurada, sem aplicá-lo. Inventar o tamanho do ajuste seria inventar
 * fato.
 */
export const avaliacoesDaDefesa = pgTable(
  'avaliacoes_da_defesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registroDeDefesaId: uuid('registro_de_defesa_id')
      .notNull()
      .references(() => registrosDeDefesa.id, { onDelete: 'cascade' }),
    eixoId: uuid('eixo_id')
      .notNull()
      .references(() => eixos.id, { onDelete: 'cascade' }),
    alunoId: uuid('aluno_id').references(() => alunos.id, { onDelete: 'cascade' }),
    nivelId: uuid('nivel_id')
      .notNull()
      .references(() => niveisDeAvaliacao.id, { onDelete: 'restrict' }),
  },
  (t) => [unique('avaliacao_da_defesa_unica').on(t.registroDeDefesaId, t.eixoId, t.alunoId)],
)

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
