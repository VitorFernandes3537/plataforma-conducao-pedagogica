-- `D1-PERGUNTA`: a pergunta condutora é texto do curso.
--
-- Três passos em vez de um `ADD COLUMN NOT NULL`, que quebra em qualquer
-- tabela que já tenha linha. Este é o padrão que a ADR 0001 passa a exigir a
-- partir do D1, quando o banco carrega nota real de aluno — e vale praticar
-- antes, não depois.
--
--   1. adiciona anulável
--   2. preenche o que já existe
--   3. só então trava em NOT NULL

ALTER TABLE "cursos" ADD COLUMN "pergunta_condutora" text;--> statement-breakpoint

-- Linha anterior à coluna recebe marcador explícito. Não é conteúdo
-- pedagógico: é sinal de que falta preencher.
UPDATE "cursos"
   SET "pergunta_condutora" = '(pergunta condutora não definida)'
 WHERE "pergunta_condutora" IS NULL;--> statement-breakpoint

ALTER TABLE "cursos" ALTER COLUMN "pergunta_condutora" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "cursos" ADD CONSTRAINT "pergunta_condutora_nao_vazia" CHECK (length(btrim("cursos"."pergunta_condutora")) > 0);
