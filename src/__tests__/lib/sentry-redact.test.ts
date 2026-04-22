import { describe, it, expect } from "vitest";

/**
 * Testa as regex de redaction usadas em sentry.server.config.ts e
 * sentry.client.config.ts. Se os patterns divergirem, atualizar aqui.
 */

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bre_[A-Za-z0-9_-]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{20,}/gi,
];

function redact(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

describe("secret redaction", () => {
  it("redacta chave OpenAI", () => {
    expect(redact("key=sk-abc123def456ghi789jkl012mno345")).toContain("[REDACTED]");
    expect(redact("key=sk-abc123def456ghi789jkl012mno345")).not.toContain("sk-abc123");
  });

  it("redacta chave Resend", () => {
    expect(redact("re_1234567890abcdefghij1234567890")).toBe("[REDACTED]");
  });

  it("redacta chave Gemini (AIza...)", () => {
    expect(redact("AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567")).toBe("[REDACTED]");
  });

  it("redacta GitHub PAT", () => {
    expect(redact("ghp_abcdefghijklmnopqrstuvwxyz1234")).toBe("[REDACTED]");
    expect(redact("ghs_abcdefghijklmnopqrstuvwxyz1234")).toBe("[REDACTED]");
  });

  it("redacta JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(redact(jwt)).toBe("[REDACTED]");
  });

  it("redacta Bearer token", () => {
    expect(redact("Authorization: Bearer abc123def456ghi789jkl012mno345")).toContain(
      "[REDACTED]",
    );
  });

  it("preserva texto normal", () => {
    expect(redact("user fez login no workspace foo-bar")).toBe(
      "user fez login no workspace foo-bar",
    );
  });

  it("preserva mensagens de erro comuns", () => {
    expect(redact("Cannot read property 'id' of undefined")).toBe(
      "Cannot read property 'id' of undefined",
    );
  });
});
