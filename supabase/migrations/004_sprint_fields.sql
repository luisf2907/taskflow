-- Migration 004: Campos de Sprint nos Quadros + Colunas Padrão no Workspace

-- =============================================
-- 1. CAMPOS DE SPRINT NO QUADRO
-- =============================================
ALTER TABLE quadros ADD COLUMN data_inicio DATE;
ALTER TABLE quadros ADD COLUMN data_fim DATE;
ALTER TABLE quadros ADD COLUMN status_sprint TEXT DEFAULT 'planejada'
  CHECK (status_sprint IN ('planejada', 'ativa', 'concluida'));
ALTER TABLE quadros ADD COLUMN meta TEXT;

-- =============================================
-- 2. COLUNAS PADRÃO NO WORKSPACE
-- =============================================
ALTER TABLE workspaces ADD COLUMN colunas_padrao TEXT[] DEFAULT '{"A Fazer","Em Andamento","Em Revisão","Concluído"}';

-- =============================================
-- 3. ÍNDICES
-- =============================================
CREATE INDEX idx_quadros_status_sprint ON quadros(status_sprint) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_quadros_data_fim ON quadros(data_fim) WHERE data_fim IS NOT NULL;
