CREATE TYPE "public"."tipo_de_bloco" AS ENUM('tese', 'mecanismo', 'conceitos-2x2', 'ancoragem', 'codigo-anotado', 'forcas-limites', 'matriz-comparativa', 'predicao', 'classificador');--> statement-breakpoint
CREATE TABLE "blocos_de_material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_interativo_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"tipo" "tipo_de_bloco" NOT NULL,
	"conteudo" text NOT NULL,
	"conteudo_revelado" text,
	"oculto_ate_dia_id" uuid,
	"agregado_liberado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bloco_de_material_ordem_unica" UNIQUE("material_interativo_id","ordem"),
	CONSTRAINT "bloco_de_material_ordem_positiva" CHECK ("blocos_de_material"."ordem" >= 1),
	CONSTRAINT "bloco_de_material_conteudo_nao_vazio" CHECK (btrim("blocos_de_material"."conteudo") <> '')
);
--> statement-breakpoint
CREATE TABLE "respostas_de_bloco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bloco_id" uuid NOT NULL,
	"aluno_id" uuid NOT NULL,
	"resposta" text NOT NULL,
	"submetido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resposta_unica_por_bloco_e_aluno" UNIQUE("bloco_id","aluno_id"),
	CONSTRAINT "resposta_de_bloco_nao_vazia" CHECK (btrim("respostas_de_bloco"."resposta") <> '')
);
--> statement-breakpoint
ALTER TABLE "blocos_de_material" ADD CONSTRAINT "blocos_de_material_material_interativo_id_materiais_interativos_id_fk" FOREIGN KEY ("material_interativo_id") REFERENCES "public"."materiais_interativos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocos_de_material" ADD CONSTRAINT "blocos_de_material_oculto_ate_dia_id_dias_id_fk" FOREIGN KEY ("oculto_ate_dia_id") REFERENCES "public"."dias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_bloco" ADD CONSTRAINT "respostas_de_bloco_bloco_id_blocos_de_material_id_fk" FOREIGN KEY ("bloco_id") REFERENCES "public"."blocos_de_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_bloco" ADD CONSTRAINT "respostas_de_bloco_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;