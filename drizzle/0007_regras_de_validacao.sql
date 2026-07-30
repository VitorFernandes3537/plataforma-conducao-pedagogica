CREATE TYPE "public"."tipo_de_regra" AS ENUM('nao_vazio', 'contagem_de_itens', 'referencia_declarada', 'lista_negra');--> statement-breakpoint
CREATE TABLE "regras_de_validacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pergunta_id" uuid NOT NULL,
	"tipo" "tipo_de_regra" NOT NULL,
	"minimo" integer,
	"maximo" integer,
	"pergunta_de_referencia_id" uuid,
	"termos" text[],
	"mensagem" text NOT NULL,
	CONSTRAINT "regra_unica_por_pergunta_e_tipo" UNIQUE("pergunta_id","tipo"),
	CONSTRAINT "faixa_coerente" CHECK ("regras_de_validacao"."minimo" is null or "regras_de_validacao"."maximo" is null or "regras_de_validacao"."minimo" <= "regras_de_validacao"."maximo")
);
--> statement-breakpoint
ALTER TABLE "regras_de_validacao" ADD CONSTRAINT "regras_de_validacao_pergunta_id_perguntas_do_formulario_id_fk" FOREIGN KEY ("pergunta_id") REFERENCES "public"."perguntas_do_formulario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regras_de_validacao" ADD CONSTRAINT "regras_de_validacao_pergunta_de_referencia_id_perguntas_do_formulario_id_fk" FOREIGN KEY ("pergunta_de_referencia_id") REFERENCES "public"."perguntas_do_formulario"("id") ON DELETE cascade ON UPDATE no action;