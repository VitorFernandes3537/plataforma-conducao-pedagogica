CREATE TABLE "materiais_de_referencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia_de_liberacao_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"url" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_de_referencia_e_url" CHECK ("materiais_de_referencia"."url" ~ '^https?://')
);
--> statement-breakpoint
ALTER TABLE "materiais_de_referencia" ADD CONSTRAINT "materiais_de_referencia_dia_de_liberacao_id_dias_id_fk" FOREIGN KEY ("dia_de_liberacao_id") REFERENCES "public"."dias"("id") ON DELETE cascade ON UPDATE no action;