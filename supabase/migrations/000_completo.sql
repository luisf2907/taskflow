-- =============================================
-- MIGRATION COMPLETA — Taskflow
-- Execute este SQL inteiro no SQL Editor do Supabase
-- =============================================

-- 1. WORKSPACES
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#C4841D',
  icone TEXT DEFAULT 'folder',
  colunas_padrao TEXT[] DEFAULT '{"A Fazer","Em Andamento","Em Revisão","Concluído"}',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. QUADROS (boards / sprints)
CREATE TABLE quadros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#3B82F6',
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  data_inicio DATE,
  data_fim DATE,
  status_sprint TEXT DEFAULT 'planejada' CHECK (status_sprint IN ('planejada', 'ativa', 'concluida')),
  meta TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. COLUNAS (lists)
CREATE TABLE colunas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. CARTOES (cards)
CREATE TABLE cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coluna_id UUID REFERENCES colunas(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  posicao INTEGER NOT NULL DEFAULT 0,
  etiquetas TEXT[] DEFAULT '{}',
  data_entrega TIMESTAMPTZ,
  peso INTEGER,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. ETIQUETAS
CREATE TABLE etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. CARTAO_ETIQUETAS (junction)
CREATE TABLE cartao_etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  etiqueta_id UUID REFERENCES etiquetas(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(cartao_id, etiqueta_id)
);

-- 7. MEMBROS
CREATE TABLE membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  cor_avatar TEXT NOT NULL DEFAULT '#3B82F6',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 8. CARTAO_MEMBROS (junction)
CREATE TABLE cartao_membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  membro_id UUID REFERENCES membros(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(cartao_id, membro_id)
);

-- 9. CHECKLISTS
CREATE TABLE checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Checklist',
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 10. CHECKLIST_ITENS
CREATE TABLE checklist_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  concluido BOOLEAN DEFAULT false,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 11. COMENTARIOS
CREATE TABLE comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  membro_id UUID REFERENCES membros(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 12. ANEXOS
CREATE TABLE anexos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDICES
-- =============================================
CREATE INDEX idx_quadros_workspace ON quadros(workspace_id);
CREATE INDEX idx_quadros_status_sprint ON quadros(status_sprint) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_quadros_data_fim ON quadros(data_fim) WHERE data_fim IS NOT NULL;
CREATE INDEX idx_colunas_quadro ON colunas(quadro_id);
CREATE INDEX idx_colunas_posicao ON colunas(quadro_id, posicao);
CREATE INDEX idx_cartoes_coluna ON cartoes(coluna_id);
CREATE INDEX idx_cartoes_posicao ON cartoes(coluna_id, posicao);
CREATE INDEX idx_cartoes_workspace ON cartoes(workspace_id) WHERE coluna_id IS NULL;
CREATE INDEX idx_cartoes_backlog ON cartoes(coluna_id) WHERE coluna_id IS NULL;
CREATE INDEX idx_cartoes_data_entrega ON cartoes(data_entrega) WHERE data_entrega IS NOT NULL;
CREATE INDEX idx_etiquetas_quadro ON etiquetas(quadro_id);
CREATE INDEX idx_etiquetas_workspace ON etiquetas(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_cartao_etiquetas_cartao ON cartao_etiquetas(cartao_id);
CREATE INDEX idx_cartao_etiquetas_etiqueta ON cartao_etiquetas(etiqueta_id);
CREATE INDEX idx_membros_quadro ON membros(quadro_id);
CREATE INDEX idx_membros_workspace ON membros(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_cartao_membros_cartao ON cartao_membros(cartao_id);
CREATE INDEX idx_cartao_membros_membro ON cartao_membros(membro_id);
CREATE INDEX idx_checklists_cartao ON checklists(cartao_id);
CREATE INDEX idx_checklist_itens_checklist ON checklist_itens(checklist_id);
CREATE INDEX idx_comentarios_cartao ON comentarios(cartao_id);
CREATE INDEX idx_anexos_cartao ON anexos(cartao_id);
CREATE INDEX idx_workspaces_criado ON workspaces(criado_em);

-- =============================================
-- RLS (permissivo por enquanto — sem auth)
-- =============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE quadros ENABLE ROW LEVEL SECURITY;
ALTER TABLE colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total workspaces" ON workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total quadros" ON quadros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total colunas" ON colunas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartoes" ON cartoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total etiquetas" ON etiquetas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartao_etiquetas" ON cartao_etiquetas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total membros" ON membros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartao_membros" ON cartao_membros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total checklists" ON checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total checklist_itens" ON checklist_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total comentarios" ON comentarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total anexos" ON anexos FOR ALL USING (true) WITH CHECK (true);
