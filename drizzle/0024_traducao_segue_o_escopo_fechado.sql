-- A tabela de tradução passa a obedecer ao mesmo portão das respostas.
--
-- O gatilho da migration 0009 guardava só `respostas_de_pergunta`. A tabela de
-- tradução ficava de fora, e ela é parte do que o instrutor julga: o Doc 2 §4.5
-- lista "a tabela de tradução está completa e sem nomes genéricos" entre os
-- critérios de aprovação do marco. Editá-la depois de entregar torna a fila do
-- instrutor um alvo móvel, exatamente como editar uma resposta.
--
-- A brecha era teórica enquanto ninguém escrevia nessa tabela — não havia
-- consulta de escrita, e os testes inseriam à mão. Deixou de ser no momento em
-- que `gravaLinhaDeTraducao` passou a existir: sem este gatilho, a única
-- guarda seria a da aplicação, e a integridade deste projeto mora no banco.
--
-- A função não muda. Ela só depende de `NEW.resposta_de_escopo_id`, que as duas
-- tabelas têm — inclusive a porta estreita da poda (migration 0010), que
-- continua valendo do mesmo jeito para os dois.
CREATE TRIGGER linhas_de_traducao_recusa_escopo_fechado
  BEFORE INSERT OR UPDATE ON linhas_de_traducao
  FOR EACH ROW EXECUTE FUNCTION recusa_edicao_de_escopo_fechado();
