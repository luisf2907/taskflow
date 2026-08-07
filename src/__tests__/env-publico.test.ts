import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// Validação das env públicas, sem zod
// ═══════════════════════════════════════════════════════════════════════
// Trocamos o zod por validação à mão para tirar 90,8 KiB do bundle do
// navegador. O que saiu era uma biblioteca testada; o que entrou é código
// nosso, e ele decide se a aplicação sobe ou morre no boot. Daí estes
// testes cobrirem os mesmos casos que o schema cobria.
//
// `getPublicEnv` memoiza, então cada caso precisa de um módulo novo —
// resetModules + import dinâmico.
// ═══════════════════════════════════════════════════════════════════════

const CHAVES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_REALTIME_DRIVER",
  "NEXT_PUBLIC_VCS_TOKEN_MODE",
  "NEXT_PUBLIC_OBS_DRIVER",
] as const;

let original: Record<string, string | undefined>;

beforeEach(() => {
  original = Object.fromEntries(CHAVES.map((k) => [k, process.env[k]]));
  for (const k of CHAVES) delete process.env[k];
  vi.resetModules();
});

afterEach(() => {
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function carregar() {
  const mod = await import("@/lib/env-publico");
  return mod.getPublicEnv();
}

function comMinimo() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
}

describe("env pública — o que é obrigatório", () => {
  it("aceita o mínimo", async () => {
    comMinimo();
    const env = await carregar();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("chave");
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it("reclama da URL ausente, nomeando o campo", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    await expect(carregar()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("reclama da chave ausente", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    await expect(carregar()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("rejeita URL malformada", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "nao-e-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    await expect(carregar()).rejects.toThrow(/não é uma URL válida/);
  });

  it("junta todos os problemas numa mensagem só", async () => {
    // Um erro por deploy seria tortura; o schema antigo também acumulava.
    process.env.NEXT_PUBLIC_REALTIME_DRIVER = "invalido";
    await expect(carregar()).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY[\s\S]*NEXT_PUBLIC_REALTIME_DRIVER/,
    );
  });

  it("mantém o prefixo da mensagem antiga", async () => {
    await expect(carregar()).rejects.toThrow(
      /^Missing or invalid environment variables:/,
    );
  });
});

describe("env pública — string vazia é ausência", () => {
  // No docker-compose, `${VAR:-}` injeta "" quando a var não está no
  // .env.local. Tratar isso como valor faria a validação passar com lixo.
  it("trata opcional vazia como não setada", async () => {
    comMinimo();
    process.env.NEXT_PUBLIC_SITE_URL = "";
    process.env.NEXT_PUBLIC_OBS_DRIVER = "";
    const env = await carregar();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_OBS_DRIVER).toBeUndefined();
  });

  it("obrigatória vazia continua sendo erro", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    await expect(carregar()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe("env pública — enums", () => {
  it("aceita cada valor previsto", async () => {
    comMinimo();
    process.env.NEXT_PUBLIC_REALTIME_DRIVER = "polling";
    process.env.NEXT_PUBLIC_VCS_TOKEN_MODE = "instance-pat";
    process.env.NEXT_PUBLIC_OBS_DRIVER = "glitchtip";
    const env = await carregar();
    expect(env.NEXT_PUBLIC_REALTIME_DRIVER).toBe("polling");
    expect(env.NEXT_PUBLIC_VCS_TOKEN_MODE).toBe("instance-pat");
    expect(env.NEXT_PUBLIC_OBS_DRIVER).toBe("glitchtip");
  });

  it("recusa valor fora da lista e diz quais valem", async () => {
    comMinimo();
    process.env.NEXT_PUBLIC_REALTIME_DRIVER = "websocket";
    await expect(carregar()).rejects.toThrow(
      /supabase \| pg-notify-sse \| polling/,
    );
  });
});

describe("env pública — memoização", () => {
  it("valida uma vez só", async () => {
    comMinimo();
    const mod = await import("@/lib/env-publico");
    const a = mod.getPublicEnv();
    // Mudar o ambiente depois não deve reabrir a validação: o valor foi
    // resolvido no boot e o resto do app já depende dele.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://outro.supabase.co";
    expect(mod.getPublicEnv()).toBe(a);
    expect(mod.getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://x.supabase.co",
    );
  });

  it("o proxy publicEnv lê os mesmos valores", async () => {
    comMinimo();
    const mod = await import("@/lib/env-publico");
    expect(mod.publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("chave");
  });
});
