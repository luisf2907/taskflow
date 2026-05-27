-- =============================================
-- 047: Views salvas (filtros nomeados)
-- Permite usuários salvarem combinações de filtros
-- como views nomeadas (pessoais ou compartilhadas).
-- =============================================

BEGIN;

-- =============================================
-- TABELA: views_salvas
-- Uma view = nome + filtros (JSONB) + escopo (quadro ou workspace inteiro)
-- =============================================
CREATE TABLE IF NOT EXISTS views_salvas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  compartilhada BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Mesmo usuário não pode ter duas views com mesmo nome no mesmo escopo
  CONSTRAINT views_salvas_nome_unico UNIQUE (usuario_id, quadro_id, nome)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_views_salvas_workspace ON views_salvas(workspace_id);
CREATE INDEX idx_views_salvas_quadro ON views_salvas(quadro_id) WHERE quadro_id IS NOT NULL;
CREATE INDEX idx_views_salvas_usuario ON views_salvas(usuario_id);
-- Para o listing: views minhas + compartilhadas no workspace
CREATE INDEX idx_views_salvas_listing
  ON views_salvas(workspace_id, quadro_id, compartilhada);

-- =============================================
-- TRIGGER: atualizado_em
-- =============================================
CREATE OR REPLACE FUNCTION update_views_salvas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_views_salvas_updated_at
  BEFORE UPDATE ON views_salvas
  FOR EACH ROW
  EXECUTE FUNCTION update_views_salvas_updated_at();

-- =============================================
-- RLS
-- SELECT: workspace_id deve ser meu E (sou o dono OU é compartilhada)
-- INSERT: workspace_id deve ser meu E usuario_id = eu
-- UPDATE/DELETE: só o dono
-- =============================================
ALTER TABLE views_salvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "views_salvas_select" ON views_salvas
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND (usuario_id = (SELECT auth.uid()) OR compartilhada = true)
  );

CREATE POLICY "views_salvas_insert" ON views_salvas
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT my_workspace_ids())
    AND usuario_id = (SELECT auth.uid())
  );

CREATE POLICY "views_salvas_update" ON views_salvas
  FOR UPDATE USING (
    usuario_id = (SELECT auth.uid())
  );

CREATE POLICY "views_salvas_delete" ON views_salvas
  FOR DELETE USING (
    usuario_id = (SELECT auth.uid())
  );

COMMIT;
