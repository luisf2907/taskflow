import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock do client Supabase — precisa vir antes do import do proxy.
//
// Duas chamadas sao contadas, e por motivos diferentes:
//   getClaims -> caminho normal. Valida o JWT localmente, sem rede.
//   getUser   -> round-trip ao GoTrue. So deve rodar quando nao ha JWKS.
//
// O ponto do item 4 do diagnostico e que rotas publicas nao disparam
// NENHUMA das duas.
const getClaims = vi.fn();
const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims, getUser } }),
}));

// O cache de JWKS faz fetch de verdade — mockado pra nao sair da maquina.
const jwksSupabase = vi.fn();
vi.mock("@/lib/supabase/jwks", () => ({ jwksSupabase }));

const { proxy } = await import("@/proxy");

function req(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(pathname, "https://taskflow.test"), { headers });
}

interface Claims {
  sub: string;
  app_metadata?: Record<string, unknown>;
}

/**
 * Deixa os dois caminhos coerentes entre si de proposito: os testes de
 * comportamento passam tanto com validacao local quanto com o fallback,
 * o que e justamente a propriedade que queremos garantir.
 */
function comSessao(claims: Claims | null) {
  getClaims.mockResolvedValue({
    data: claims ? { claims } : null,
    error: null,
  });
  getUser.mockResolvedValue({
    data: {
      user: claims
        ? { id: claims.sub, app_metadata: claims.app_metadata ?? {} }
        : null,
    },
  });
}

const JWKS = { keys: [{ kid: "k1", alg: "ES256" }] };
const USER: Claims = { sub: "u1", app_metadata: {} };

beforeEach(() => {
  getClaims.mockReset();
  getUser.mockReset();
  jwksSupabase.mockReset();
  jwksSupabase.mockResolvedValue(JWKS);
  comSessao(null);
});

afterEach(() => {
  delete process.env.AUTH_MODE;
});

describe("proxy — rotas sem sessao (nao devem consultar o servidor de auth)", () => {
  const publicas = [
    "/",
    "/pricing",
    "/termos",
    "/privacidade",
    "/reset-password",
    "/trocar-senha",
    "/help",
    "/help/bem-vindo",
    "/convite/abc123",
    "/api/health",
    "/api/auth/solo-login",
    "/api/v1/cards",
    "/api/api-keys",
    "/auth/callback",
    "/api/reunioes/xyz/webhook",
  ];

  for (const p of publicas) {
    it(`${p} passa sem consultar o servidor de auth`, async () => {
      const res = await proxy(req(p));
      expect(getClaims).not.toHaveBeenCalled();
      expect(getUser).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  }

  it("/api/mcp sem Bearer tf_sk_ e barrado no edge, sem consultar auth", async () => {
    const res = await proxy(req("/api/mcp"));
    expect(res.status).toBe(401);
    expect(getClaims).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("/api/mcp com token passa sem consultar auth (handler valida)", async () => {
    const res = await proxy(req("/api/mcp", { authorization: "Bearer tf_sk_abc" }));
    expect(res.status).toBe(200);
    expect(getClaims).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("proxy — validacao local do JWT", () => {
  it("usa getClaims e NAO vai ao GoTrue quando ha JWKS", async () => {
    comSessao(USER);
    await proxy(req("/quadro/abc"));
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("passa o JWKS cacheado pro getClaims, em vez de deixar a lib buscar", async () => {
    comSessao(USER);
    await proxy(req("/quadro/abc"));
    expect(getClaims).toHaveBeenCalledWith(undefined, { jwks: JWKS });
  });

  it("degrada pro getUser quando nao ha JWKS utilizavel", async () => {
    jwksSupabase.mockResolvedValue(null);
    comSessao(USER);
    const res = await proxy(req("/quadro/abc"));
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getClaims).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("sem JWKS e sem sessao continua barrando — nunca deixa passar", async () => {
    jwksSupabase.mockResolvedValue(null);
    comSessao(null);
    const res = await proxy(req("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});

describe("proxy — rotas protegidas", () => {
  it("redireciona pro login quando nao ha sessao", async () => {
    const res = await proxy(req("/dashboard"));
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("deixa passar quando ha sessao", async () => {
    comSessao(USER);
    const res = await proxy(req("/quadro/abc"));
    expect(res.status).toBe(200);
  });

  it("/login com sessao vai pro dashboard", async () => {
    comSessao(USER);
    const res = await proxy(req("/login"));
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("/login sem sessao nao redireciona", async () => {
    const res = await proxy(req("/login"));
    expect(res.status).toBe(200);
  });

  it("/api/realtime/* sem sessao devolve 401, nao redirect", async () => {
    const res = await proxy(req("/api/realtime/board/1"));
    expect(res.status).toBe(401);
  });

  it("/api/realtime/* com sessao passa", async () => {
    comSessao(USER);
    const res = await proxy(req("/api/realtime/board/1"));
    expect(res.status).toBe(200);
  });
});

describe("proxy — must_change_password", () => {
  const trocaPendente: Claims = {
    sub: "u1",
    app_metadata: { must_change_password: true },
  };

  it("redireciona pra /trocar-senha em pagina normal", async () => {
    comSessao(trocaPendente);
    const res = await proxy(req("/dashboard"));
    expect(res.headers.get("location")).toContain("/trocar-senha");
  });

  it("nao redireciona em /api/*", async () => {
    comSessao(trocaPendente);
    const res = await proxy(req("/api/prs"));
    expect(res.status).toBe(200);
  });

  it("/trocar-senha em si continua acessivel", async () => {
    comSessao(trocaPendente);
    const res = await proxy(req("/trocar-senha"));
    expect(res.status).toBe(200);
  });

  it("continua valendo pelo caminho degradado (getUser)", async () => {
    jwksSupabase.mockResolvedValue(null);
    comSessao(trocaPendente);
    const res = await proxy(req("/dashboard"));
    expect(res.headers.get("location")).toContain("/trocar-senha");
  });
});

describe("proxy — AUTH_MODE=solo", () => {
  it("sem sessao, redireciona pro auto-login preservando o destino", async () => {
    process.env.AUTH_MODE = "solo";
    const res = await proxy(req("/dashboard"));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/api/auth/solo-login");
    expect(location).toContain("next=%2Fdashboard");
  });

  it("nao intercepta rota publica", async () => {
    process.env.AUTH_MODE = "solo";
    const res = await proxy(req("/pricing"));
    expect(res.status).toBe(200);
    expect(getClaims).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
});
