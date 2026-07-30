CREATE TABLE "pares_de_critica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rodada_id" uuid NOT NULL,
	"revisor_id" uuid NOT NULL,
	"revisado_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisor_unico_na_rodada" UNIQUE("rodada_id","revisor_id"),
	CONSTRAINT "revisado_unico_na_rodada" UNIQUE("rodada_id","revisado_id"),
	CONSTRAINT "critica_nao_e_do_proprio_grupo" CHECK ("pares_de_critica"."revisor_id" <> "pares_de_critica"."revisado_id")
);
--> statement-breakpoint
CREATE TABLE "perguntas_do_roteiro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rodada_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"enunciado" text NOT NULL,
	CONSTRAINT "pergunta_do_roteiro_unica_na_rodada" UNIQUE("rodada_id","ordem"),
	CONSTRAINT "pergunta_do_roteiro_ordem_positiva" CHECK ("perguntas_do_roteiro"."ordem" >= 1),
	CONSTRAINT "pergunta_do_roteiro_nao_vazia" CHECK (btrim("perguntas_do_roteiro"."enunciado") <> '')
);
--> statement-breakpoint
CREATE TABLE "registros_de_critica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"par_id" uuid NOT NULL,
	"explicacao_do_tema" text NOT NULL,
	"cenario_que_quebra" text NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registros_de_critica_par_id_unique" UNIQUE("par_id"),
	CONSTRAINT "critica_exige_explicacao" CHECK (btrim("registros_de_critica"."explicacao_do_tema") <> ''),
	CONSTRAINT "critica_exige_cenario" CHECK (btrim("registros_de_critica"."cenario_que_quebra") <> '')
);
--> statement-breakpoint
CREATE TABLE "rodadas_de_critica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"dia_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rodada_ordem_unica_no_curso" UNIQUE("curso_id","ordem"),
	CONSTRAINT "rodada_ordem_positiva" CHECK ("rodadas_de_critica"."ordem" >= 1)
);
--> statement-breakpoint
ALTER TABLE "pares_de_critica" ADD CONSTRAINT "pares_de_critica_rodada_id_rodadas_de_critica_id_fk" FOREIGN KEY ("rodada_id") REFERENCES "public"."rodadas_de_critica"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pares_de_critica" ADD CONSTRAINT "pares_de_critica_revisor_id_grupos_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pares_de_critica" ADD CONSTRAINT "pares_de_critica_revisado_id_grupos_id_fk" FOREIGN KEY ("revisado_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perguntas_do_roteiro" ADD CONSTRAINT "perguntas_do_roteiro_rodada_id_rodadas_de_critica_id_fk" FOREIGN KEY ("rodada_id") REFERENCES "public"."rodadas_de_critica"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_de_critica" ADD CONSTRAINT "registros_de_critica_par_id_pares_de_critica_id_fk" FOREIGN KEY ("par_id") REFERENCES "public"."pares_de_critica"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rodadas_de_critica" ADD CONSTRAINT "rodadas_de_critica_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rodadas_de_critica" ADD CONSTRAINT "rodadas_de_critica_dia_id_dias_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias"("id") ON DELETE set null ON UPDATE no action;