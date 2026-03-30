-- =============================================
-- FIX: Remover membros duplicados e prevenir futuros
-- =============================================

-- 1. Deletar duplicados mantendo o mais antigo por (user_id, workspace_id)
DELETE FROM membros
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, workspace_id) id
  FROM membros
  WHERE user_id IS NOT NULL
  ORDER BY user_id, workspace_id, criado_em ASC
)
AND user_id IS NOT NULL
AND workspace_id IS NOT NULL;

-- 2. Criar unique constraint para prevenir duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS idx_membros_user_workspace_unique
  ON membros(user_id, workspace_id)
  WHERE user_id IS NOT NULL AND workspace_id IS NOT NULL;
