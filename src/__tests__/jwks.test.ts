import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jwksSupabase, _resetJwksCache } from "@/lib/supabase/jwks";

// ─────────────────────────────────────────────────────────────────────────
// O teste que importa aqui e o primeiro: o cache tem que ser de MODULO.
//
// `getClaims()` cacheia o JWKS na instancia do GoTrueClient, e o proxy cria
// uma instancia por request. Sem cache de modulo, a validacao "local" faria
// um fetch por request — trocaria o round-trip do getUser() por outro. Como
// os testes do proxy contam chamadas e nao round-trips, essa regressao
// passaria despercebida la. Este arquivo e a rede de seguranca dela.
// ─────────────────────────────────────────────────────────────────────────

const URL_BASE = "https://projeto.supabase.co";
const CORPO = { keys: [{ kid: "k1", alg: "ES256", kty: "EC" }] };

function respostaOk(corpo: unknown = CORPO) {
  return { ok: true, json: async () => corpo } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  _resetJwksCache();
  fetchMock = vi.fn().mockResolvedValue(respostaOk());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("jwksSupabase — cache", () => {
  it("busca uma vez so, mesmo em muitas chamadas seguidas", async () => {
    for (let i = 0; i < 20; i++) {
      await jwksSupabase(URL_BASE);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("chamadas concorrentes compartilham o mesmo fetch", async () => {
    const todas = await Promise.all(
      Array.from({ length: 10 }, () => jwksSupabase(URL_BASE)),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const r of todas) expect(r).toEqual(CORPO);
  });

  it("busca no endpoint well-known do projeto", async () => {
    await jwksSupabase(URL_BASE);
    expect(fetchMock).toHaveBeenCalledWith(
      `${URL_BASE}/auth/v1/.well-known/jwks.json`,
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("renova depois do TTL de 10 min", async () => {
    vi.useFakeTimers();
    await jwksSupabase(URL_BASE);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(9 * 60 * 1000);
    await jwksSupabase(URL_BASE);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 1000);
    await jwksSupabase(URL_BASE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("jwksSupabase — falhas", () => {
  it("retorna null quando o endpoint falha e nao ha cache", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await jwksSupabase(URL_BASE)).toBeNull();
  });

  it("retorna null em resposta sem chaves", async () => {
    fetchMock.mockResolvedValue(respostaOk({ keys: [] }));
    expect(await jwksSupabase(URL_BASE)).toBeNull();
  });

  it("retorna null em HTTP de erro", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    expect(await jwksSupabase(URL_BASE)).toBeNull();
  });

  it("nao martela o endpoint enquanto esta em backoff", async () => {
    fetchMock.mockRejectedValue(new Error("fora do ar"));
    for (let i = 0; i < 10; i++) {
      await jwksSupabase(URL_BASE);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mantem o JWKS anterior quando a renovacao falha", async () => {
    vi.useFakeTimers();
    expect(await jwksSupabase(URL_BASE)).toEqual(CORPO);

    fetchMock.mockRejectedValue(new Error("fora do ar"));
    vi.advanceTimersByTime(11 * 60 * 1000);

    // Chave rotacionada e raro; endpoint fora do ar por instantes nao e.
    // Seguir com o JWKS antigo e melhor que degradar todo mundo pro getUser.
    expect(await jwksSupabase(URL_BASE)).toEqual(CORPO);
  });
});
