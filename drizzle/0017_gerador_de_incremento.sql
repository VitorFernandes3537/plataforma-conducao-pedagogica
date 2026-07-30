CREATE TYPE "public"."versao_do_incremento" AS ENUM('integral', 'reduzida');--> statement-breakpoint
CREATE TABLE "incrementos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"resposta_de_escopo_id" uuid NOT NULL,
	"remetente" text NOT NULL,
	"contexto" text NOT NULL,
	"versao" "versao_do_incremento" NOT NULL,
	"dia_de_liberacao_id" uuid NOT NULL,
	"criado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incrementos_grupo_id_unique" UNIQUE("grupo_id"),
	CONSTRAINT "incremento_exige_remetente" CHECK (btrim("incrementos"."remetente") <> ''),
	CONSTRAINT "incremento_exige_contexto" CHECK (btrim("incrementos"."contexto") <> '')
);
--> statement-breakpoint
CREATE TABLE "itens_imutaveis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incremento_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "item_imutavel_ordem_unica" UNIQUE("incremento_id","ordem"),
	CONSTRAINT "item_imutavel_ordem_positiva" CHECK ("itens_imutaveis"."ordem" >= 1),
	CONSTRAINT "item_imutavel_nao_vazio" CHECK (btrim("itens_imutaveis"."texto") <> '')
);
--> statement-breakpoint
CREATE TABLE "lacunas_do_modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_de_mudanca_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"chave" text NOT NULL,
	"rotulo" text NOT NULL,
	"obrigatoria" boolean NOT NULL,
	CONSTRAINT "lacuna_ordem_unica_no_modelo" UNIQUE("modelo_de_mudanca_id","ordem"),
	CONSTRAINT "lacuna_chave_unica_no_modelo" UNIQUE("modelo_de_mudanca_id","chave"),
	CONSTRAINT "lacuna_ordem_positiva" CHECK ("lacunas_do_modelo"."ordem" >= 1),
	CONSTRAINT "lacuna_chave_nao_vazia" CHECK (btrim("lacunas_do_modelo"."chave") <> '')
);
--> statement-breakpoint
CREATE TABLE "modelos_de_mudanca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"rotulo" text NOT NULL,
	"entra_na_versao_reduzida" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modelo_de_mudanca_ordem_unica_no_curso" UNIQUE("curso_id","ordem"),
	CONSTRAINT "modelo_de_mudanca_ordem_positiva" CHECK ("modelos_de_mudanca"."ordem" >= 1),
	CONSTRAINT "modelo_de_mudanca_rotulo_nao_vazio" CHECK (btrim("modelos_de_mudanca"."rotulo") <> '')
);
--> statement-breakpoint
CREATE TABLE "valores_da_lacuna" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incremento_id" uuid NOT NULL,
	"lacuna_id" uuid NOT NULL,
	"valor" text NOT NULL,
	CONSTRAINT "valor_unico_por_lacuna" UNIQUE("incremento_id","lacuna_id"),
	CONSTRAINT "valor_da_lacuna_nao_vazio" CHECK (btrim("valores_da_lacuna"."valor") <> '')
);
--> statement-breakpoint
-- Sem default, pela mesma razao da 0015: um padrao aqui seria a plataforma
-- escolhendo quantos itens contem o panico da turma. Entra nulavel, recebe o
-- valor do curso que ja existe — dois, como o gabarito do Doc 6 4.2 mostra — e
-- so depois vira obrigatoria.
ALTER TABLE "cursos" ADD COLUMN "minimo_de_itens_imutaveis" integer;--> statement-breakpoint
UPDATE "cursos" SET "minimo_de_itens_imutaveis" = 2 WHERE "minimo_de_itens_imutaveis" IS NULL;--> statement-breakpoint
ALTER TABLE "cursos" ALTER COLUMN "minimo_de_itens_imutaveis" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "perguntas_do_formulario" ADD COLUMN "alimenta_incremento" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incrementos" ADD CONSTRAINT "incrementos_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementos" ADD CONSTRAINT "incrementos_resposta_de_escopo_id_respostas_de_escopo_id_fk" FOREIGN KEY ("resposta_de_escopo_id") REFERENCES "public"."respostas_de_escopo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementos" ADD CONSTRAINT "incrementos_dia_de_liberacao_id_dias_id_fk" FOREIGN KEY ("dia_de_liberacao_id") REFERENCES "public"."dias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incrementos" ADD CONSTRAINT "incrementos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_imutaveis" ADD CONSTRAINT "itens_imutaveis_incremento_id_incrementos_id_fk" FOREIGN KEY ("incremento_id") REFERENCES "public"."incrementos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lacunas_do_modelo" ADD CONSTRAINT "lacunas_do_modelo_modelo_de_mudanca_id_modelos_de_mudanca_id_fk" FOREIGN KEY ("modelo_de_mudanca_id") REFERENCES "public"."modelos_de_mudanca"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos_de_mudanca" ADD CONSTRAINT "modelos_de_mudanca_curso_id_cursos_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."cursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valores_da_lacuna" ADD CONSTRAINT "valores_da_lacuna_incremento_id_incrementos_id_fk" FOREIGN KEY ("incremento_id") REFERENCES "public"."incrementos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valores_da_lacuna" ADD CONSTRAINT "valores_da_lacuna_lacuna_id_lacunas_do_modelo_id_fk" FOREIGN KEY ("lacuna_id") REFERENCES "public"."lacunas_do_modelo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cursos" ADD CONSTRAINT "minimo_de_itens_imutaveis_positivo" CHECK ("cursos"."minimo_de_itens_imutaveis" >= 1);--> statement-breakpoint
-- "`Incremento` só pode ser gerado a partir de `RespostaDeEscopo` aprovada"
-- (Doc 7 §2.4, `D6-ENVELOPE`).
--
-- A chave estrangeira garante que a resposta existe; ela não garante que é a do
-- grupo nem que está aprovada. E as duas coisas importam: o incremento se
-- DERIVA do escopo, então derivar do escopo errado produz um pedido que não
-- fala do domínio daquele grupo, e derivar de um escopo ainda não aprovado
-- produz um pedido sobre um contrato que pode mudar.
--
-- O dia de liberação também tem de ser do curso do grupo, senão o incremento
-- ficaria preso a um calendário que aquela turma não segue — e liberação que
-- não chega é indistinguível de incremento que não existe.
CREATE OR REPLACE FUNCTION valida_origem_do_incremento() RETURNS trigger AS $$
DECLARE
  curso_do_grupo uuid;
  grupo_da_resposta uuid;
  estado_da_resposta estado_do_escopo;
  curso_do_dia uuid;
BEGIN
  SELECT t.curso_id INTO curso_do_grupo
    FROM grupos g JOIN turmas t ON t.id = g.turma_id
   WHERE g.id = NEW.grupo_id;

  IF curso_do_grupo IS NULL THEN
    RAISE EXCEPTION 'grupo % nao encontrado', NEW.grupo_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT e.grupo_id, e.estado INTO grupo_da_resposta, estado_da_resposta
    FROM respostas_de_escopo e WHERE e.id = NEW.resposta_de_escopo_id;

  IF grupo_da_resposta <> NEW.grupo_id THEN
    RAISE EXCEPTION
      'resposta de escopo % e do grupo % e o incremento e do grupo %',
      NEW.resposta_de_escopo_id, grupo_da_resposta, NEW.grupo_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF estado_da_resposta <> 'aprovado' THEN
    RAISE EXCEPTION
      'escopo do grupo % esta em % e o incremento so deriva de escopo aprovado',
      NEW.grupo_id, estado_da_resposta
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT d.curso_id INTO curso_do_dia FROM dias d WHERE d.id = NEW.dia_de_liberacao_id;

  IF curso_do_dia <> curso_do_grupo THEN
    RAISE EXCEPTION
      'dia de liberacao % e do curso % e o grupo e do curso %',
      NEW.dia_de_liberacao_id, curso_do_dia, curso_do_grupo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER incrementos_valida_origem
  BEFORE INSERT OR UPDATE OF grupo_id, resposta_de_escopo_id, dia_de_liberacao_id ON incrementos
  FOR EACH ROW EXECUTE FUNCTION valida_origem_do_incremento();
--> statement-breakpoint
-- A versão reduzida omite mudanças, e omitir é não poder preencher.
--
-- Sem esta checagem, "reduzida" seria só um rótulo: nada impediria gravar o
-- valor de uma lacuna da mudança que a redução tirou, e a tela do grupo
-- mostraria uma mudança que a triagem do terceiro marco decidiu poupar.
--
-- A lacuna também precisa ser de um modelo do curso do grupo: modelo alheio
-- pediria ao grupo uma mudança que o curso dele nem declara.
CREATE OR REPLACE FUNCTION valida_lacuna_do_incremento() RETURNS trigger AS $$
DECLARE
  curso_do_grupo uuid;
  versao_do_incremento versao_do_incremento;
  curso_do_modelo uuid;
  na_reduzida boolean;
BEGIN
  SELECT t.curso_id, i.versao INTO curso_do_grupo, versao_do_incremento
    FROM incrementos i
    JOIN grupos g ON g.id = i.grupo_id
    JOIN turmas t ON t.id = g.turma_id
   WHERE i.id = NEW.incremento_id;

  IF curso_do_grupo IS NULL THEN
    RAISE EXCEPTION 'incremento % nao encontrado', NEW.incremento_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT m.curso_id, m.entra_na_versao_reduzida INTO curso_do_modelo, na_reduzida
    FROM lacunas_do_modelo l
    JOIN modelos_de_mudanca m ON m.id = l.modelo_de_mudanca_id
   WHERE l.id = NEW.lacuna_id;

  IF curso_do_modelo <> curso_do_grupo THEN
    RAISE EXCEPTION
      'lacuna % e do curso % e o incremento e do curso %',
      NEW.lacuna_id, curso_do_modelo, curso_do_grupo
      USING ERRCODE = 'check_violation';
  END IF;

  IF versao_do_incremento = 'reduzida' AND NOT na_reduzida THEN
    RAISE EXCEPTION
      'lacuna % pertence a uma mudanca que a versao reduzida nao inclui',
      NEW.lacuna_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER valores_da_lacuna_valida_modelo
  BEFORE INSERT OR UPDATE OF incremento_id, lacuna_id ON valores_da_lacuna
  FOR EACH ROW EXECUTE FUNCTION valida_lacuna_do_incremento();
