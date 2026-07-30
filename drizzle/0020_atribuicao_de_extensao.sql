CREATE TYPE "public"."tipo_de_atribuicao" AS ENUM('extensao', 'monitoria');--> statement-breakpoint
CREATE TABLE "atribuicoes_de_extensao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"obstaculo_id" uuid NOT NULL,
	"dia_id" uuid NOT NULL,
	"tipo" "tipo_de_atribuicao" NOT NULL,
	"atribuido_por_id" uuid NOT NULL,
	"atribuido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atribuicao_unica_por_aluno_no_dia" UNIQUE("aluno_id","dia_id")
);
--> statement-breakpoint
ALTER TABLE "obstaculos" ADD COLUMN "extensao" text;--> statement-breakpoint
ALTER TABLE "atribuicoes_de_extensao" ADD CONSTRAINT "atribuicoes_de_extensao_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_de_extensao" ADD CONSTRAINT "atribuicoes_de_extensao_obstaculo_id_obstaculos_id_fk" FOREIGN KEY ("obstaculo_id") REFERENCES "public"."obstaculos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_de_extensao" ADD CONSTRAINT "atribuicoes_de_extensao_dia_id_dias_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_de_extensao" ADD CONSTRAINT "atribuicoes_de_extensao_atribuido_por_id_usuarios_id_fk" FOREIGN KEY ("atribuido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- A atribuição é do obstáculo QUE O DIA TRABALHA.
--
-- A extensão aprofunda o mesmo obstáculo e nunca avança para o seguinte
-- (Doc 3 §5). Sem esta checagem, o instrutor poderia atribuir num dia a extensão
-- de um obstáculo que a turma ainda não viu — que é exatamente o adiantamento
-- individual que o limiar de sincronia existe para impedir.
--
-- E o aluno tem de ser do curso: atribuir extensão de outro curso mandaria o
-- aluno aprofundar um obstáculo que a turma dele nem tem.
CREATE OR REPLACE FUNCTION valida_atribuicao_de_extensao() RETURNS trigger AS $$
DECLARE
  curso_do_aluno uuid;
  curso_do_obstaculo uuid;
  curso_do_dia uuid;
  obstaculo_do_dia uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_aluno
    FROM alunos a JOIN turmas t ON t.id = a.turma_id
   WHERE a.id = NEW.aluno_id;

  IF curso_do_aluno IS NULL THEN
    RAISE EXCEPTION 'aluno % nao encontrado', NEW.aluno_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT o.curso_id INTO curso_do_obstaculo FROM obstaculos o WHERE o.id = NEW.obstaculo_id;
  SELECT d.curso_id, d.obstaculo_id INTO curso_do_dia, obstaculo_do_dia
    FROM dias d WHERE d.id = NEW.dia_id;

  IF curso_do_obstaculo <> curso_do_aluno OR curso_do_dia <> curso_do_aluno THEN
    RAISE EXCEPTION
      'atribuicao cruza cursos: aluno em %, obstaculo em %, dia em %',
      curso_do_aluno, curso_do_obstaculo, curso_do_dia
      USING ERRCODE = 'check_violation';
  END IF;

  IF obstaculo_do_dia IS NULL THEN
    RAISE EXCEPTION 'dia % nao trabalha obstaculo nenhum', NEW.dia_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF obstaculo_do_dia <> NEW.obstaculo_id THEN
    RAISE EXCEPTION
      'dia % trabalha o obstaculo % e a atribuicao e do obstaculo %',
      NEW.dia_id, obstaculo_do_dia, NEW.obstaculo_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER atribuicoes_valida_obstaculo_do_dia
  BEFORE INSERT OR UPDATE OF aluno_id, obstaculo_id, dia_id ON atribuicoes_de_extensao
  FOR EACH ROW EXECUTE FUNCTION valida_atribuicao_de_extensao();
