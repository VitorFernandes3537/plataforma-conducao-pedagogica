CREATE TYPE "public"."criterio_de_superacao_do_grupo" AS ENUM('todos_os_integrantes', 'qualquer_integrante');--> statement-breakpoint
CREATE TYPE "public"."unidade_de_superacao" AS ENUM('aluno', 'grupo');--> statement-breakpoint
-- As duas colunas nascem obrigatórias e sem default: um default aqui seria a
-- plataforma escolhendo a política pedagógica do curso, que é exatamente o que a
-- ADR 0005 recusa. Então entram nuláveis, recebem o valor do curso que já existe
-- e só depois viram NOT NULL.
--
-- O valor do backfill não é neutro, e por isso está escrito aqui: é a
-- configuração do curso de exemplo — proporção de 0.8 e aferição por aluno, o
-- que o dono do repositório declarou para o curso desta série.
ALTER TABLE "cursos" ADD COLUMN "limiar_de_adiantamento" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "cursos" ADD COLUMN "unidade_de_superacao" "unidade_de_superacao";--> statement-breakpoint
UPDATE "cursos" SET "limiar_de_adiantamento" = 0.8 WHERE "limiar_de_adiantamento" IS NULL;--> statement-breakpoint
UPDATE "cursos" SET "unidade_de_superacao" = 'aluno' WHERE "unidade_de_superacao" IS NULL;--> statement-breakpoint
ALTER TABLE "cursos" ALTER COLUMN "limiar_de_adiantamento" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cursos" ALTER COLUMN "unidade_de_superacao" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cursos" ADD COLUMN "criterio_de_superacao_do_grupo" "criterio_de_superacao_do_grupo";--> statement-breakpoint
ALTER TABLE "dias" ADD COLUMN "obstaculo_id" uuid;--> statement-breakpoint
ALTER TABLE "dias" ADD CONSTRAINT "dias_obstaculo_id_obstaculos_id_fk" FOREIGN KEY ("obstaculo_id") REFERENCES "public"."obstaculos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cursos" ADD CONSTRAINT "limiar_e_proporcao" CHECK ("cursos"."limiar_de_adiantamento" > 0 and "cursos"."limiar_de_adiantamento" <= 1);--> statement-breakpoint
ALTER TABLE "cursos" ADD CONSTRAINT "criterio_de_grupo_coerente_com_unidade" CHECK (("cursos"."unidade_de_superacao" = 'grupo') = ("cursos"."criterio_de_superacao_do_grupo" is not null));