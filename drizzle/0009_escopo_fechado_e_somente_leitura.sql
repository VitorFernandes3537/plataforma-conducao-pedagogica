-- "Formulário aprovado torna-se somente leitura para o aluno" (Doc 2 §4.5).
--
-- A regra mora no BANCO, não só na aplicação, por dois motivos. O primeiro é
-- que o caminho de INSERT e o de UPDATE de uma resposta são código diferente, e
-- guardar os dois na aplicação é guardar duas vezes a mesma regra. O segundo é
-- que a aprovação acontece enquanto o grupo está com o formulário aberto: sem
-- gatilho, o aluno grava em cima de um escopo que acabou de ser aprovado e o
-- gabarito de correção passa a ser outro.
--
-- Devolvido é editável de propósito — devolver serve para o grupo corrigir.
CREATE OR REPLACE FUNCTION recusa_edicao_de_escopo_fechado() RETURNS trigger AS $$
DECLARE
  estado_atual estado_do_escopo;
BEGIN
  SELECT e.estado
    INTO estado_atual
    FROM respostas_de_escopo e
   WHERE e.id = NEW.resposta_de_escopo_id;

  IF estado_atual IS NULL THEN
    RAISE EXCEPTION 'resposta de escopo % nao encontrada', NEW.resposta_de_escopo_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF estado_atual NOT IN ('rascunho', 'devolvido') THEN
    RAISE EXCEPTION
      'escopo % esta em % e nao aceita edicao do grupo',
      NEW.resposta_de_escopo_id, estado_atual
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER respostas_de_pergunta_recusa_escopo_fechado
  BEFORE INSERT OR UPDATE ON respostas_de_pergunta
  FOR EACH ROW EXECUTE FUNCTION recusa_edicao_de_escopo_fechado();
