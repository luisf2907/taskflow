-- =============================================================================
-- 041_reuniao_resumo_ia.sql
-- -----------------------------------------------------------------------------
-- Adiciona coluna para resumo gerado por IA em reunioes.
-- Formato JSONB: { resumo, pontos_chave[], tarefas[], gerado_em }
-- =============================================================================

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS resumo_ia JSONB DEFAULT NULL;
