import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock do client Supabase — precisa vir antes do import do proxy.
// getUser conta chamadas: o ponto do item 4 do diagnostico e que rotas
// publicas nao devem disparar esse round-trip.
const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const { proxy } = await import("@/proxy");

function req(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(pathname, "https://taskflow.test"), { headers });
}

function comUsuario(user: unknown) {
  getUser.mockResolvedValue({ data: { user } });
}

const USER = { id: "u1", app_metadata: {} };

beforeEach(() => {
  getUser.mockReset();
  comUsuario(null);
});

afterEach(() => {
  delete process.env.AUTH_MODE;
});

describe("proxy — rotas sem sessao (nao devem chamar getUser)", () => {
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
      expect(getUser).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  }

  it("/api/mcp sem Bearer tf_sk_ e barrado no edge, sem getUser", async () => {
    const res = await proxy(req("/api/mcp"));
    expect(res.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("/api/mcp com token passa sem getUser (handler valida)", async () => {
    const res = await proxy(req("/api/mcp", { authorization: "Bearer tf_sk_abc" }));
    expect(res.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("proxy — rotas protegidas", () => {
  it("redireciona pro login quando nao ha sessao", async () => {
    const res = await proxy(req("/dashboard"));
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("deixa passar quando ha sessao", async () => {
    comUsuario(USER);
    const res = await proxy(req("/quadro/abc"));
    expect(res.status).toBe(200);
  });

  it("/login com sessao vai pro dashboard", async () => {
    comUsuario(USER);
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
    comUsuario(USER);
    const res = await proxy(req("/api/realtime/board/1"));
    expect(res.status).toBe(200);
  });
});

describe("proxy — must_change_password", () => {
  it("redireciona pra /trocar-senha em pagina normal", async () => {
    comUsuario({ id: "u1", app_metadata: { must_change_password: true } });
    const res = await proxy(req("/dashboard"));
    expect(res.headers.get("location")).toContain("/trocar-senha");
  });

  it("nao redireciona em /api/*", async () => {
    comUsuario({ id: "u1", app_metadata: { must_change_password: true } });
    const res = await proxy(req("/api/prs"));
    expect(res.status).toBe(200);
  });

  it("/trocar-senha em si continua acessivel", async () => {
    comUsuario({ id: "u1", app_metadata: { must_change_password: true } });
    const res = await proxy(req("/trocar-senha"));
    expect(res.status).toBe(200);
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
    expect(getUser).not.toHaveBeenCalled();
  });
});
