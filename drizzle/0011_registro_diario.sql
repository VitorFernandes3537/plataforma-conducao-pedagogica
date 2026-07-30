CREATE TABLE "avaliacoes_de_obstaculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"obstaculo_id" uuid NOT NULL,
	"nivel_id" uuid NOT NULL,
	"lancado_por_id" uuid NOT NULL,
	"lancado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacao_unica_por_obstaculo_no_dia" UNIQUE("registro_diario_id","obstaculo_id")
);
--> statement-breakpoint
CREATE TABLE "confirmacoes_de_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"confirmado_por_id" uuid NOT NULL,
	"confirmado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmacoes_de_push_registro_diario_id_unique" UNIQUE("registro_diario_id")
);
--> statement-breakpoint
CREATE TABLE "logs_de_obstaculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registro_diario_id" uuid NOT NULL,
	"obstaculo_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_unico_por_obstaculo_no_dia" UNIQUE("registro_diario_id","obstaculo_id"),
	CONSTRAINT "log_nao_vazio" CHECK (btrim("logs_de_obstaculo"."texto") <> '')
);
--> statement-breakpoint
CREATE TABLE "niveis_de_avaliacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"valor" integer NOT NULL,
	"descritor" text NOT NULL,
	"conta_como_superacao" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nivel_unico_por_curso" UNIQUE("curso_id","valor")
);
--> statement-breakpoint
CREATE TABLE "obstaculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"pergunta" text NOT NULL,
	"peso" numeric(6, 2) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obstaculo_ordem_unica_no_curso" UNIQUE("curso_id","ordem"),
	CONSTRAINT "obstaculo_ordem_positiva" CHECK ("obstaculos"."ordem" >= 1),
	CONSTRAINT "obstaculo_peso_positivo" CHECK ("obstaculos"."peso" > 0)
);
--> statement-breakpoint
CREATE TABLE "registros_diarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"dia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registro_unico_por_aluno_e_dia" UNIQUE("aluno_id","dia_id")
);
--> statement-breakpoint
ALTER TABLE "avaliacoes_de_obstaculo" ADD CONSTRAINT "avaliacoes_de_obstaculo_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_obstaculo" ADD CONSTRAINT "avaliacoes_de_obstaculo_obstaculo_id_obstaculos_id_fk" FOREIGN KEY ("obstaculo_id") REFERENCES "public"."obstaculos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_obstaculo" ADD CONSTRAINT "avaliacoes_de_obstaculo_nivel_id_niveis_de_avaliacao_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveis_de_avaliacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_de_obstaculo" ADD CONSTRAINT "avaliacoes_de_obstaculo_lancado_por_id_usuarios_id_fk" FOREIGN KEY ("lancado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmacoes_de_push" ADD CONSTRAINT "confirmacoes_de_push_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmacoes_de_push" ADD CONSTRAINT "confirmacoes_de_push_confirmado_por_id_usuarios_id_fk" FOREIGN KEY ("confirmado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_de_obstaculo" ADD CONSTRAINT "logs_de_obstaculo_registro_diario_id_registros_diarios_id_fk" FOREIGN KEY ("registro_diario_id") REFERENCES "public"."registros_diarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_de_obstaculo" ADD CONSTRAINT "logs_de_obstaculo_obstaculo_id_obstaculos_id_fk" FOREIGN KEY ("obstaculo_id") REFERENCES "public"."obstaculos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niveis_de_avaliacao" ADD CONSTRAINT "niveis_de_avaliacao_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obstaculos" ADD CONSTRAINT "obstaculos_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_dia_id_dias_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- COERÊNCIA DE CURSO.
--
-- `dias` pendura em `cursos` e `alunos` pendura em `turmas`. Nada em DDL impede
-- registrar o aluno de uma turma num dia de OUTRO curso, e o estrago seria
-- silencioso: a nota apareceria num calendário onde ninguém a procura, e o
-- painel de superação contaria alunos que não estavam naquele dia.
--
-- Chave estrangeira composta resolveria isso, mas exigiria carregar `curso_id`
-- em cada linha — coluna redundante que precisa de outro gatilho para não
-- divergir. O gatilho é a troca menos ruim: uma checagem, num lugar.
CREATE OR REPLACE FUNCTION valida_curso_do_registro_diario() RETURNS trigger AS $$
DECLARE
  curso_do_aluno uuid;
  curso_do_dia uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_aluno
    FROM alunos a JOIN turmas t ON t.id = a.turma_id
   WHERE a.id = NEW.aluno_id;

  SELECT d.curso_id INTO curso_do_dia FROM dias d WHERE d.id = NEW.dia_id;

  IF curso_do_aluno IS NULL OR curso_do_dia IS NULL THEN
    RAISE EXCEPTION 'aluno % ou dia % nao encontrado', NEW.aluno_id, NEW.dia_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_do_aluno <> curso_do_dia THEN
    RAISE EXCEPTION
      'dia % e do curso % e o aluno % e do curso %',
      NEW.dia_id, curso_do_dia, NEW.aluno_id, curso_do_aluno
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER registros_diarios_valida_curso
  BEFORE INSERT OR UPDATE OF aluno_id, dia_id ON registros_diarios
  FOR EACH ROW EXECUTE FUNCTION valida_curso_do_registro_diario();
--> statement-breakpoint
-- A mesma armadilha, um nível abaixo: o nível da escala e o obstáculo também
-- pertencem a um curso.
--
-- Sem esta checagem, um curso poderia lançar nota usando a escala de outro — e
-- como `conta_como_superacao` mora no nível, o obstáculo passaria a contar como
-- superado por uma regra que não é a daquele curso. A chave estrangeira garante
-- que o nível EXISTE; ela não garante que é o nível certo.
CREATE OR REPLACE FUNCTION valida_curso_da_avaliacao() RETURNS trigger AS $$
DECLARE
  curso_do_aluno uuid;
  curso_do_nivel uuid;
  curso_do_obstaculo uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_aluno
    FROM registros_diarios r
    JOIN alunos a ON a.id = r.aluno_id
    JOIN turmas t ON t.id = a.turma_id
   WHERE r.id = NEW.registro_diario_id;

  SELECT n.curso_id INTO curso_do_nivel
    FROM niveis_de_avaliacao n WHERE n.id = NEW.nivel_id;

  SELECT o.curso_id INTO curso_do_obstaculo
    FROM obstaculos o WHERE o.id = NEW.obstaculo_id;

  IF curso_do_aluno IS NULL THEN
    RAISE EXCEPTION 'registro diario % nao encontrado', NEW.registro_diario_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_do_nivel <> curso_do_aluno THEN
    RAISE EXCEPTION
      'nivel % e da escala do curso %, e a avaliacao e do curso %',
      NEW.nivel_id, curso_do_nivel, curso_do_aluno
      USING ERRCODE = 'check_violation';
  END IF;

  IF curso_do_obstaculo <> curso_do_aluno THEN
    RAISE EXCEPTION
      'obstaculo % e do curso %, e a avaliacao e do curso %',
      NEW.obstaculo_id, curso_do_obstaculo, curso_do_aluno
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER avaliacoes_de_obstaculo_valida_curso
  BEFORE INSERT OR UPDATE OF registro_diario_id, obstaculo_id, nivel_id ON avaliacoes_de_obstaculo
  FOR EACH ROW EXECUTE FUNCTION valida_curso_da_avaliacao();
--> statement-breakpoint
-- O log tem o mesmo problema de obstáculo de outro curso, e a mesma solução.
CREATE OR REPLACE FUNCTION valida_curso_do_log() RETURNS trigger AS $$
DECLARE
  curso_do_aluno uuid;
  curso_do_obstaculo uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_aluno
    FROM registros_diarios r
    JOIN alunos a ON a.id = r.aluno_id
    JOIN turmas t ON t.id = a.turma_id
   WHERE r.id = NEW.registro_diario_id;

  SELECT o.curso_id INTO curso_do_obstaculo
    FROM obstaculos o WHERE o.id = NEW.obstaculo_id;

  IF curso_do_aluno IS NULL THEN
    RAISE EXCEPTION 'registro diario % nao encontrado', NEW.registro_diario_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_do_obstaculo <> curso_do_aluno THEN
    RAISE EXCEPTION
      'obstaculo % e do curso %, e o log e do curso %',
      NEW.obstaculo_id, curso_do_obstaculo, curso_do_aluno
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER logs_de_obstaculo_valida_curso
  BEFORE INSERT OR UPDATE OF registro_diario_id, obstaculo_id ON logs_de_obstaculo
  FOR EACH ROW EXECUTE FUNCTION valida_curso_do_log();
