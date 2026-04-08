-- =============================================================================
-- 036_fix_trigger_search_path.sql
-- Fix do warning do Security Advisor:
--   function_search_path_mutable em public.tg_set_atualizado_em
--
-- A funcao foi criada na migration 034 sem SET search_path, o que permite
-- que um atacante com permissao de criar objetos em outro schema do
-- search_path injete uma tabela/funcao maliciosa. Mesmo que essa funcao
-- nao leia de tabela nenhuma, a boa pratica (e o linter) exige o pin.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;
