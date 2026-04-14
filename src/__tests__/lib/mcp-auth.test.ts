import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do service client — precisa ser declarado antes do import do módulo.
const mockSingle = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

const { authenticateApiKey, generateApiKey, hashApiKey } = await import("@/lib/mcp-auth");

function makeRequest(authHeader?: string): Request {
  return new Request("https://example.com/api/mcp", {
    method: "POST",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("generateApiKey", () => {
  it("gera chaves com prefixo tf_sk_ e comprimento fixo", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^tf_sk_[0-9a-f]{48}$/);
  });

  it("gera chaves únicas em chamadas sucessivas", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).not.toBe(b);
  });
});

describe("hashApiKey", () => {
  it("é determinístico pra mesma entrada", () => {
    expect(hashApiKey("tf_sk_abc")).toBe(hashApiKey("tf_sk_abc"));
  });

  it("produz hashes diferentes pra chaves diferentes", () => {
    expect(hashApiKey("tf_sk_a")).not.toBe(hashApiKey("tf_sk_b"));
  });

  it("retorna 64 chars (SHA-256 em hex)", () => {
    expect(hashApiKey("qualquer")).toHaveLength(64);
  });
});

describe("authenticateApiKey", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockFrom.mockClear();
  });

  it("rejeita sem header Authorization (401)", async () => {
    const result = await authenticateApiKey(makeRequest());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("rejeita header que não começa com Bearer (401)", async () => {
    const result = await authenticateApiKey(makeRequest("Token tf_sk_xxx"));
    expect((result as Response).status).toBe(401);
  });

  it("rejeita chave sem prefixo tf_sk_ (401)", async () => {
    const result = await authenticateApiKey(makeRequest("Bearer sk-wrong"));
    expect((result as Response).status).toBe(401);
  });

  it("rejeita chave não encontrada no banco (401)", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    const result = await authenticateApiKey(makeRequest("Bearer tf_sk_abc"));
    expect((result as Response).status).toBe(401);
  });

  it("rejeita chave expirada (401)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "k1",
        user_id: "u1",
        workspace_id: "w1",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
      error: null,
    });
    const result = await authenticateApiKey(makeRequest("Bearer tf_sk_expired"));
    expect((result as Response).status).toBe(401);
  });

  it("retorna contexto quando a chave é válida", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "k1", user_id: "u1", workspace_id: "w1", expires_at: null },
      error: null,
    });
    const result = await authenticateApiKey(makeRequest("Bearer tf_sk_valid"));
    expect(result).toEqual({ userId: "u1", workspaceId: "w1", keyId: "k1" });
  });

  it("aceita chave sem expiração (expires_at null)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "k2", user_id: "u2", workspace_id: "w2", expires_at: null },
      error: null,
    });
    const result = await authenticateApiKey(makeRequest("Bearer tf_sk_forever"));
    expect(result).toEqual({ userId: "u2", workspaceId: "w2", keyId: "k2" });
  });
});
