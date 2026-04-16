#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// gen-secrets.mjs — Gera secrets seguros pro stack self-hosted
// ═══════════════════════════════════════════════════════════════════════
// Versao Node puro (funciona em Linux, macOS, Windows PowerShell, Git Bash,
// qualquer coisa com node 20+). Substitui o gen-secrets.sh que dependia de
// bash + openssl no PATH.
//
// Uso:
//   node scripts/gen-secrets.mjs              # imprime em stdout
//   node scripts/gen-secrets.mjs >> .env.local
//
// Setup completo do zero:
//   node scripts/setup-env.mjs                # cria .env.local consolidado
//
// Gera:
//   - POSTGRES_PASSWORD     — 32 bytes hex
//   - JWT_SECRET            — 32 bytes hex
//   - ENCRYPTION_KEY        — 32 bytes hex (AES-256)
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY      — JWT HS256 role=anon
//   - SUPABASE_SERVICE_ROLE_KEY          — JWT HS256 role=service_role
// ═══════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";

const rand = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

function signJwt(role, secret) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      role,
      iss: "supabase-local",
      iat: now,
      exp: now + 315_360_000, // 10 anos
    }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

const POSTGRES_PASSWORD = rand(32);
const JWT_SECRET = rand(32);
const ENCRYPTION_KEY = rand(32);
const ANON_KEY = signJwt("anon", JWT_SECRET);
const SERVICE_ROLE_KEY = signJwt("service_role", JWT_SECRET);

const out = `
# ═══════════════════════════════════════════════════════════════════════
# Secrets gerados em ${new Date().toISOString()} por gen-secrets.mjs
# NAO trocar depois de rodar o stack a primeira vez:
#   - ENCRYPTION_KEY: tokens ja encriptados (GitHub PATs, API keys)
#     ficam irrecuperaveis se mudar
#   - JWT_SECRET: invalida todas sessoes ativas, forca re-login de todos
# Se precisar rotacionar, use:
#   docker compose exec app npx taskflow token:rotate
# ═══════════════════════════════════════════════════════════════════════

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
`.trimStart();

process.stdout.write(out);
