CREATE TABLE "registros_de_recuperacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"o_que_perdeu" text NOT NULL,
	"o_que_repos" text NOT NULL,
	"reposto_por_aluno_id" uuid,
	"fonte_de_reposicao" text,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recuperacao_exige_o_que_perdeu" CHECK (btrim("registros_de_recuperacao"."o_que_perdeu") <> ''),
	CONSTRAINT "recuperacao_exige_o_que_repos" CHECK (btrim("registros_de_recuperacao"."o_que_repos") <> ''),
	CONSTRAINT "recuperacao_exige_por_quem" CHECK (("registros_de_recuperacao"."reposto_por_aluno_id" is not null)
          <> (btrim(coalesce("registros_de_recuperacao"."fonte_de_reposicao", '')) <> ''))
);
--> statement-breakpoint
ALTER TABLE "registros_de_recuperacao" ADD CONSTRAINT "registros_de_recuperacao_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_de_recuperacao" ADD CONSTRAINT "registros_de_recuperacao_reposto_por_aluno_id_alunos_id_fk" FOREIGN KEY ("reposto_por_aluno_id") REFERENCES "public"."alunos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- "Qualquer colega DA TURMA, sem designação prévia" (Doc 5 §3.2).
--
-- A chave estrangeira garante que o colega é um aluno; ela não garante que é um
-- aluno da mesma turma. Sem esta checagem, o registro poderia citar alguém de
-- outra turma — e como o registro é a única visibilidade do instrutor sobre quem
-- está acompanhando, ele passaria a apontar para alguém que ele não conduz.
--
-- E ninguém repõe para si mesmo: reposição por conta própria é o caso em que a
-- fonte é o material, e tem coluna própria. Aceitar autorreposição encheria o
-- painel de linhas que não dizem nada.
CREATE OR REPLACE FUNCTION valida_colega_da_recuperacao() RETURNS trigger AS $$
DECLARE
  aluno_do_registro uuid;
  turma_do_registro uuid;
  turma_do_colega uuid;
BEGIN
  IF NEW.reposto_por_aluno_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.id, a.turma_id INTO aluno_do_registro, turma_do_registro
    FROM registros_diarios r
    JOIN alunos a ON a.id = r.aluno_id
   WHERE r.id = NEW.registro_diario_id;

  IF aluno_do_registro IS NULL THEN
    RAISE EXCEPTION 'registro diario % nao encontrado', NEW.registro_diario_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF aluno_do_registro = NEW.reposto_por_aluno_id THEN
    RAISE EXCEPTION 'aluno % nao repoe para si mesmo', aluno_do_registro
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT a.turma_id INTO turma_do_colega FROM alunos a WHERE a.id = NEW.reposto_por_aluno_id;

  IF turma_do_colega <> turma_do_registro THEN
    RAISE EXCEPTION
      'colega % e da turma % e o registro e da turma %',
      NEW.reposto_por_aluno_id, turma_do_colega, turma_do_registro
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER registros_de_recuperacao_valida_colega
  BEFORE INSERT OR UPDATE OF registro_diario_id, reposto_por_aluno_id ON registros_de_recuperacao
  FOR EACH ROW EXECUTE FUNCTION valida_colega_da_recuperacao();
