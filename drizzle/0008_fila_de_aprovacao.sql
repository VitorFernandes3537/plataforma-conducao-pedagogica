CREATE TYPE "public"."estado_do_escopo" AS ENUM('rascunho', 'submetido', 'aprovado', 'devolvido');--> statement-breakpoint
CREATE TABLE "julgamentos_humanos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulario_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"enunciado" text NOT NULL,
	"pergunta_id" uuid,
	CONSTRAINT "julgamento_ordem_unica_no_formulario" UNIQUE("formulario_id","ordem"),
	CONSTRAINT "julgamento_ordem_positiva" CHECK ("julgamentos_humanos"."ordem" >= 1)
);
--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD COLUMN "estado" "estado_do_escopo" DEFAULT 'rascunho' NOT NULL;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD COLUMN "decidido_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD COLUMN "decidido_por_id" uuid;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD COLUMN "motivo_da_devolucao" text;--> statement-breakpoint
ALTER TABLE "julgamentos_humanos" ADD CONSTRAINT "julgamentos_humanos_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "julgamentos_humanos" ADD CONSTRAINT "julgamentos_humanos_pergunta_id_perguntas_do_formulario_id_fk" FOREIGN KEY ("pergunta_id") REFERENCES "public"."perguntas_do_formulario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "respostas_de_escopo_decidido_por_id_usuarios_id_fk" FOREIGN KEY ("decidido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Backfill antes dos CHECKs: escopo já submetido antes desta migration nasceria
-- com estado 'rascunho' e violaria `estado_coerente_com_submissao`. O default da
-- coluna serve para linha nova, não para o passado.
UPDATE "respostas_de_escopo" SET "estado" = 'submetido' WHERE "submetido_em" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "estado_coerente_com_submissao" CHECK (("respostas_de_escopo"."estado" = 'rascunho') = ("respostas_de_escopo"."submetido_em" is null));--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "decisao_coerente_com_estado" CHECK (("respostas_de_escopo"."estado" in ('aprovado', 'devolvido'))
          = ("respostas_de_escopo"."decidido_em" is not null and "respostas_de_escopo"."decidido_por_id" is not null));--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "devolucao_exige_motivo" CHECK ("respostas_de_escopo"."estado" <> 'devolvido' or btrim(coalesce("respostas_de_escopo"."motivo_da_devolucao", '')) <> '');--> statement-breakpoint
ALTER TABLE "respostas_de_escopo" ADD CONSTRAINT "motivo_so_enquanto_devolvido" CHECK ("respostas_de_escopo"."estado" = 'devolvido' or "respostas_de_escopo"."motivo_da_devolucao" is null);
