CREATE TABLE "materiais_interativos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lamina_ordem_unica_no_dia" UNIQUE("dia_id","ordem"),
	CONSTRAINT "lamina_ordem_positiva" CHECK ("materiais_interativos"."ordem" >= 1)
);
--> statement-breakpoint
ALTER TABLE "materiais_interativos" ADD CONSTRAINT "materiais_interativos_dia_id_dias_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias"("id") ON DELETE cascade ON UPDATE no action;