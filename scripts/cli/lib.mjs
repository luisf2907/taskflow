// ═══════════════════════════════════════════════════════════════════════
// CLI lib — helpers compartilhados entre comandos
// ═══════════════════════════════════════════════════════════════════════
// Carregado por todos os arquivos scripts/cli/*.mjs. Centraliza criacao
// do cliente Supabase com service role, logging e validacao de envs.
//
// Uso: executado via Node 20+ com --env-file pra carregar .env.local.
//   node --env-file=.env.local scripts/cli.mjs <command>
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

// ───── Color helpers (minimalista, sem deps) ─────
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

export const log = {
  info: (msg) => console.log(`${CYAN}ℹ${RESET} ${msg}`),
  ok: (msg) => console.log(`${GREEN}✓${RESET} ${msg}`),
  warn: (msg) => console.warn(`${YELLOW}!${RESET} ${msg}`),
  err: (msg) => console.error(`${RED}✗${RESET} ${msg}`),
  dim: (msg) => console.log(`${DIM}${msg}${RESET}`),
};

// ───── Env validation ─────
export function getEnv() {
  const missing = [];
  const env = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!env.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    log.err(`Envs faltando: ${missing.join(", ")}`);
    log.dim("Certifique-se de rodar com:  node --env-file=.env.local scripts/cli.mjs <command>");
    process.exit(1);
  }
  return env;
}

// ───── Admin client (service role, bypass RLS) ─────
export function getAdminClient() {
  const env = getEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ───── Arg parser minimalista ─────
// Converte `--email x --password y --name z` em { email: "x", password: "y", name: "z" }
// Suporta tambem `--flag` sem valor (vira true).
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

// ───── Required-arg helper ─────
export function requireArgs(args, keys) {
  const missing = keys.filter((k) => args[k] === undefined || args[k] === "");
  if (missing.length > 0) {
    log.err(`Flags obrigatorias faltando: ${missing.map((k) => "--" + k).join(", ")}`);
    process.exit(1);
  }
}

// ───── Perfis upsert (workaround pro trigger faltoso) ─────
// Garante que public.perfis tem row pro user criado. O trigger
// on_auth_user_created deveria fazer isso automaticamente, mas em
// self-hosted as vezes falha silenciosamente. Upsert idempotente:
// cria se nao existe, nao sobrescreve.
export async function ensurePerfilRow(admin, user, nome, opts = {}) {
  const row = {
    id: user.id,
    email: user.email,
    nome: nome ?? user.email?.split("@")[0] ?? "User",
  };
  if (opts.mustChangePassword !== undefined) {
    row.must_change_password = opts.mustChangePassword;
  }
  const { error } = await admin.from("perfis").upsert(
    row,
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    log.warn(`Aviso ao criar row em perfis: ${error.message}`);
    log.dim("(Continuando — pode ja existir)");
  }
}
