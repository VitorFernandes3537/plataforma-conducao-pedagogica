CREATE TABLE "estruturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estruturas_curso_id_unique" UNIQUE("curso_id")
);
--> statement-breakpoint
CREATE TABLE "formularios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linhas_de_traducao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resposta_de_escopo_id" uuid NOT NULL,
	"papel_id" uuid NOT NULL,
	"nome_no_negocio" text NOT NULL,
	"nome_no_codigo" text NOT NULL,
	CONSTRAINT "traducao_unica_por_papel" UNIQUE("resposta_de_escopo_id","papel_id")
);
--> statement-breakpoint
CREATE TABLE "papeis_da_estrutura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estrutura_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	CONSTRAINT "papel_ordem_unica_na_estrutura" UNIQUE("estrutura_id","ordem"),
	CONSTRAINT "papel_nome_unico_na_estrutura" UNIQUE("estrutura_id","nome"),
	CONSTRAINT "papel_ordem_positiva" CHECK ("papeis_da_estrutura"."ordem" >= 1)
);
--> statement-breakpoint
CREATE TABLE "perguntas_do_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulario_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"enunciado" text NOT NULL,
	"criterio_de_aceite" text NOT NULL,
	CONSTRAINT "pergunta_ordem_unica_no_formulario" UNIQUE("formulario_id","ordem"),
	CONSTRAINT "pergunta_ordem_positiva" CHECK ("perguntas_do_formulario"."ordem" >= 1)
);
--> statement-breakpoint
CREATE TABLE "respostas_de_escopo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"formulario_id" uuid NOT NULL,
	"submetido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respostas_de_escopo_grupo_id_unique" UNIQUE("grupo_id")
);
--> statement-breakpoint
CREATE TABLE "respostas_de_pergunta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resposta_de_escopo_id" uuid NOT NULL,
	"pergunta_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resposta_unica_por_pergunta" UNIQUE("resposta_de_escopo_id","pergunta_id")
);
--> statement-breakpoint
ALTER TABLE "estruturas" ADD CONSTRAINT "estruturas_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linhas_de_traducao" ADD CONSTRAINT "linhas_de_traducao_resposta_de_escopo_id_respostas_de_escopo_id_fk" FOREIGN KEY ("resposta_de_escopo_id") REFERENCES "public"."respostas_de_escopo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linhas_de_traducao" ADD CONSTRAINT "linhas_de_traducao_papel_id_papeis_da_estrutura_id_fk" FOREIGN KEY ("papel_id") REFERENCES "public"."papeis_da_estrutura"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papeis_da_estrutura" ADD CONSTRAINT "papeis_da_estrutura_estrutura_id_estruturas_id_fk" FOREIGN KEY ("estrutura_id") REFERENCES "public"."estruturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perguntas_do_formulario" ADD CONSTRAINT "perguntas_do_formulario_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "respostas_de_escopo_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "respostas_de_escopo_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_pergunta" ADD CONSTRAINT "respostas_de_pergunta_resposta_de_escopo_id_respostas_de_escopo_id_fk" FOREIGN KEY ("resposta_de_escopo_id") REFERENCES "public"."respostas_de_escopo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_pergunta" ADD CONSTRAINT "respostas_de_pergunta_pergunta_id_perguntas_do_formulario_id_fk" FOREIGN KEY ("pergunta_id") REFERENCES "public"."perguntas_do_formulario"("id") ON DELETE cascade ON UPDATE no action;