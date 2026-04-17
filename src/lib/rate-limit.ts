import { Ratelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

/**
 * Rate limiter with 3 backends (priority order):
 *
 * 1. REDIS_URL (TCP nativo) — pra self-hosted com container Redis local.
 *    Usa ioredis + sliding window via INCR/EXPIRE.
 *
 * 2. UPSTASH_REDIS_REST_URL + TOKEN (HTTP REST) — pra Vercel/serverless.
 *    Usa @upstash/ratelimit com sliding window.
 *
 * 3. In-memory Map — fallback quando nenhum Redis configurado. Suficiente
 *    pra dev local e self-hosted com 1 container app.
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
// Redis nativo via ioredis (self-hosted)
// =============================================

let ioRedisClient: IORedis | null = null;
let ioRedisAvailable = true; // flipped to false on connection error

function getIORedis(): IORedis | null {
  if (!ioRedisAvailable) return null;
  if (ioRedisClient) return ioRedisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    ioRedisClient = new IORedis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });
    ioRedisClient.on("error", (err) => {
      console.warn("[rate-limit] Redis connection error:", err.message);
      ioRedisAvailable = false;
    });
    ioRedisClient.connect().catch(() => {
      ioRedisAvailable = false;
    });
    return ioRedisClient;
  } catch {
    ioRedisAvailable = false;
    return null;
  }
}

async function ioRedisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfter?: number }> {
  const client = getIORedis();
  if (!client) return memoryRateLimit(key, maxRequests, windowMs);

  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `rl:${key}`;

  const results = await client
    .multi()
    .incr(redisKey)
    .ttl(redisKey)
    .exec();

  if (!results) return memoryRateLimit(key, maxRequests, windowMs);

  const count = results[0][1] as number;
  const ttl = results[1][1] as number;

  // Se key acabou de ser criada (count=1) ou expirou (ttl=-1), seta TTL
  if (count === 1 || ttl === -1) {
    await client.expire(redisKey, windowSec);
  }

  if (count > maxRequests) {
    const retryAfter = ttl > 0 ? ttl : windowSec;
    return { ok: false, retryAfter };
  }

  return { ok: true };
}

// =============================================
// Upstash Redis rate limiter (serverless/cloud)
// =============================================

let upstashRedis: UpstashRedis | null = null;
const rateLimiters = new Map<string, Ratelimit>();

function getUpstashRedis(): UpstashRedis | null {
  if (upstashRedis) return upstashRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  upstashRedis = new UpstashRedis({ url, token });
  return upstashRedis;
}

function getUpstashLimiter(prefix: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const r = getUpstashRedis();
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
 * Async rate limit.
 * Priority: REDIS_URL (ioredis) > Upstash (HTTP) > in-memory.
 */
export async function rateLimitAsync(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): Promise<{ ok: boolean; retryAfter?: number }> {
  // 1. Redis nativo (self-hosted)
  if (process.env.REDIS_URL && ioRedisAvailable) {
    try {
      return await ioRedisRateLimit(key, maxRequests, windowMs);
    } catch (err) {
      console.warn("[rate-limit] ioredis failed, trying fallback:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Upstash (cloud/serverless)
  const limiter = getUpstashLimiter("async", maxRequests, windowMs);
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return { ok: false, retryAfter: Math.max(retryAfter, 1) };
      }
      return { ok: true };
    } catch (err) {
      console.warn("[rate-limit] Upstash failed, using in-memory:", err instanceof Error ? err.message : err);
    }
  }

  // 3. In-memory fallback
  return memoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Synchronous in-memory rate limiter.
 * Used by applyRateLimit in api-utils.ts for non-async contexts.
 */
export function rateLimit(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { ok: boolean; retryAfter?: number } {
  return memoryRateLimit(key, maxRequests, windowMs);
}
