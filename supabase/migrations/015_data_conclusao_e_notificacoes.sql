-- ============================================
-- 015: data_conclusao + notificacoes
-- ============================================

-- Data de conclusao nos cartoes
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ DEFAULT NULL;

-- Tabela de notificacoes in-app
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  tipo TEXT DEFAULT 'info',
  lida BOOLEAN DEFAULT false,
  link TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON notificacoes(user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(user_id, lida);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total notificacoes" ON notificacoes FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
