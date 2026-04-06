-- =============================================
-- 027: CHECK constraints, ON DELETE fixes, indices faltantes
-- =============================================

BEGIN;

-- =============================================
-- CHECK CONSTRAINTS: prevenir dados orfaos
-- =============================================

-- Cartoes: deve ter workspace_id (ja NOT NULL na 025, mas reforcar)
-- Etiquetas: deve pertencer a um workspace ou quadro
ALTER TABLE etiquetas
  ADD CONSTRAINT etiquetas_has_owner
  CHECK ((quadro_id IS NOT NULL) OR (workspace_id IS NOT NULL));

-- Membros: deve pertencer a um workspace ou quadro
ALTER TABLE membros
  ADD CONSTRAINT membros_has_owner
  CHECK ((quadro_id IS NOT NULL) OR (workspace_id IS NOT NULL));

-- =============================================
-- ON DELETE: corrigir inconsistencias
-- =============================================

-- quadros.workspace_id: SET NULL → CASCADE
-- (deletar workspace deve deletar seus quadros, nao orfana-los)
ALTER TABLE quadros
  DROP CONSTRAINT IF EXISTS quadros_workspace_id_fkey;
ALTER TABLE quadros
  ADD CONSTRAINT quadros_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- cartoes.workspace_id: SET NULL → CASCADE
-- (com NOT NULL, SET NULL falharia de qualquer forma)
ALTER TABLE cartoes
  DROP CONSTRAINT IF EXISTS cartoes_workspace_id_fkey;
ALTER TABLE cartoes
  ADD CONSTRAINT cartoes_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- =============================================
-- INDICES FALTANTES para queries comuns
-- =============================================

-- atividades por cartao (timeline do card)
CREATE INDEX IF NOT EXISTS idx_atividades_cartao
  ON atividades(cartao_id, criado_em DESC)
  WHERE cartao_id IS NOT NULL;

-- comentarios ordenados por cartao
CREATE INDEX IF NOT EXISTS idx_comentarios_cartao_ordenado
  ON comentarios(cartao_id, criado_em DESC);

-- rate_limits: composite para cleanup eficiente
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON rate_limits(key, window_start);

-- cartoes: workspace + criado_em para listagem paginada
CREATE INDEX IF NOT EXISTS idx_cartoes_ws_criado
  ON cartoes(workspace_id, criado_em DESC);

COMMIT;
