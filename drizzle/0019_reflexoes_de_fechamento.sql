CREATE TYPE "public"."tipo_de_instrumento" AS ENUM('confirmacao_de_push', 'log_de_obstaculo', 'contrato_diario', 'registro_de_critica', 'reflexao_de_fechamento');--> statement-breakpoint
ALTER TYPE "public"."fonte_do_eixo" ADD VALUE 'presenca_de_instrumentos';--> statement-breakpoint
CREATE TABLE "instrumentos_do_eixo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eixo_id" uuid NOT NULL,
	"tipo" "tipo_de_instrumento" NOT NULL,
	"peso" numeric(6, 4) NOT NULL,
	CONSTRAINT "instrumento_unico_no_eixo" UNIQUE("eixo_id","tipo"),
	CONSTRAINT "instrumento_peso_positivo" CHECK ("instrumentos_do_eixo"."peso" > 0)
);
--> statement-breakpoint
CREATE TABLE "reflexoes_de_fechamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"enunciado" text NOT NULL,
	"dia_id" uuid NOT NULL,
	CONSTRAINT "reflexao_ordem_unica_no_curso" UNIQUE("curso_id","ordem"),
	CONSTRAINT "reflexao_ordem_positiva" CHECK ("reflexoes_de_fechamento"."ordem" >= 1),
	CONSTRAINT "reflexao_enunciado_nao_vazio" CHECK (btrim("reflexoes_de_fechamento"."enunciado") <> '')
);
--> statement-breakpoint
CREATE TABLE "respostas_de_reflexao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"reflexao_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resposta_unica_por_reflexao" UNIQUE("registro_diario_id","reflexao_id"),
	CONSTRAINT "resposta_de_reflexao_nao_vazia" CHECK (btrim("respostas_de_reflexao"."texto") <> '')
);
--> statement-breakpoint
ALTER TABLE "instrumentos_do_eixo" ADD CONSTRAINT "instrumentos_do_eixo_eixo_id_eixos_id_fk" FOREIGN KEY ("eixo_id") REFERENCES "public"."eixos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflexoes_de_fechamento" ADD CONSTRAINT "reflexoes_de_fechamento_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflexoes_de_fechamento" ADD CONSTRAINT "reflexoes_de_fechamento_dia_id_dias_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_reflexao" ADD CONSTRAINT "respostas_de_reflexao_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_de_reflexao" ADD CONSTRAINT "respostas_de_reflexao_reflexao_id_reflexoes_de_fechamento_id_fk" FOREIGN KEY ("reflexao_id") REFERENCES "public"."reflexoes_de_fechamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A reflexão é respondida NO DIA em que o curso a declara.
--
-- Sem esta checagem, a retrospectiva do último dia poderia ser respondida no
-- primeiro, quando não há o que retrospectar — e o instrumento que o Doc 6 §5.1
-- chama de "único que captura o pensamento" viraria uma pergunta respondida
-- antes de haver mudança de pensamento para relatar.
--
-- O curso também tem de ser o mesmo: reflexão de outro curso pediria ao aluno
-- uma pergunta que a turma dele nunca recebeu.
CREATE OR REPLACE FUNCTION valida_dia_da_reflexao() RETURNS trigger AS $$
DECLARE
  dia_do_registro uuid;
  curso_do_aluno uuid;
  dia_da_reflexao uuid;
  curso_da_reflexao uuid;
BEGIN
  SELECT r.dia_id, t.curso_id INTO dia_do_registro, curso_do_aluno
    FROM registros_diarios r
    JOIN alunos a ON a.id = r.aluno_id
    JOIN turmas t ON t.id = a.turma_id
   WHERE r.id = NEW.registro_diario_id;

  IF dia_do_registro IS NULL THEN
    RAISE EXCEPTION 'registro diario % nao encontrado', NEW.registro_diario_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT f.dia_id, f.curso_id INTO dia_da_reflexao, curso_da_reflexao
    FROM reflexoes_de_fechamento f WHERE f.id = NEW.reflexao_id;

  IF curso_da_reflexao <> curso_do_aluno THEN
    RAISE EXCEPTION
      'reflexao % e do curso % e o aluno e do curso %',
      NEW.reflexao_id, curso_da_reflexao, curso_do_aluno
      USING ERRCODE = 'check_violation';
  END IF;

  IF dia_da_reflexao <> dia_do_registro THEN
    RAISE EXCEPTION
      'reflexao % e respondida no dia % e o registro e do dia %',
      NEW.reflexao_id, dia_da_reflexao, dia_do_registro
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER respostas_de_reflexao_valida_dia
  BEFORE INSERT OR UPDATE OF registro_diario_id, reflexao_id ON respostas_de_reflexao
  FOR EACH ROW EXECUTE FUNCTION valida_dia_da_reflexao();
