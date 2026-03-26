const rateMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key);
  }
}, 60_000);

/**
 * Simple in-memory rate limiter per key.
 * Returns { ok: true } if allowed, { ok: false, retryAfter } if blocked.
 */
export function rateLimit(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true };
}
