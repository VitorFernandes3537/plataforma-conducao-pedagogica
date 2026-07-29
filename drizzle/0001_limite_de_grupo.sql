-- O tamanho do grupo é configuração do curso (Doc 7 §2.4, última linha:
-- "Nenhum limiar ou quantidade é constante"), então não pode ser CHECK com
-- literal. E precisa morar no banco, não só na aplicação, porque validação
-- em código perde a corrida entre duas alocações simultâneas.
--
-- O SELECT ... FOR UPDATE na linha do grupo é o que serializa: duas
-- transações concorrentes para o mesmo grupo passam a esperar uma pela
-- outra, em vez de ambas lerem a contagem antiga e ambas passarem.

CREATE OR REPLACE FUNCTION valida_tamanho_do_grupo() RETURNS trigger AS $$
DECLARE
  maximo integer;
  ja_alocados integer;
BEGIN
  IF NEW.grupo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.tamanho_maximo_de_grupo
    INTO maximo
    FROM grupos g
    JOIN turmas t ON t.id = g.turma_id
    JOIN cursos c ON c.id = t.curso_id
   WHERE g.id = NEW.grupo_id
     FOR UPDATE OF g;

  IF maximo IS NULL THEN
    RAISE EXCEPTION 'grupo % nao encontrado', NEW.grupo_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT count(*)
    INTO ja_alocados
    FROM alunos a
   WHERE a.grupo_id = NEW.grupo_id
     AND a.id <> NEW.id;

  IF ja_alocados + 1 > maximo THEN
    RAISE EXCEPTION
      'grupo % ja tem % integrantes e o curso configura no maximo %',
      NEW.grupo_id, ja_alocados, maximo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER alunos_valida_tamanho_do_grupo
  BEFORE INSERT OR UPDATE OF grupo_id ON alunos
  FOR EACH ROW EXECUTE FUNCTION valida_tamanho_do_grupo();
