import { describe, it, expect } from "vitest";

/**
 * Valida as regras de whitelist de bucket e sanitizacao de path usadas
 * pelos endpoints /api/storage/upload e /api/storage/object/*.
 *
 * Se estas regras mudarem nos handlers, atualizar este teste.
 */

const ALLOWED_BUCKETS = new Set(["anexos", "wiki", "reunioes-audio"]);

function isBucketAllowed(bucket: string): boolean {
  return ALLOWED_BUCKETS.has(bucket);
}

function isPathSafe(filePath: string): boolean {
  if (filePath.length === 0 || filePath.length > 512) return false;
  if (filePath.includes("\0") || filePath.includes("..")) return false;
  if (filePath.startsWith("/") || filePath.startsWith("\\")) return false;
  return true;
}

describe("storage bucket whitelist", () => {
  it("aceita buckets conhecidos", () => {
    expect(isBucketAllowed("anexos")).toBe(true);
    expect(isBucketAllowed("wiki")).toBe(true);
    expect(isBucketAllowed("reunioes-audio")).toBe(true);
  });

  it("rejeita bucket desconhecido", () => {
    expect(isBucketAllowed("secrets")).toBe(false);
    expect(isBucketAllowed("")).toBe(false);
    expect(isBucketAllowed("ANEXOS")).toBe(false);
  });

  it("rejeita bucket com path traversal", () => {
    expect(isBucketAllowed("../anexos")).toBe(false);
    expect(isBucketAllowed("anexos/../wiki")).toBe(false);
  });
});

describe("storage path validation", () => {
  it("aceita paths normais", () => {
    expect(isPathSafe("workspace-1/page/img.png")).toBe(true);
    expect(isPathSafe("uuid/file.pdf")).toBe(true);
  });

  it("rejeita path vazio", () => {
    expect(isPathSafe("")).toBe(false);
  });

  it("rejeita path acima de 512 chars", () => {
    expect(isPathSafe("a".repeat(513))).toBe(false);
    expect(isPathSafe("a".repeat(512))).toBe(true);
  });

  it("rejeita traversal com ..", () => {
    expect(isPathSafe("../etc/passwd")).toBe(false);
    expect(isPathSafe("foo/../bar")).toBe(false);
    expect(isPathSafe("foo/..")).toBe(false);
  });

  it("rejeita null bytes", () => {
    expect(isPathSafe("foo\0.png")).toBe(false);
  });

  it("rejeita path absoluto", () => {
    expect(isPathSafe("/etc/passwd")).toBe(false);
    expect(isPathSafe("\\windows\\system32")).toBe(false);
  });
});
