import { describe, it, expect, vi } from "vitest";

// Mock supabase/server to avoid env validation
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

const { rateLimit } = await import("@/lib/rate-limit");

describe("rateLimit (in-memory fallback)", () => {
  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { maxRequests: 5, windowMs: 60000 })).toEqual({ ok: true });
    }
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { maxRequests: 3, windowMs: 60000 });
    }
    const result = rateLimit(key, { maxRequests: 3, windowMs: 60000 });
    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const key = `test-reset-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      rateLimit(key, { maxRequests: 2, windowMs: 1 });
    }
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait 5ms for window to expire
    }
    const result = rateLimit(key, { maxRequests: 2, windowMs: 1 });
    expect(result.ok).toBe(true);
  });
});
