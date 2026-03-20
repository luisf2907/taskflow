-- Migration 005: Backlog — cartões podem existir sem coluna

-- Tornar coluna_id nullable (cartões no backlog não pertencem a nenhuma coluna)
ALTER TABLE cartoes ALTER COLUMN coluna_id DROP NOT NULL;

-- Adicionar workspace_id direto no cartão (para cartões de backlog que não têm coluna/quadro)
ALTER TABLE cartoes ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Índice para buscar cartões de backlog por workspace
CREATE INDEX idx_cartoes_workspace ON cartoes(workspace_id) WHERE coluna_id IS NULL;
CREATE INDEX idx_cartoes_backlog ON cartoes(coluna_id) WHERE coluna_id IS NULL;
