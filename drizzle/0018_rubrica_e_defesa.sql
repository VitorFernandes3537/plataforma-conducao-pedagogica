CREATE TYPE "public"."fonte_do_eixo" AS ENUM('avaliacao_de_obstaculo', 'avaliacao_de_incremento');--> statement-breakpoint
CREATE TYPE "public"."unidade_do_eixo" AS ENUM('aluno', 'grupo');--> statement-breakpoint
CREATE TABLE "avaliacoes_da_defesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_de_defesa_id" uuid NOT NULL,
	"eixo_id" uuid NOT NULL,
	"aluno_id" uuid,
	"nivel_id" uuid NOT NULL,
	CONSTRAINT "avaliacao_da_defesa_unica" UNIQUE("registro_de_defesa_id","eixo_id","aluno_id")
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_de_mudanca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incremento_id" uuid NOT NULL,
	"modelo_de_mudanca_id" uuid NOT NULL,
	"nivel_id" uuid NOT NULL,
	"lancado_por_id" uuid NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacao_unica_por_mudanca" UNIQUE("incremento_id","modelo_de_mudanca_id")
);
--> statement-breakpoint
CREATE TABLE "eixos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"peso" numeric(6, 4) NOT NULL,
	"unidade" "unidade_do_eixo" NOT NULL,
	"fonte" "fonte_do_eixo" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eixo_ordem_unica_no_curso" UNIQUE("curso_id","ordem"),
	CONSTRAINT "eixo_fonte_unica_no_curso" UNIQUE("curso_id","fonte"),
	CONSTRAINT "eixo_ordem_positiva" CHECK ("eixos"."ordem" >= 1),
	CONSTRAINT "eixo_peso_positivo" CHECK ("eixos"."peso" > 0),
	CONSTRAINT "eixo_nome_nao_vazio" CHECK (btrim("eixos"."nome") <> '')
);
--> statement-breakpoint
CREATE TABLE "perguntas_da_defesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"enunciado" text NOT NULL,
	CONSTRAINT "pergunta_da_defesa_ordem_unica" UNIQUE("curso_id","ordem"),
	CONSTRAINT "pergunta_da_defesa_ordem_positiva" CHECK ("perguntas_da_defesa"."ordem" >= 1),
	CONSTRAINT "pergunta_da_defesa_nao_vazia" CHECK (btrim("perguntas_da_defesa"."enunciado") <> '')
);
--> statement-breakpoint
CREATE TABLE "perguntas_usadas_na_defesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_de_defesa_id" uuid NOT NULL,
	"pergunta_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "pergunta_usada_unica_na_defesa" UNIQUE("registro_de_defesa_id","pergunta_id"),
	CONSTRAINT "ordem_unica_na_defesa" UNIQUE("registro_de_defesa_id","ordem"),
	CONSTRAINT "pergunta_usada_ordem_positiva" CHECK ("perguntas_usadas_na_defesa"."ordem" >= 1)
);
--> statement-breakpoint
CREATE TABLE "registros_de_defesa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"registrado_por_id" uuid NOT NULL,
	"realizada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registros_de_defesa_grupo_id_unique" UNIQUE("grupo_id")
);
--> statement-breakpoint
ALTER TABLE "turmas" ADD COLUMN "agregacao_finalizada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "avaliacoes_da_defesa" ADD CONSTRAINT "avaliacoes_da_defesa_registro_de_defesa_id_registros_de_defesa_id_fk" FOREIGN KEY ("registro_de_defesa_id") REFERENCES "public"."registros_de_defesa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_da_defesa" ADD CONSTRAINT "avaliacoes_da_defesa_eixo_id_eixos_id_fk" FOREIGN KEY ("eixo_id") REFERENCES "public"."eixos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_da_defesa" ADD CONSTRAINT "avaliacoes_da_defesa_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_da_defesa" ADD CONSTRAINT "avaliacoes_da_defesa_nivel_id_niveis_de_avaliacao_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveis_de_avaliacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_mudanca" ADD CONSTRAINT "avaliacoes_de_mudanca_incremento_id_incrementos_id_fk" FOREIGN KEY ("incremento_id") REFERENCES "public"."incrementos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_mudanca" ADD CONSTRAINT "avaliacoes_de_mudanca_modelo_de_mudanca_id_modelos_de_mudanca_id_fk" FOREIGN KEY ("modelo_de_mudanca_id") REFERENCES "public"."modelos_de_mudanca"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_mudanca" ADD CONSTRAINT "avaliacoes_de_mudanca_nivel_id_niveis_de_avaliacao_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveis_de_avaliacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_mudanca" ADD CONSTRAINT "avaliacoes_de_mudanca_lancado_por_id_usuarios_id_fk" FOREIGN KEY ("lancado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eixos" ADD CONSTRAINT "eixos_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perguntas_da_defesa" ADD CONSTRAINT "perguntas_da_defesa_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perguntas_usadas_na_defesa" ADD CONSTRAINT "perguntas_usadas_na_defesa_registro_de_defesa_id_registros_de_defesa_id_fk" FOREIGN KEY ("registro_de_defesa_id") REFERENCES "public"."registros_de_defesa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perguntas_usadas_na_defesa" ADD CONSTRAINT "perguntas_usadas_na_defesa_pergunta_id_perguntas_da_defesa_id_fk" FOREIGN KEY ("pergunta_id") REFERENCES "public"."perguntas_da_defesa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_de_defesa" ADD CONSTRAINT "registros_de_defesa_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_de_defesa" ADD CONSTRAINT "registros_de_defesa_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- A nota da defesa segue a UNIDADE do eixo.
--
-- Eixo que apura por grupo recebe uma nota só; eixo que apura por aluno recebe
-- uma por aluno. Sem esta checagem existiria nota de aluno num eixo de grupo —
-- uma nota que a agregação não sabe onde somar, e que apareceria como diferença
-- inexplicável entre dois integrantes do mesmo par.
--
-- O aluno também precisa ser do grupo que fez a defesa: nota de aluno alheio
-- entraria na média de quem não estava na sala.
CREATE OR REPLACE FUNCTION valida_avaliacao_da_defesa() RETURNS trigger AS $$
DECLARE
  unidade_do_eixo unidade_do_eixo;
  curso_do_eixo uuid;
  grupo_da_defesa uuid;
  curso_do_grupo uuid;
  grupo_do_aluno uuid;
BEGIN
  SELECT e.unidade, e.curso_id INTO unidade_do_eixo, curso_do_eixo
    FROM eixos e WHERE e.id = NEW.eixo_id;

  SELECT r.grupo_id, t.curso_id INTO grupo_da_defesa, curso_do_grupo
    FROM registros_de_defesa r
    JOIN grupos g ON g.id = r.grupo_id
    JOIN turmas t ON t.id = g.turma_id
   WHERE r.id = NEW.registro_de_defesa_id;

  IF grupo_da_defesa IS NULL THEN
    RAISE EXCEPTION 'registro de defesa % nao encontrado', NEW.registro_de_defesa_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_do_eixo <> curso_do_grupo THEN
    RAISE EXCEPTION
      'eixo % e do curso % e a defesa e do curso %',
      NEW.eixo_id, curso_do_eixo, curso_do_grupo
      USING ERRCODE = 'check_violation';
  END IF;

  IF unidade_do_eixo = 'aluno' AND NEW.aluno_id IS NULL THEN
    RAISE EXCEPTION 'eixo % apura por aluno e a nota veio sem aluno', NEW.eixo_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF unidade_do_eixo = 'grupo' AND NEW.aluno_id IS NOT NULL THEN
    RAISE EXCEPTION 'eixo % apura por grupo e a nota veio com aluno', NEW.eixo_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.aluno_id IS NOT NULL THEN
    SELECT a.grupo_id INTO grupo_do_aluno FROM alunos a WHERE a.id = NEW.aluno_id;

    IF grupo_do_aluno IS DISTINCT FROM grupo_da_defesa THEN
      RAISE EXCEPTION
        'aluno % nao e do grupo % que fez a defesa',
        NEW.aluno_id, grupo_da_defesa
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER avaliacoes_da_defesa_valida_unidade
  BEFORE INSERT OR UPDATE OF registro_de_defesa_id, eixo_id, aluno_id ON avaliacoes_da_defesa
  FOR EACH ROW EXECUTE FUNCTION valida_avaliacao_da_defesa();
--> statement-breakpoint
-- A pergunta usada tem de ser do banco do curso da turma que defendeu.
CREATE OR REPLACE FUNCTION valida_pergunta_da_defesa() RETURNS trigger AS $$
DECLARE
  curso_da_pergunta uuid;
  curso_do_grupo uuid;
BEGIN
  SELECT p.curso_id INTO curso_da_pergunta
    FROM perguntas_da_defesa p WHERE p.id = NEW.pergunta_id;

  SELECT t.curso_id INTO curso_do_grupo
    FROM registros_de_defesa r
    JOIN grupos g ON g.id = r.grupo_id
    JOIN turmas t ON t.id = g.turma_id
   WHERE r.id = NEW.registro_de_defesa_id;

  IF curso_do_grupo IS NULL THEN
    RAISE EXCEPTION 'registro de defesa % nao encontrado', NEW.registro_de_defesa_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_da_pergunta <> curso_do_grupo THEN
    RAISE EXCEPTION
      'pergunta % e do banco do curso % e a defesa e do curso %',
      NEW.pergunta_id, curso_da_pergunta, curso_do_grupo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER perguntas_usadas_valida_banco
  BEFORE INSERT OR UPDATE OF registro_de_defesa_id, pergunta_id ON perguntas_usadas_na_defesa
  FOR EACH ROW EXECUTE FUNCTION valida_pergunta_da_defesa();
