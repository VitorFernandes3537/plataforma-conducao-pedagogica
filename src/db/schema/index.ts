import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// Modelo genérico do Doc 7 §2.1 e §2.2, com as regras de integridade do §2.4.
//
// Nenhum nome aqui pode mencionar conceito de curso (CLAUDE.md §4.2), e
// nenhuma quantidade com significado pedagógico é constante (§4.3) — por
// isso o tamanho do grupo é coluna de `cursos`, não literal.

export const cursos = pgTable(
  'cursos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    // Doc 2 §2.4.1 diz "1 ou 2" para o curso da série. Aqui é configuração:
    // outro curso instancia outro valor.
    tamanhoMaximoDeGrupo: integer('tamanho_maximo_de_grupo').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('tamanho_maximo_de_grupo_positivo', sql`${t.tamanhoMaximoDeGrupo} >= 1`)],
)

export const turmas = pgTable('turmas', {
  id: uuid('id').primaryKey().defaultRandom(),
  cursoId: uuid('curso_id')
    .notNull()
    .references(() => cursos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const grupos = pgTable('grupos', {
  id: uuid('id').primaryKey().defaultRandom(),
  turmaId: uuid('turma_id')
    .notNull()
    .references(() => turmas.id, { onDelete: 'cascade' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const alunos = pgTable(
  'alunos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turmaId: uuid('turma_id')
      .notNull()
      .references(() => turmas.id, { onDelete: 'cascade' }),

    // Identidade é o ID numérico do GitHub, imutável (ADR 0002 §2). O login
    // é exibição: o usuário pode trocá-lo, e o antigo fica livre para outra
    // pessoa registrar.
    githubUserId: bigint('github_user_id', { mode: 'number' }).notNull().unique(),
    githubLogin: text('github_login').notNull(),
    nome: text('nome').notNull(),

    // Doc 6 §9.1: altera a origem da nota do Eixo 1, e não tem teto de nota.
    copiloto: boolean('copiloto').notNull().default(false),

    grupoId: uuid('grupo_id').references(() => grupos.id, { onDelete: 'set null' }),
    posicaoNoGrupo: integer('posicao_no_grupo'),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
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
