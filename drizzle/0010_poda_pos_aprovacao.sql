CREATE TABLE "podas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resposta_de_escopo_id" uuid NOT NULL,
	"podado_por_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"podado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poda_exige_motivo" CHECK (btrim("podas"."motivo") <> '')
);
--> statement-breakpoint
CREATE TABLE "respostas_anteriores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poda_id" uuid NOT NULL,
	"pergunta_id" uuid NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "versao_anterior_unica_por_pergunta" UNIQUE("poda_id","pergunta_id")
);
--> statement-breakpoint
ALTER TABLE "podas" ADD CONSTRAINT "podas_resposta_de_escopo_id_respostas_de_escopo_id_fk" FOREIGN KEY ("resposta_de_escopo_id") REFERENCES "public"."respostas_de_escopo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podas" ADD CONSTRAINT "podas_podado_por_id_usuarios_id_fk" FOREIGN KEY ("podado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_anteriores" ADD CONSTRAINT "respostas_anteriores_poda_id_podas_id_fk" FOREIGN KEY ("poda_id") REFERENCES "public"."podas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_anteriores" ADD CONSTRAINT "respostas_anteriores_pergunta_id_perguntas_do_formulario_id_fk" FOREIGN KEY ("pergunta_id") REFERENCES "public"."perguntas_do_formulario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A poda é a única edição admitida em escopo aprovado (Doc 2 §4.5.1), e o
-- gatilho da migration 0009 barrava todas. Substitui a função para abrir uma
-- porta ESTREITA em vez de um interruptor.
--
-- `pcp.poda_autorizada` não é um "off" genérico: precisa carregar o id de uma
-- poda que já exista e que aponte para ESTA resposta de escopo. Quem quiser
-- editar um escopo aprovado tem antes de registrar a poda, com motivo e autor —
-- e o registro do histórico deixa de depender de a aplicação lembrar de fazê-lo.
--
-- `SET LOCAL` morre com a transação, então a autorização não vaza para a próxima
-- consulta da mesma conexão.
CREATE OR REPLACE FUNCTION recusa_edicao_de_escopo_fechado() RETURNS trigger AS $$
DECLARE
  estado_atual estado_do_escopo;
  poda_apresentada text;
  poda_confere boolean;
BEGIN
  SELECT e.estado
    INTO estado_atual
    FROM respostas_de_escopo e
   WHERE e.id = NEW.resposta_de_escopo_id;

  IF estado_atual IS NULL THEN
    RAISE EXCEPTION 'resposta de escopo % nao encontrada', NEW.resposta_de_escopo_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF estado_atual IN ('rascunho', 'devolvido') THEN
    RETURN NEW;
  END IF;

  IF estado_atual = 'aprovado' THEN
    poda_apresentada := current_setting('pcp.poda_autorizada', true);

    IF poda_apresentada IS NOT NULL AND poda_apresentada <> '' THEN
      SELECT EXISTS (
        SELECT 1
          FROM podas p
         WHERE p.id::text = poda_apresentada
           AND p.resposta_de_escopo_id = NEW.resposta_de_escopo_id
      ) INTO poda_confere;

      IF poda_confere THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION
        'poda % nao pertence ao escopo %',
        poda_apresentada, NEW.resposta_de_escopo_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RAISE EXCEPTION
    'escopo % esta em % e nao aceita edicao do grupo',
    NEW.resposta_de_escopo_id, estado_atual
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
