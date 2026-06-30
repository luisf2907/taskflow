-- =============================================
-- 054: Cards sem dependência (pra bandeja da view de Deps)
-- Retorna as tarefas do workspace que NÃO participam de nenhuma
-- dependência (nem origem nem destino) e não são épicos. Usado pra
-- mostrar "trabalho independente" separado do grafo.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION cards_sem_dependencia_workspace(ws_id UUID)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  data_conclusao TIMESTAMPTZ,
  coluna_nome TEXT,
  quadro_id UUID,
  quadro_nome TEXT,
  epico_id UUID,
  epico_cor TEXT,
  epico_titulo TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.titulo,
    c.data_conclusao,
    col.nome                                     AS coluna_nome,
    col.quadro_id                                AS quadro_id,
    q.nome                                       AS quadro_nome,
    CASE WHEN c.eh_epico THEN c.id
         WHEN pai.id IS NOT NULL THEN pai.id
         ELSE NULL END                           AS epico_id,
    CASE WHEN c.eh_epico THEN c.cor_epico
         WHEN pai.id IS NOT NULL THEN pai.cor_epico
         ELSE NULL END                           AS epico_cor,
    CASE WHEN c.eh_epico THEN c.titulo
         WHEN pai.id IS NOT NULL THEN pai.titulo
         ELSE NULL END                           AS epico_titulo
  FROM cartoes c
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id
  LEFT JOIN cartoes pai ON pai.id = c.cartao_pai_id AND pai.eh_epico = true
  WHERE c.workspace_id = ws_id
    AND c.eh_epico = false
    AND c.id NOT IN (
      SELECT cartao_id FROM cartao_dependencias
      UNION
      SELECT depende_de_cartao_id FROM cartao_dependencias
    )
  ORDER BY c.criado_em DESC;
$$;

GRANT EXECUTE ON FUNCTION cards_sem_dependencia_workspace(UUID) TO authenticated;

COMMIT;
