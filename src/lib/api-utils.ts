import { NextRequest, NextResponse } from "next/server";
import { type ZodSchema, ZodError } from "zod";
import { rateLimit } from "./rate-limit";

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
 * Apply rate limiting to a request. Returns null if OK, or a 429 response.
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
 * Sanitize a string for safe storage — trim and limit length.
 */
export function sanitize(str: string | undefined | null, maxLen = 1000): string {
  if (!str) return "";
  return str.trim().slice(0, maxLen);
}
