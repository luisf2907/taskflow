-- Migration 006: Etiquetas podem pertencer a workspace (não apenas a quadro)

-- Tornar quadro_id nullable e adicionar workspace_id
ALTER TABLE etiquetas ALTER COLUMN quadro_id DROP NOT NULL;
ALTER TABLE etiquetas ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Índice
CREATE INDEX idx_etiquetas_workspace ON etiquetas(workspace_id) WHERE workspace_id IS NOT NULL;
