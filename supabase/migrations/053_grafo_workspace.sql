-- =============================================
-- 053: Grafo de dependências — escopo workspace inteiro
-- RPC que retorna TODOS os cards do workspace que participam de alguma
-- dependência (como origem ou destino) + todas as arestas. Inclui o
-- épico resolvido de cada card (próprio se eh_epico, senão herdado do
-- pai) pra permitir filtro por épico no frontend.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION grafo_dependencias_workspace(ws_id UUID)
RETURNS TABLE (
  tipo_linha TEXT,
  no_id UUID,
  no_titulo TEXT,
  no_data_conclusao TIMESTAMPTZ,
  no_coluna_nome TEXT,
  no_quadro_id UUID,
  no_quadro_nome TEXT,
  no_epico_id UUID,
  no_epico_cor TEXT,
  no_epico_titulo TEXT,
  aresta_origem UUID,
  aresta_destino UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH deps AS (
    -- Todas as dependências cujo lado "origem" pertence ao workspace.
    -- (origem e destino são sempre do mesmo workspace por construção da UI.)
    SELECT d.cartao_id, d.depende_de_cartao_id
    FROM cartao_dependencias d
    JOIN cartoes c ON c.id = d.cartao_id
    WHERE c.workspace_id = ws_id
  ),
  -- Conjunto de cards que participam (origem OU destino)
  ids AS (
    SELECT cartao_id AS id FROM deps
    UNION
    SELECT depende_de_cartao_id AS id FROM deps
  )
  -- NÓS
  SELECT
    'no'::text                                   AS tipo_linha,
    c.id                                         AS no_id,
    c.titulo                                     AS no_titulo,
    c.data_conclusao                             AS no_data_conclusao,
    col.nome                                     AS no_coluna_nome,
    col.quadro_id                                AS no_quadro_id,
    q.nome                                       AS no_quadro_nome,
    -- épico resolvido: ele mesmo se épico, senão o pai (se for épico)
    CASE WHEN c.eh_epico THEN c.id
         WHEN pai.id IS NOT NULL THEN pai.id
         ELSE NULL END                           AS no_epico_id,
    CASE WHEN c.eh_epico THEN c.cor_epico
         WHEN pai.id IS NOT NULL THEN pai.cor_epico
         ELSE NULL END                           AS no_epico_cor,
    CASE WHEN c.eh_epico THEN c.titulo
         WHEN pai.id IS NOT NULL THEN pai.titulo
         ELSE NULL END                           AS no_epico_titulo,
    NULL::uuid                                   AS aresta_origem,
    NULL::uuid                                   AS aresta_destino
  FROM ids
  JOIN cartoes c ON c.id = ids.id
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id
  LEFT JOIN cartoes pai ON pai.id = c.cartao_pai_id AND pai.eh_epico = true

  UNION ALL

  -- ARESTAS
  SELECT
    'aresta'::text,
    NULL::uuid, NULL::text, NULL::timestamptz, NULL::text,
    NULL::uuid, NULL::text, NULL::uuid, NULL::text, NULL::text,
    deps.cartao_id              AS aresta_origem,
    deps.depende_de_cartao_id   AS aresta_destino
  FROM deps;
$$;

GRANT EXECUTE ON FUNCTION grafo_dependencias_workspace(UUID) TO authenticated;

COMMIT;
