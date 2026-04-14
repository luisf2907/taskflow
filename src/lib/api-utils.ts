import { NextRequest, NextResponse } from "next/server";
import { type ZodSchema, ZodError } from "zod";
import { rateLimit, rateLimitAsync } from "./rate-limit";

/**
 * Extract a stable key for rate limiting from the request.
 * Uses user ID when available (set via header), otherwise falls back to IP.
 */
function getRateLimitKey(request: NextRequest, prefix: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Validate request JSON body against a Zod schema.
 * Returns parsed data or a 400 NextResponse.
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  try {
    const data = schema.parse(raw);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => `${String(e.path.join("."))}: ${e.message}`);
      return {
        error: NextResponse.json(
          { error: "Validation error", details: messages },
          { status: 400 }
        ),
      };
    }
    return { error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
}

/**
 * Apply rate limiting to a request (by IP). Returns null if OK, or a 429 response.
 */
export function applyRateLimit(
  request: NextRequest,
  prefix: string,
  opts?: { maxRequests?: number; windowMs?: number }
): NextResponse | null {
  const key = getRateLimitKey(request, prefix);
  const result = rateLimit(key, opts);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter || 60) },
      }
    );
  }
  return null;
}

/**
 * Async rate limiting using Upstash Redis (production) with in-memory fallback.
 * Prefer this over applyRateLimit for all new API routes.
 */
export async function applyRateLimitAsync(
  request: NextRequest,
  prefix: string,
  opts?: { maxRequests?: number; windowMs?: number }
): Promise<NextResponse | null> {
  const key = getRateLimitKey(request, prefix);
  const result = await rateLimitAsync(key, opts);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter || 60) },
      }
    );
  }
  return null;
}

/**
 * Async rate limiting by API key ID using Upstash Redis.
 */
export async function applyApiKeyRateLimitAsync(
  keyId: string,
  prefix: string,
  opts?: { maxRequests?: number; windowMs?: number }
): Promise<NextResponse | null> {
  const key = `${prefix}:apikey:${keyId}`;
  const result = await rateLimitAsync(key, {
    maxRequests: opts?.maxRequests ?? 120,
    windowMs: opts?.windowMs ?? 60_000,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests for this API key. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter || 60) },
      }
    );
  }
  return null;
}

/**
 * Apply rate limiting by API key ID (for authenticated endpoints).
 * More generous limits than IP-based since the caller is authenticated.
 */
export function applyApiKeyRateLimit(
  keyId: string,
  prefix: string,
  opts?: { maxRequests?: number; windowMs?: number }
): NextResponse | null {
  const key = `${prefix}:apikey:${keyId}`;
  const result = rateLimit(key, {
    maxRequests: opts?.maxRequests ?? 120,
    windowMs: opts?.windowMs ?? 60_000,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests for this API key. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter || 60) },
      }
    );
  }
  return null;
}

/**
 * Sanitize a string for safe storage — trim and limit length.
 */
export function sanitize(str: string | undefined | null, maxLen = 1000): string {
  if (!str) return "";
  return str.trim().slice(0, maxLen);
}

/**
 * Remove markdown, emojis and decorative formatting from AI-generated text.
 * Keeps plain text with simple line breaks only.
 */
export function stripFormatting(text: string): string {
  if (!text) return "";
  return text
    // Headers: ## Title → Title
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/italic: **text** or __text__ → text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Strikethrough: ~~text~~ → text
    .replace(/~~(.+?)~~/g, "$1")
    // Inline code: `text` → text
    .replace(/`([^`]+)`/g, "$1")
    // Code blocks: ```...``` → content
    .replace(/```[\s\S]*?```/g, "")
    // Links: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Bullet markers at start of line: - item or * item → item
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Numbered list markers: 1. item → item
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Blockquotes: > text → text
    .replace(/^>\s+/gm, "")
    // Horizontal rules
    .replace(/^---+$/gm, "")
    // Emojis (Unicode emoji ranges)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]/gu, "")
    // Clean up extra blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
