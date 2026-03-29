import { describe, it, expect, vi } from "vitest";

// Mock supabase/server to avoid env validation
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

const { sanitize } = await import("@/lib/api-utils");

describe("sanitize", () => {
  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("limits length", () => {
    const long = "a".repeat(2000);
    expect(sanitize(long, 100)).toHaveLength(100);
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitize(null)).toBe("");
    expect(sanitize(undefined)).toBe("");
  });

  it("uses default maxLen of 1000", () => {
    const long = "b".repeat(1500);
    expect(sanitize(long)).toHaveLength(1000);
  });
});
