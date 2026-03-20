-- Migration 003: Workspaces

-- =============================================
-- 1. TABELA WORKSPACES
-- =============================================
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#C4841D',
  icone TEXT DEFAULT 'folder',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. VINCULAR QUADROS A WORKSPACES (OPCIONAL)
-- =============================================
ALTER TABLE quadros ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- =============================================
-- 3. ÍNDICES
-- =============================================
CREATE INDEX idx_quadros_workspace ON quadros(workspace_id);
CREATE INDEX idx_workspaces_criado ON workspaces(criado_em);

-- =============================================
-- 4. RLS (permissivo por enquanto)
-- =============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total workspaces" ON workspaces FOR ALL USING (true) WITH CHECK (true);
