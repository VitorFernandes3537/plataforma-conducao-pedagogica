CREATE TABLE "escopos_pre_aprovados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tema_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"grupo_id" uuid,
	"atribuido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escopos_pre_aprovados_tema_id_unique" UNIQUE("tema_id"),
	CONSTRAINT "escopos_pre_aprovados_grupo_id_unique" UNIQUE("grupo_id"),
	CONSTRAINT "atribuicao_coerente" CHECK (("escopos_pre_aprovados"."grupo_id" is null) = ("escopos_pre_aprovados"."atribuido_em" is null))
);
--> statement-breakpoint
ALTER TABLE "escopos_pre_aprovados" ADD CONSTRAINT "escopos_pre_aprovados_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopos_pre_aprovados" ADD CONSTRAINT "escopos_pre_aprovados_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tema_unico_por_turma" ON "grupos" USING btree ("turma_id","tema_id") WHERE "grupos"."tema_id" is not null;