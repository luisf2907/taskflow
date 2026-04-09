-- =============================================================================
-- 039_jsonb_gin_indexes.sql
-- -----------------------------------------------------------------------------
-- GIN indexes em colunas JSONB para evitar full table scans.
-- Sem estes indexes, queries como WHERE detalhes @> '{"acao":"criar"}'
-- fazem sequential scan em todas as rows.
--
-- CONCURRENTLY evita lock exclusivo na tabela durante criacao.
-- =============================================================================

-- Atividades: filtro por campos dentro de detalhes (acao, entidade, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atividades_detalhes_gin
  ON public.atividades USING GIN (detalhes);

-- Cartoes: busca em historico de PRs (status, merged, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cartoes_pr_historico_gin
  ON public.cartoes USING GIN (pr_historico);
