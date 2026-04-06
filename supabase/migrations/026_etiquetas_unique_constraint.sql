-- Unique constraint para suportar upsert batch de etiquetas
-- Evita duplicatas e race conditions na criacao concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_etiquetas_workspace_nome
  ON etiquetas(workspace_id, nome)
  WHERE workspace_id IS NOT NULL;
