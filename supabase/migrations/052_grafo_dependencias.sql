-- =============================================
-- 052: Grafo de dependências
-- RPC que faz traversal recursivo (BFS) a partir de um card,
-- alcançando todos os nós conectados por dependência em AMBAS as
-- direções (depende de / bloqueia), com profundidade limitada.
-- Retorna os nós (cards) + as arestas (dependências).
-- =============================================

BEGIN;

-- =============================================
-- FUNÇÃO: grafo_dependencias(card_id, max_profundidade)
-- Retorna duas "seções" via coluna `tipo_linha`:
--   'no'    → um card alcançável (com contexto de coluna/sprint/épico)
--   'aresta'→ uma dependência (cartao_id depende de depende_de_cartao_id)
-- SECURITY INVOKER respeita RLS do usuário.
-- =============================================
CREATE OR REPLACE FUNCTION grafo_dependencias(
  card_id UUID,
  max_profundidade INTEGER DEFAULT 6
)
RETURNS TABLE (
  tipo_linha TEXT,
  -- Campos de nó:
  no_id UUID,
  no_titulo TEXT,
  no_data_conclusao TIMESTAMPTZ,
  no_coluna_nome TEXT,
  no_quadro_id UUID,
  no_quadro_nome TEXT,
  no_eh_epico BOOLEAN,
  no_cor_epico TEXT,
  no_profundidade INTEGER,
  -- Campos de aresta:
  aresta_origem UUID,
  aresta_destino UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE alcancaveis AS (
    -- Nó raiz
    SELECT card_id AS id, 0 AS profundidade
    UNION
    -- Expande em ambas as direções
    SELECT prox.id, a.profundidade + 1
    FROM alcancaveis a
    JOIN LATERAL (
      -- cards que `a` depende
      SELECT d.depende_de_cartao_id AS id
      FROM cartao_dependencias d
      WHERE d.cartao_id = a.id
      UNION
      -- cards que dependem de `a`
      SELECT d.cartao_id AS id
      FROM cartao_dependencias d
      WHERE d.depende_de_cartao_id = a.id
    ) prox ON true
    WHERE a.profundidade < max_profundidade
  ),
  -- Profundidade mínima por nó (pode ser alcançado por vários caminhos)
  nos_unicos AS (
    SELECT id, MIN(profundidade) AS profundidade
    FROM alcancaveis
    GROUP BY id
  )
  -- Seção de NÓS
  SELECT
    'no'::text                       AS tipo_linha,
    c.id                             AS no_id,
    c.titulo                         AS no_titulo,
    c.data_conclusao                 AS no_data_conclusao,
    col.nome                         AS no_coluna_nome,
    col.quadro_id                    AS no_quadro_id,
    q.nome                           AS no_quadro_nome,
    c.eh_epico                       AS no_eh_epico,
    c.cor_epico                      AS no_cor_epico,
    n.profundidade                   AS no_profundidade,
    NULL::uuid                       AS aresta_origem,
    NULL::uuid                       AS aresta_destino
  FROM nos_unicos n
  JOIN cartoes c ON c.id = n.id
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id

  UNION ALL

  -- Seção de ARESTAS (só entre nós alcançados)
  SELECT
    'aresta'::text                   AS tipo_linha,
    NULL::uuid, NULL::text, NULL::timestamptz, NULL::text,
    NULL::uuid, NULL::text, NULL::boolean, NULL::text, NULL::integer,
    d.cartao_id                      AS aresta_origem,
    d.depende_de_cartao_id           AS aresta_destino
  FROM cartao_dependencias d
  WHERE d.cartao_id IN (SELECT id FROM nos_unicos)
    AND d.depende_de_cartao_id IN (SELECT id FROM nos_unicos);
$$;

GRANT EXECUTE ON FUNCTION grafo_dependencias(UUID, INTEGER) TO authenticated;

COMMIT;
