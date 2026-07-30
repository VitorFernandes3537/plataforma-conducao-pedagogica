CREATE TYPE "public"."status_do_item_de_mural" AS ENUM('aberto', 'resolvido');--> statement-breakpoint
CREATE TABLE "itens_de_mural" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"obstaculo_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"status" "status_do_item_de_mural" DEFAULT 'aberto' NOT NULL,
	"resolvido_por_id" uuid,
	"resolvido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_de_mural_nao_vazio" CHECK (btrim("itens_de_mural"."texto") <> ''),
	CONSTRAINT "resolucao_coerente_com_status" CHECK (("itens_de_mural"."status" = 'resolvido')
          = ("itens_de_mural"."resolvido_em" is not null and "itens_de_mural"."resolvido_por_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "itens_de_mural" ADD CONSTRAINT "itens_de_mural_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_de_mural" ADD CONSTRAINT "itens_de_mural_obstaculo_id_obstaculos_id_fk" FOREIGN KEY ("obstaculo_id") REFERENCES "public"."obstaculos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_de_mural" ADD CONSTRAINT "itens_de_mural_resolvido_por_id_usuarios_id_fk" FOREIGN KEY ("resolvido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- O obstáculo do item tem de ser do curso da turma do grupo.
--
-- A chave estrangeira garante que o obstáculo existe; ela não garante que é um
-- obstáculo daquele curso. Sem esta checagem, um item apareceria agrupado sob
-- uma pergunta que a turma nunca viu — e o mural é a primeira tela do aluno e o
-- degrau 2 da escada de suporte, então o ruído cai exatamente onde ele está
-- travado.
CREATE OR REPLACE FUNCTION valida_curso_do_item_de_mural() RETURNS trigger AS $$
DECLARE
  curso_do_grupo uuid;
  curso_do_obstaculo uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_grupo
    FROM grupos g JOIN turmas t ON t.id = g.turma_id
   WHERE g.id = NEW.grupo_id;

  SELECT o.curso_id INTO curso_do_obstaculo FROM obstaculos o WHERE o.id = NEW.obstaculo_id;

  IF curso_do_grupo IS NULL THEN
    RAISE EXCEPTION 'grupo % nao encontrado', NEW.grupo_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF curso_do_obstaculo <> curso_do_grupo THEN
    RAISE EXCEPTION
      'obstaculo % e do curso % e o grupo % e do curso %',
      NEW.obstaculo_id, curso_do_obstaculo, NEW.grupo_id, curso_do_grupo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER itens_de_mural_valida_curso
  BEFORE INSERT OR UPDATE OF grupo_id, obstaculo_id ON itens_de_mural
  FOR EACH ROW EXECUTE FUNCTION valida_curso_do_item_de_mural();
