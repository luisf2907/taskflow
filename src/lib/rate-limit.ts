import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter backed by Upstash Redis for serverless compatibility.
 * Falls back to in-memory if UPSTASH_REDIS_REST_URL is not configured.
 *
 * Why Upstash over in-memory?
 * In serverless (Vercel), each invocation can run on a different instance —
 * an in-memory Map is NOT shared between them, making rate limiting ineffective.
 * Upstash Redis is shared, HTTP-based (~1-5ms latency), and works on Edge.
 */

// =============================================
// In-memory fallback (dev / missing config)
// =============================================

const memoryMap = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_ENTRIES = 10_000;
let lastCleanup = 0;

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return;
  lastCleanup = now;

  for (const [k, v] of memoryMap) {
    if (now > v.resetAt) memoryMap.delete(k);
  }

  if (memoryMap.size > MAX_MEMORY_ENTRIES) {
    const entries = [...memoryMap.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toDelete = entries.slice(0, entries.length - MAX_MEMORY_ENTRIES);
    for (const [k] of toDelete) memoryMap.delete(k);
  }
}

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  cleanupExpired();

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

// =============================================
// Upstash Redis rate limiter (production)
// =============================================

let redis: Redis | null = null;
const rateLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

function getUpstashLimiter(prefix: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${prefix}:${maxRequests}:${windowMs}`;
  let limiter = rateLimiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.ceil(windowMs / 1000);
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      prefix: `rl:${prefix}`,
    });
    rateLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

// =============================================
// Public API
// =============================================

/**
 * Async rate limit — uses Upstash Redis in production, in-memory as fallback.
 */
export async function rateLimitAsync(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): Promise<{ ok: boolean; retryAfter?: number }> {
  const limiter = getUpstashLimiter("async", maxRequests, windowMs);

  if (!limiter) {
    return memoryRateLimit(key, maxRequests, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return { ok: false, retryAfter: Math.max(retryAfter, 1) };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[rate-limit] Upstash failed, using in-memory:", err instanceof Error ? err.message : err);
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}

/**
 * Synchronous in-memory rate limiter.
 * Used by applyRateLimit in api-utils.ts for non-async contexts.
 * In production with Upstash configured, prefer rateLimitAsync.
 */
export function rateLimit(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { ok: boolean; retryAfter?: number } {
  return memoryRateLimit(key, maxRequests, windowMs);
}
