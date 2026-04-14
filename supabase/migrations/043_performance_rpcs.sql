-- =============================================
-- RPC: get_dashboard_metrics
-- Substitui 3 queries sequenciais por 1 unica query com JOINs
-- =============================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH meus_cartoes AS (
    SELECT DISTINCT c.id, c.titulo, c.atualizado_em, c.coluna_id
    FROM cartoes c
    JOIN cartao_membros cm ON cm.cartao_id = c.id
    JOIN membros m ON m.id = cm.membro_id
    WHERE m.user_id = p_user_id
  ),
  com_coluna AS (
    SELECT
      mc.id,
      mc.titulo,
      mc.atualizado_em,
      col.nome AS coluna_nome,
      col.quadro_id
    FROM meus_cartoes mc
    JOIN colunas col ON col.id = mc.coluna_id
    ORDER BY mc.atualizado_em DESC
    LIMIT 8
  ),
  done_today AS (
    SELECT COUNT(*) AS cnt
    FROM meus_cartoes mc
    JOIN colunas col ON col.id = mc.coluna_id
    WHERE mc.atualizado_em::date = CURRENT_DATE
      AND (LOWER(col.nome) LIKE '%conclu%' OR LOWER(col.nome) LIKE '%done%')
  )
  SELECT json_build_object(
    'recentTasks', COALESCE((SELECT json_agg(json_build_object(
      'id', cc.id,
      'titulo', cc.titulo,
      'coluna_nome', cc.coluna_nome,
      'quadro_id', cc.quadro_id,
      'atualizado_em', cc.atualizado_em
    )) FROM com_coluna cc), '[]'::json),
    'tasksDoneToday', (SELECT cnt FROM done_today)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================
-- RPC: reorder_cards
-- Batch update de posicoes em uma unica transacao
-- Evita N updates individuais no drag-and-drop
-- =============================================
CREATE OR REPLACE FUNCTION reorder_cards(p_updates JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE cartoes
    SET coluna_id = (v_item->>'coluna_id')::UUID,
        posicao = (v_item->>'posicao')::INT,
        atualizado_em = NOW()
    WHERE id = (v_item->>'id')::UUID;
  END LOOP;
END;
$$;

-- =============================================
-- RPC: move_card_complete
-- Unifica mover card + set data_conclusao + retorna info
-- Reduz de ~7 queries para 1 chamada
-- =============================================
CREATE OR REPLACE FUNCTION move_card_complete(
  p_cartao_id UUID,
  p_nova_coluna_id UUID,
  p_nova_posicao INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quadro_id UUID;
  v_old_coluna_id UUID;
  v_ultima_coluna_id UUID;
  v_is_done BOOLEAN;
  v_card_titulo TEXT;
  v_workspace_id UUID;
  v_member_ids UUID[];
BEGIN
  -- Buscar info do card atual
  SELECT c.coluna_id, c.titulo, c.workspace_id
  INTO v_old_coluna_id, v_card_titulo, v_workspace_id
  FROM cartoes c
  WHERE c.id = p_cartao_id;

  IF v_old_coluna_id IS NULL THEN
    RETURN json_build_object('error', 'Card nao encontrado');
  END IF;

  -- Buscar quadro_id e ultima coluna
  SELECT col.quadro_id INTO v_quadro_id
  FROM colunas col WHERE col.id = p_nova_coluna_id;

  SELECT col.id INTO v_ultima_coluna_id
  FROM colunas col
  WHERE col.quadro_id = v_quadro_id
  ORDER BY col.posicao DESC
  LIMIT 1;

  v_is_done := (p_nova_coluna_id = v_ultima_coluna_id);

  -- Mover o card
  UPDATE cartoes
  SET coluna_id = p_nova_coluna_id,
      posicao = p_nova_posicao,
      data_conclusao = CASE WHEN v_is_done THEN NOW() ELSE NULL END,
      atualizado_em = NOW()
  WHERE id = p_cartao_id;

  -- Buscar membros do card (para notificacoes)
  SELECT ARRAY_AGG(cm.membro_id)
  INTO v_member_ids
  FROM cartao_membros cm
  WHERE cm.cartao_id = p_cartao_id;

  RETURN json_build_object(
    'ok', true,
    'old_coluna_id', v_old_coluna_id,
    'quadro_id', v_quadro_id,
    'workspace_id', v_workspace_id,
    'is_done', v_is_done,
    'titulo', v_card_titulo,
    'member_ids', COALESCE(v_member_ids, ARRAY[]::UUID[]),
    'ultima_coluna_id', v_ultima_coluna_id
  );
END;
$$;

-- =============================================
-- RPC: get_sprint_summary
-- Agregacao com GROUP BY ao inves de filtrar em JS
-- =============================================
CREATE OR REPLACE FUNCTION get_sprint_summary(p_sprint_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_ultima_coluna_id UUID;
BEGIN
  -- Buscar ultima coluna (Done)
  SELECT col.id INTO v_ultima_coluna_id
  FROM colunas col
  WHERE col.quadro_id = p_sprint_id
  ORDER BY col.posicao DESC
  LIMIT 1;

  SELECT json_build_object(
    'colunas', COALESCE((
      SELECT json_agg(json_build_object(
        'id', sub.id,
        'nome', sub.nome,
        'posicao', sub.posicao,
        'cards', sub.card_count,
        'pontos', sub.pontos
      ) ORDER BY sub.posicao)
      FROM (
        SELECT
          col.id,
          col.nome,
          col.posicao,
          COUNT(c.id)::INT AS card_count,
          COALESCE(SUM(c.peso), 0)::INT AS pontos
        FROM colunas col
        LEFT JOIN cartoes c ON c.coluna_id = col.id
        WHERE col.quadro_id = p_sprint_id
        GROUP BY col.id, col.nome, col.posicao
      ) sub
    ), '[]'::json),
    'total_cards', (
      SELECT COUNT(*)::INT FROM cartoes c
      JOIN colunas col ON col.id = c.coluna_id
      WHERE col.quadro_id = p_sprint_id
    ),
    'total_pontos', (
      SELECT COALESCE(SUM(c.peso), 0)::INT FROM cartoes c
      JOIN colunas col ON col.id = c.coluna_id
      WHERE col.quadro_id = p_sprint_id
    ),
    'concluidos', (
      SELECT COUNT(*)::INT FROM cartoes c
      WHERE c.coluna_id = v_ultima_coluna_id
    ),
    'pontos_concluidos', (
      SELECT COALESCE(SUM(c.peso), 0)::INT FROM cartoes c
      WHERE c.coluna_id = v_ultima_coluna_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
