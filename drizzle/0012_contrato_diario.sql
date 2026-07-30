CREATE TABLE "contratos_diarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"faremos" text NOT NULL,
	"nao_faremos" text NOT NULL,
	"cumprido" boolean,
	"motivo_do_fechamento" text,
	"aberto_em" timestamp with time zone DEFAULT now() NOT NULL,
	"fechado_em" timestamp with time zone,
	CONSTRAINT "contratos_diarios_registro_diario_id_unique" UNIQUE("registro_diario_id"),
	CONSTRAINT "contrato_exige_o_que_faremos" CHECK (btrim("contratos_diarios"."faremos") <> ''),
	CONSTRAINT "contrato_exige_o_que_nao_faremos" CHECK (btrim("contratos_diarios"."nao_faremos") <> ''),
	CONSTRAINT "fechamento_coerente" CHECK (("contratos_diarios"."cumprido" is null) = ("contratos_diarios"."fechado_em" is null)),
	CONSTRAINT "fechamento_exige_motivo" CHECK ("contratos_diarios"."cumprido" is null or btrim(coalesce("contratos_diarios"."motivo_do_fechamento", '')) <> ''),
	CONSTRAINT "motivo_so_no_fechamento" CHECK ("contratos_diarios"."cumprido" is not null or "contratos_diarios"."motivo_do_fechamento" is null)
);
--> statement-breakpoint
ALTER TABLE "contratos_diarios" ADD CONSTRAINT "contratos_diarios_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;