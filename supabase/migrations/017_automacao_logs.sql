-- ============================================
-- 017: Log de execução de automações
-- ============================================

CREATE TABLE IF NOT EXISTS automacao_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automacao_id UUID NOT NULL REFERENCES automacoes(id) ON DELETE CASCADE,
  automacao_nome TEXT NOT NULL,
  trigger_tipo TEXT NOT NULL,
  acao_tipo TEXT NOT NULL,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL,
  cartao_titulo TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automacao_logs_workspace ON automacao_logs(workspace_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_automacao_logs_automacao ON automacao_logs(automacao_id, criado_em DESC);

ALTER TABLE automacao_logs ENABLE ROW LEVEL SECURITY;

-- Membros do workspace podem ver logs
CREATE POLICY "Membros veem logs de automacao" ON automacao_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM membros WHERE user_id = auth.uid()
    )
  );

-- Insert via service role ou membro
CREATE POLICY "Inserir logs de automacao" ON automacao_logs
  FOR INSERT WITH CHECK (true);
