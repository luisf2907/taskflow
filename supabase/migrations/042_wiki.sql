-- =============================================
-- 042: Wiki System
-- Tabela de páginas da wiki por workspace
-- =============================================

BEGIN;

-- =============================================
-- TABELA: wiki_paginas
-- Armazena páginas hierárquicas da wiki
-- Conteúdo em JSONB (formato TipTap nativo)
-- =============================================
CREATE TABLE IF NOT EXISTS wiki_paginas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES wiki_paginas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Sem título',
  slug TEXT NOT NULL,
  icone TEXT DEFAULT NULL,
  capa_url TEXT DEFAULT NULL,
  conteudo JSONB DEFAULT NULL,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_por UUID NOT NULL REFERENCES perfis(id),
  atualizado_por UUID REFERENCES perfis(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, slug)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_wiki_paginas_workspace ON wiki_paginas(workspace_id);
CREATE INDEX idx_wiki_paginas_parent ON wiki_paginas(workspace_id, parent_id, posicao);
CREATE INDEX idx_wiki_paginas_slug ON wiki_paginas(workspace_id, slug);

-- =============================================
-- RLS — flat: workspace_id IN (SELECT my_workspace_ids())
-- Mesmo padrão de cartoes, etiquetas, automacoes, etc.
-- =============================================
ALTER TABLE wiki_paginas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wiki_paginas_select" ON wiki_paginas
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "wiki_paginas_insert" ON wiki_paginas
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "wiki_paginas_update" ON wiki_paginas
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "wiki_paginas_delete" ON wiki_paginas
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

-- =============================================
-- REALTIME — habilita sync multi-user
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE wiki_paginas;

COMMIT;
