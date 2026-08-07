// ═══════════════════════════════════════════════════════════════════════════
// Env publicas — validadas SEM zod, de proposito
// ═══════════════════════════════════════════════════════════════════════════
// Este arquivo existe para tirar o Zod do bundle do navegador.
//
// O caminho era: 29 componentes de cliente importam `@/lib/supabase/client`,
// que importava `@/lib/env`, que importa zod. Como o `serverEnvSchema` mora
// no mesmo modulo, nao havia tree-shaking possivel — a biblioteca inteira
// descia junto. Medido com `next experimental-analyze`: 90,8 KiB
// comprimidos, 16,7% de todo o JS do cliente, o segundo maior item depois
// do proprio Next. Tudo isso para conferir seis variaveis no boot.
//
// De quebra some um aviso de CSP: o Zod 4 testa `Function("")` dentro de um
// try/catch para decidir se pode compilar schemas, e a nossa politica bloqueia
// eval. Nada quebrava (o catch tem fallback), mas o navegador registrava a
// tentativa a cada carregamento.
//
// Mesma separacao que `drivers/vcs/config.ts` faz em relacao a `token.ts`:
// o que o cliente alcanca fica livre de dependencia pesada e de segredo.
// O `env.ts` continua usando zod para as vars de SERVIDOR, que sao 30+ e
// nunca chegam ao navegador.
//
// IMPORTANTE: cada `process.env.NEXT_PUBLIC_*` e escrito por extenso. O Next
// substitui essas expressoes literalmente no build; ler via variavel
// intermediaria (`const e = process.env; e.NEXT_PUBLIC_X`) devolve undefined
// no cliente. Ver o comentario no topo de `features.ts`.
// ═══════════════════════════════════════════════════════════════════════════

const DRIVERS_REALTIME = ["supabase", "pg-notify-sse", "polling"] as const;
const MODOS_TOKEN_VCS = ["oauth", "pat", "instance-pat"] as const;
const DRIVERS_OBS = ["sentry", "glitchtip", "console", "noop"] as const;

export type DriverRealtime = (typeof DRIVERS_REALTIME)[number];
export type ModoTokenVcs = (typeof MODOS_TOKEN_VCS)[number];
export type DriverObs = (typeof DRIVERS_OBS)[number];

export interface EnvPublica {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_REALTIME_DRIVER?: DriverRealtime;
  NEXT_PUBLIC_VCS_TOKEN_MODE?: ModoTokenVcs;
  NEXT_PUBLIC_OBS_DRIVER?: DriverObs;
}

/**
 * No docker-compose, `${VAR:-}` injeta string vazia no container quando a var
 * nao esta no .env.local. Vazio significa "nao setada", nao "setada como ''".
 */
function limpar(valor: string | undefined): string | undefined {
  return valor === "" ? undefined : valor;
}

/** Coletor de erros, para relatar TODOS de uma vez e nao um por deploy. */
class Problemas {
  private readonly itens: string[] = [];

  add(campo: string, motivo: string) {
    this.itens.push(`  ${campo}: ${motivo}`);
  }

  lancarSeHouver(prefixo: string) {
    if (this.itens.length > 0) {
      throw new Error(`${prefixo}:\n${this.itens.join("\n")}`);
    }
  }
}

function exigirTexto(
  campo: string,
  valor: string | undefined,
  problemas: Problemas,
): string {
  const limpo = limpar(valor);
  if (!limpo) {
    problemas.add(campo, "obrigatória e está vazia");
    return "";
  }
  return limpo;
}

function exigirUrl(
  campo: string,
  valor: string | undefined,
  problemas: Problemas,
): string {
  const limpo = exigirTexto(campo, valor, problemas);
  if (!limpo) return "";
  try {
    // Mesma semantica do z.string().url(): o parser de URL do proprio
    // runtime decide, em vez de uma regex nossa.
    new URL(limpo);
  } catch {
    problemas.add(campo, `não é uma URL válida (recebido: "${limpo}")`);
  }
  return limpo;
}

function opcionalEntre<T extends string>(
  campo: string,
  valor: string | undefined,
  aceitos: readonly T[],
  problemas: Problemas,
): T | undefined {
  const limpo = limpar(valor);
  if (limpo === undefined) return undefined;
  if (!(aceitos as readonly string[]).includes(limpo)) {
    problemas.add(campo, `deve ser ${aceitos.join(" | ")} (recebido: "${limpo}")`);
    return undefined;
  }
  return limpo as T;
}

function validar(): EnvPublica {
  const problemas = new Problemas();

  const env: EnvPublica = {
    NEXT_PUBLIC_SUPABASE_URL: exigirUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      problemas,
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: exigirTexto(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      problemas,
    ),
    NEXT_PUBLIC_SITE_URL: limpar(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_REALTIME_DRIVER: opcionalEntre(
      "NEXT_PUBLIC_REALTIME_DRIVER",
      process.env.NEXT_PUBLIC_REALTIME_DRIVER,
      DRIVERS_REALTIME,
      problemas,
    ),
    NEXT_PUBLIC_VCS_TOKEN_MODE: opcionalEntre(
      "NEXT_PUBLIC_VCS_TOKEN_MODE",
      process.env.NEXT_PUBLIC_VCS_TOKEN_MODE,
      MODOS_TOKEN_VCS,
      problemas,
    ),
    NEXT_PUBLIC_OBS_DRIVER: opcionalEntre(
      "NEXT_PUBLIC_OBS_DRIVER",
      process.env.NEXT_PUBLIC_OBS_DRIVER,
      DRIVERS_OBS,
      problemas,
    ),
  };

  // Mesmo prefixo de antes: aparece em log de deploy e em issue aberta.
  problemas.lancarSeHouver("Missing or invalid environment variables");
  return env;
}

let cache: EnvPublica | null = null;

/** Env publicas validadas. Lazy: so valida no primeiro acesso. */
export function getPublicEnv(): EnvPublica {
  if (!cache) cache = validar();
  return cache;
}

/** @deprecated Use getPublicEnv(). Mantido por compatibilidade. */
export const publicEnv = new Proxy({} as EnvPublica, {
  get(_alvo, prop: string) {
    return getPublicEnv()[prop as keyof EnvPublica];
  },
});
