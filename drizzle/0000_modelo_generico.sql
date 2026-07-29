CREATE TABLE "alunos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turma_id" uuid NOT NULL,
	"github_user_id" bigint NOT NULL,
	"github_login" text NOT NULL,
	"nome" text NOT NULL,
	"copiloto" boolean DEFAULT false NOT NULL,
	"grupo_id" uuid,
	"posicao_no_grupo" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alunos_github_user_id_unique" UNIQUE("github_user_id"),
	CONSTRAINT "aluno_posicao_unica_no_grupo" UNIQUE("grupo_id","posicao_no_grupo"),
	CONSTRAINT "posicao_no_grupo_positiva" CHECK ("alunos"."posicao_no_grupo" is null or "alunos"."posicao_no_grupo" >= 1),
	CONSTRAINT "posicao_coerente_com_grupo" CHECK (("alunos"."grupo_id" is null) = ("alunos"."posicao_no_grupo" is null))
);
--> statement-breakpoint
CREATE TABLE "cursos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tamanho_maximo_de_grupo" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tamanho_maximo_de_grupo_positivo" CHECK ("cursos"."tamanho_maximo_de_grupo" >= 1)
);
--> statement-breakpoint
CREATE TABLE "grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turma_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositorios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"url" text NOT NULL,
	"publico" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositorios_aluno_id_unique" UNIQUE("aluno_id")
);
--> statement-breakpoint
CREATE TABLE "turmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_turma_id_turmas_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositorios" ADD CONSTRAINT "repositorios_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;