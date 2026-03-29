-- =============================================
-- 018: Rate Limits + Índice de limpeza
-- =============================================

-- 1. TABELA DE RATE LIMITS (para serverless)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para limpeza automática
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Sem RLS — só acessível via service role
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_no_access" ON rate_limits FOR ALL USING (false);

-- 2. FUNÇÃO RPC PARA RATE LIMITING ATÔMICO
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
) RETURNS JSON AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Tentar buscar entrada existente
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key;

  -- Se não existe ou janela expirou, resetar
  IF NOT FOUND OR v_now > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = v_now;
    RETURN json_build_object('ok', true);
  END IF;

  -- Se excedeu o limite, bloquear
  IF v_count >= p_max_requests THEN
    RETURN json_build_object(
      'ok', false,
      'retryAfter', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INT
    );
  END IF;

  -- Incrementar contador
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LIMPEZA AUTOMÁTICA (entradas com mais de 1 hora)
-- Rode periodicamente via cron do Supabase ou manualmente:
-- SELECT cleanup_rate_limits();
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
