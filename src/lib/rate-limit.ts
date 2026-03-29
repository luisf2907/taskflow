import { createServiceClient } from "@/lib/supabase/server";

/**
 * Rate limiter backed by Supabase for serverless compatibility.
 * Falls back to in-memory for development or if Supabase call fails.
 */

const memoryMap = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = memoryMap.get(key);

  if (!entry || now > entry.resetAt) {
    memoryMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true };
}

/**
 * Rate limit check using Supabase RPC with in-memory fallback.
 * For the Supabase approach, create this function in your database:
 *
 * CREATE OR REPLACE FUNCTION check_rate_limit(
 *   p_key TEXT,
 *   p_max_requests INT,
 *   p_window_seconds INT
 * ) RETURNS JSON AS $$
 * DECLARE
 *   v_count INT;
 *   v_window_start TIMESTAMPTZ;
 *   v_now TIMESTAMPTZ := NOW();
 * BEGIN
 *   SELECT count, window_start INTO v_count, v_window_start
 *   FROM rate_limits WHERE key = p_key;
 *
 *   IF NOT FOUND OR v_now > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
 *     INSERT INTO rate_limits (key, count, window_start)
 *     VALUES (p_key, 1, v_now)
 *     ON CONFLICT (key) DO UPDATE SET count = 1, window_start = v_now;
 *     RETURN json_build_object('ok', true);
 *   END IF;
 *
 *   IF v_count >= p_max_requests THEN
 *     RETURN json_build_object(
 *       'ok', false,
 *       'retryAfter', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INT
 *     );
 *   END IF;
 *
 *   UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
 *   RETURN json_build_object('ok', true);
 * END;
 * $$ LANGUAGE plpgsql;
 *
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   key TEXT PRIMARY KEY,
 *   count INT NOT NULL DEFAULT 0,
 *   window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 */
export async function rateLimitAsync(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): Promise<{ ok: boolean; retryAfter?: number }> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });

    if (error || !data) {
      // Fallback to in-memory if RPC not available
      return memoryRateLimit(key, maxRequests, windowMs);
    }

    return data as { ok: boolean; retryAfter?: number };
  } catch {
    // Fallback to in-memory
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}

/**
 * Synchronous in-memory rate limiter (kept for backward compatibility).
 * Prefer rateLimitAsync for production serverless deployments.
 */
export function rateLimit(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { ok: boolean; retryAfter?: number } {
  return memoryRateLimit(key, maxRequests, windowMs);
}
