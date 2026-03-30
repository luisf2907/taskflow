-- =============================================
-- PLANNING POKER
-- =============================================

-- Sessoes de estimativa
CREATE TABLE IF NOT EXISTS poker_sessoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES perfis(id),
  status TEXT NOT NULL DEFAULT 'votando' CHECK (status IN ('votando', 'revelado', 'finalizado')),
  resultado_final NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Apenas 1 sessao ativa por cartao
CREATE UNIQUE INDEX idx_poker_sessao_ativa_por_cartao
  ON poker_sessoes(cartao_id)
  WHERE status != 'finalizado';

CREATE INDEX idx_poker_sessoes_workspace ON poker_sessoes(workspace_id, criado_em DESC);

-- Votos dos participantes
CREATE TABLE IF NOT EXISTS poker_votos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES poker_sessoes(id) ON DELETE CASCADE,
  membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES perfis(id),
  valor TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sessao_id, user_id)
);

CREATE INDEX idx_poker_votos_sessao ON poker_votos(sessao_id);

-- RLS (mesmo padrao permissivo do projeto — controle no app layer)
ALTER TABLE poker_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_votos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total poker_sessoes" ON poker_sessoes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total poker_votos" ON poker_votos
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE poker_sessoes;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_votos;
