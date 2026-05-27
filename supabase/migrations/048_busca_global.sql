-- =============================================
-- 048: Busca global instantânea (full-text search)
-- Adiciona tsvector columns + GIN indexes em cartoes, wiki_paginas e
-- comentarios. Função buscar_global() faz UNION ALL ranqueado.
-- =============================================

BEGIN;

-- =============================================
-- CARTOES — tsvector(titulo:A, descricao:B)
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(descricao, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_cartoes_search
  ON cartoes USING GIN (search_vector);

-- =============================================
-- WIKI_PAGINAS — tsvector(titulo:A, conteudo:B)
-- conteudo é JSONB (TipTap). jsonb_to_tsvector extrai todas as strings.
-- =============================================
ALTER TABLE wiki_paginas
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(
      jsonb_to_tsvector('portuguese', coalesce(conteudo, '{}'::jsonb), '["string"]'),
      'B'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_wiki_paginas_search
  ON wiki_paginas USING GIN (search_vector);

-- =============================================
-- COMENTARIOS — tsvector(texto:B)
-- =============================================
ALTER TABLE comentarios
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(texto, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_comentarios_search
  ON comentarios USING GIN (search_vector);

-- =============================================
-- FUNÇÃO: buscar_global(termo, limit_total)
-- Retorna UNION ALL ranqueado de cartoes + wiki_paginas + comentarios.
-- SECURITY INVOKER: respeita RLS do usuário (não vaza entre workspaces).
-- =============================================
CREATE OR REPLACE FUNCTION buscar_global(
  termo text,
  limit_total integer DEFAULT 30
)
RETURNS TABLE (
  tipo text,
  id uuid,
  workspace_id uuid,
  titulo text,
  snippet text,
  quadro_id uuid,
  slug text,
  cartao_id uuid,
  rank real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('portuguese', termo) AS tsq
  )
  -- Cartões
  SELECT
    'cartao'::text                        AS tipo,
    c.id                                  AS id,
    c.workspace_id                        AS workspace_id,
    c.titulo                              AS titulo,
    ts_headline(
      'portuguese',
      coalesce(c.descricao, c.titulo),
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    )                                     AS snippet,
    col.quadro_id                         AS quadro_id,
    NULL::text                            AS slug,
    NULL::uuid                            AS cartao_id,
    ts_rank(c.search_vector, q.tsq) * 1.5 AS rank  -- boost cartões
  FROM cartoes c
  LEFT JOIN colunas col ON col.id = c.coluna_id
  CROSS JOIN q
  WHERE c.search_vector @@ q.tsq

  UNION ALL

  -- Wiki
  SELECT
    'wiki'::text,
    w.id,
    w.workspace_id,
    w.titulo,
    ts_headline(
      'portuguese',
      w.titulo,
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    ),
    NULL::uuid,
    w.slug,
    NULL::uuid,
    ts_rank(w.search_vector, q.tsq)
  FROM wiki_paginas w
  CROSS JOIN q
  WHERE w.search_vector @@ q.tsq

  UNION ALL

  -- Comentários (workspace via JOIN com cartoes)
  SELECT
    'comentario'::text,
    cm.id,
    ca.workspace_id,
    left(cm.texto, 60),  -- preview pra fallback
    ts_headline(
      'portuguese',
      cm.texto,
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    ),
    col.quadro_id,
    NULL::text,
    cm.cartao_id,
    ts_rank(cm.search_vector, q.tsq) * 0.7  -- comentários têm menos peso
  FROM comentarios cm
  JOIN cartoes ca ON ca.id = cm.cartao_id
  LEFT JOIN colunas col ON col.id = ca.coluna_id
  CROSS JOIN q
  WHERE cm.search_vector @@ q.tsq

  ORDER BY rank DESC
  LIMIT limit_total;
$$;

-- Permite execução pra usuários autenticados (a RLS interna filtra)
GRANT EXECUTE ON FUNCTION buscar_global(text, integer) TO authenticated;

COMMIT;
