-- =============================================
-- API KEYS para MCP e integrações externas
-- =============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT 'API Key',
  ultimo_uso TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(key_hash)
);

-- Index para lookup rapido por hash
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- RLS: usuario so ve suas proprias keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (user_id = (select auth.uid()));
