-- Migration 007: Membros podem pertencer a workspace (não apenas a quadro)

ALTER TABLE membros ALTER COLUMN quadro_id DROP NOT NULL;
ALTER TABLE membros ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_membros_workspace ON membros(workspace_id) WHERE workspace_id IS NOT NULL;
