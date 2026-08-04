-- =============================================
-- 055: RPC get_board_data — leitura do board em 1 round-trip
--
-- Antes, abrir /quadro/[id] disparava uma cascata sequencial no client:
--
--   getUser  ->  workspace_usuarios  ->  quadros   (pra descobrir o
--                                                   workspace_id do board)
--   colunas
--   cartoes  ->  checklists + anexos  ->  cartoes (pais dos epicos)
--
-- Cada seta e um round-trip. Esta funcao devolve quadro + colunas +
-- cartoes ja enriquecidos (etiquetas, membros, contagem de checklist,
-- anexos e cor/titulo do epico) numa unica chamada.
--
-- SECURITY INVOKER de proposito: as policies de RLS de quadros, colunas,
-- cartoes, cartao_etiquetas, cartao_membros, checklists e anexos
-- continuam valendo, exatamente como quando o client consultava cada
-- tabela direto. Um SECURITY DEFINER aqui deixaria qualquer usuario
-- autenticado ler qualquer board por id.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_board_data(p_quadro_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH cards AS (
    SELECT c.*
    FROM cartoes c
    JOIN colunas col ON col.id = c.coluna_id
    WHERE col.quadro_id = p_quadro_id
    ORDER BY c.posicao
    LIMIT 500
  ),
  etiq AS (
    SELECT ce.cartao_id, array_agg(ce.etiqueta_id) AS ids
    FROM cartao_etiquetas ce
    JOIN cards ON cards.id = ce.cartao_id
    GROUP BY ce.cartao_id
  ),
  memb AS (
    -- DISTINCT: o client fazia [...new Set(...)] porque um membro pode
    -- aparecer duplicado em cartao_membros.
    SELECT cm.cartao_id, array_agg(DISTINCT cm.membro_id) AS ids
    FROM cartao_membros cm
    JOIN cards ON cards.id = cm.cartao_id
    GROUP BY cm.cartao_id
  ),
  chk AS (
    -- Soma os itens de TODAS as checklists do card (era o mesmo no JS).
    SELECT
      cl.cartao_id,
      COUNT(ci.id)::INT AS total,
      COUNT(ci.id) FILTER (WHERE ci.concluido)::INT AS concluidos
    FROM checklists cl
    JOIN cards ON cards.id = cl.cartao_id
    LEFT JOIN checklist_itens ci ON ci.checklist_id = cl.id
    GROUP BY cl.cartao_id
  ),
  anx AS (
    SELECT a.cartao_id, COUNT(*)::INT AS total
    FROM anexos a
    JOIN cards ON cards.id = a.cartao_id
    GROUP BY a.cartao_id
  ),
  -- Pais que sao epicos, pra herdar cor/titulo nos filhos.
  pais AS (
    SELECT p.id, p.cor_epico, p.titulo
    FROM cartoes p
    WHERE p.eh_epico
      AND p.id IN (
        SELECT DISTINCT cards.cartao_pai_id
        FROM cards
        WHERE cards.cartao_pai_id IS NOT NULL
          AND cards.cartao_pai_id <> cards.id
      )
  )
  SELECT jsonb_build_object(
    'quadro', (SELECT to_jsonb(q) FROM quadros q WHERE q.id = p_quadro_id),

    'colunas', COALESCE((
      SELECT jsonb_agg(to_jsonb(col) ORDER BY col.posicao)
      FROM colunas col
      WHERE col.quadro_id = p_quadro_id
    ), '[]'::jsonb),

    'cartoes', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(cards) || jsonb_build_object(
          'etiqueta_ids', COALESCE(to_jsonb(etiq.ids), '[]'::jsonb),
          'membro_ids', COALESCE(to_jsonb(memb.ids), '[]'::jsonb),
          'total_checklist_itens', COALESCE(chk.total, 0),
          'total_checklist_concluidos', COALESCE(chk.concluidos, 0),
          'total_anexos', COALESCE(anx.total, 0),
          -- Epico proprio tem precedencia; senao herda do pai (que so
          -- entra em `pais` se for epico). Mesma regra do fetchCartoes.
          'epico_cor', CASE
            WHEN cards.eh_epico AND cards.cor_epico IS NOT NULL THEN cards.cor_epico
            ELSE pais.cor_epico
          END,
          'epico_titulo', CASE
            WHEN cards.eh_epico AND cards.cor_epico IS NOT NULL THEN cards.titulo
            ELSE pais.titulo
          END
        )
        ORDER BY cards.posicao
      )
      FROM cards
      LEFT JOIN etiq ON etiq.cartao_id = cards.id
      LEFT JOIN memb ON memb.cartao_id = cards.id
      LEFT JOIN chk  ON chk.cartao_id  = cards.id
      LEFT JOIN anx  ON anx.cartao_id  = cards.id
      LEFT JOIN pais ON pais.id = cards.cartao_pai_id
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_board_data(UUID) IS
  'Board completo (quadro + colunas + cartoes enriquecidos) em 1 chamada. Respeita RLS.';

COMMIT;
