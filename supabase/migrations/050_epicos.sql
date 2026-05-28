-- =============================================
-- 050: Épicos como marcador em cartoes
-- Reusa cartao_pai_id (migration 049). Cards marcados como épico ganham
-- uma cor da paleta curada. Filhos herdam visualmente a cor do épico.
-- =============================================

BEGIN;

-- =============================================
-- Colunas em cartoes
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS eh_epico BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cor_epico TEXT NULL;

-- =============================================
-- Index para listar épicos do workspace rapidamente
-- =============================================
CREATE INDEX IF NOT EXISTS idx_cartoes_epicos
  ON cartoes(workspace_id, eh_epico)
  WHERE eh_epico = true;

-- =============================================
-- Função helper — conta épicos ativos do workspace
-- (épico ativo = eh_epico AND não concluído)
-- Usada pelo frontend pra checar limite antes de criar.
-- =============================================
CREATE OR REPLACE FUNCTION contar_epicos_ativos(ws_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM cartoes
  WHERE workspace_id = ws_id
    AND eh_epico = true
    AND data_conclusao IS NULL;
$$;

GRANT EXECUTE ON FUNCTION contar_epicos_ativos(UUID) TO authenticated;

COMMIT;
