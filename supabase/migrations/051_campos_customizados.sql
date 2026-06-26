-- =============================================
-- 051: Campos customizados por workspace
-- Admin define campos (texto, número, data, select, checkbox) que
-- aparecem em todos os cards do workspace. Valores armazenados como
-- JSONB pra flexibilidade entre tipos.
-- =============================================

BEGIN;

-- =============================================
-- TABELA: campos_customizados
-- Definição do campo (compartilhada entre cards do workspace).
-- =============================================
CREATE TABLE IF NOT EXISTS campos_customizados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'numero', 'data', 'select', 'checkbox')),
  opcoes JSONB DEFAULT NULL,  -- array de strings pra tipo 'select'
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Nome único por workspace
  CONSTRAINT campos_customizados_nome_unico UNIQUE (workspace_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_campos_customizados_workspace
  ON campos_customizados(workspace_id, posicao);

-- =============================================
-- TABELA: cartao_campos_valores
-- Valor de um campo customizado pra um card específico.
-- valor JSONB porque o formato depende do tipo do campo.
-- =============================================
CREATE TABLE IF NOT EXISTS cartao_campos_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES campos_customizados(id) ON DELETE CASCADE,
  valor JSONB DEFAULT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Um valor por (cartao, campo)
  CONSTRAINT cartao_campos_valores_unico UNIQUE (cartao_id, campo_id)
);

CREATE INDEX IF NOT EXISTS idx_cartao_campos_valores_cartao
  ON cartao_campos_valores(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_campos_valores_campo
  ON cartao_campos_valores(campo_id);

-- =============================================
-- TRIGGERS — atualizado_em
-- =============================================
CREATE OR REPLACE FUNCTION update_campos_customizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campos_customizados_updated_at
  BEFORE UPDATE ON campos_customizados
  FOR EACH ROW
  EXECUTE FUNCTION update_campos_customizados_updated_at();

CREATE OR REPLACE FUNCTION update_cartao_campos_valores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cartao_campos_valores_updated_at
  BEFORE UPDATE ON cartao_campos_valores
  FOR EACH ROW
  EXECUTE FUNCTION update_cartao_campos_valores_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE campos_customizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campos_customizados_select" ON campos_customizados
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_insert" ON campos_customizados
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_update" ON campos_customizados
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_delete" ON campos_customizados
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

ALTER TABLE cartao_campos_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cartao_campos_valores_all" ON cartao_campos_valores
  FOR ALL
  USING (
    cartao_id IN (
      SELECT id FROM cartoes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    cartao_id IN (
      SELECT id FROM cartoes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE campos_customizados;
ALTER PUBLICATION supabase_realtime ADD TABLE cartao_campos_valores;

COMMIT;
