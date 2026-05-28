-- =============================================
-- 049: Subtarefas e dependências entre cards
-- - cartao_pai_id em cartoes (self-reference, ON DELETE SET NULL)
-- - cartao_dependencias: tabela de relação NxN entre cards
-- =============================================

BEGIN;

-- =============================================
-- SUBTAREFAS — coluna self-reference em cartoes
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS cartao_pai_id UUID
    REFERENCES cartoes(id) ON DELETE SET NULL;

-- Index para queries "filhos deste card" (subtarefas)
CREATE INDEX IF NOT EXISTS idx_cartoes_pai_id
  ON cartoes(cartao_pai_id)
  WHERE cartao_pai_id IS NOT NULL;

-- =============================================
-- DEPENDÊNCIAS — relação NxN
-- "cartao_id depende de depende_de_cartao_id"
-- Quer dizer: cartao_id está BLOQUEADO até depende_de_cartao_id ser concluído.
-- =============================================
CREATE TABLE IF NOT EXISTS cartao_dependencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  depende_de_cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES perfis(id) ON DELETE SET NULL,

  -- Não permite dependência circular trivial (auto-referência)
  CONSTRAINT cartao_dependencias_no_self_loop
    CHECK (cartao_id <> depende_de_cartao_id),

  -- Não permite a mesma dependência duplicada
  CONSTRAINT cartao_dependencias_unica
    UNIQUE (cartao_id, depende_de_cartao_id)
);

CREATE INDEX IF NOT EXISTS idx_cartao_deps_cartao
  ON cartao_dependencias(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_deps_depende_de
  ON cartao_dependencias(depende_de_cartao_id);

-- =============================================
-- RLS — só vê deps de cards que pertencem a workspace meu
-- =============================================
ALTER TABLE cartao_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cartao_dependencias_all" ON cartao_dependencias
  FOR ALL
  USING (
    cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
    AND depende_de_cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- =============================================
-- FUNÇÃO HELPER — retorna se um card está bloqueado
-- Bloqueado = tem pelo menos uma dependência aberta (data_conclusao IS NULL)
-- =============================================
CREATE OR REPLACE FUNCTION card_bloqueado(card_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM cartao_dependencias d
    JOIN cartoes c ON c.id = d.depende_de_cartao_id
    WHERE d.cartao_id = card_id
      AND c.data_conclusao IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION card_bloqueado(UUID) TO authenticated;

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE cartao_dependencias;

COMMIT;
