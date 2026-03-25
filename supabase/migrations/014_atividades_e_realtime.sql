-- ============================================
-- 014: Tabela de atividades + Supabase Realtime
-- ============================================

-- Tabela de activity log
CREATE TABLE IF NOT EXISTS atividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  quadro_id UUID REFERENCES quadros(id) ON DELETE SET NULL,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES perfis(id),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Indexes para queries performaticas
CREATE INDEX IF NOT EXISTS idx_atividades_workspace ON atividades(workspace_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atividades_quadro ON atividades(quadro_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atividades_user ON atividades(user_id);

-- RLS
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total atividades" ON atividades FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime nas tabelas que precisam de live sync
ALTER PUBLICATION supabase_realtime ADD TABLE atividades;
ALTER PUBLICATION supabase_realtime ADD TABLE cartoes;
ALTER PUBLICATION supabase_realtime ADD TABLE colunas;
ALTER PUBLICATION supabase_realtime ADD TABLE comentarios;
ALTER PUBLICATION supabase_realtime ADD TABLE quadros;
