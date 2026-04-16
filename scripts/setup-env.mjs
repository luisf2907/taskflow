#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// setup-env.mjs — Cria .env.local a partir de .env.<profile>.example,
// substituindo placeholders por secrets gerados.
// ═══════════════════════════════════════════════════════════════════════
// Equivalente a `make setup`, mas funciona em qualquer shell (PowerShell,
// bash, cmd — desde que tenha node).
//
// Uso:
//   node scripts/setup-env.mjs              # perfil solo
//   node scripts/setup-env.mjs team         # perfil team (quando existir)
//   node scripts/setup-env.mjs --force      # sobrescreve .env.local existente
//
// Retorna exit 1 se .env.local ja existe (e sem --force). Usa --force
// com cautela: regenerar secrets INVALIDA dados ja encriptados.
// ═══════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const force = args.includes("--force");
const profile = args.find((a) => !a.startsWith("--")) ?? "solo";

const templatePath = resolve(repoRoot, `.env.${profile}.example`);
const targetPath = resolve(repoRoot, ".env.local");

// ───── Validacoes ─────
if (!existsSync(templatePath)) {
  console.error(`ERRO: template ${templatePath} nao existe.`);
  console.error(`Perfis disponiveis: solo (team/full em breve)`);
  process.exit(1);
}

if (existsSync(targetPath) && !force) {
  console.error(`ERRO: ${targetPath} ja existe.`);
  console.error(`Apague-o manualmente ou use --force (CUIDADO: regenera`);
  console.error(`secrets — tokens encriptados no DB ficam irrecuperaveis).`);
  process.exit(1);
}

// ───── Gera secrets ─────
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
      exp: now + 315_360_000,
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

// ───── Substituicoes ─────
// Mapeia cada var que o template tem como placeholder pro valor real
const replacements = {
  POSTGRES_PASSWORD,
  JWT_SECRET,
  ENCRYPTION_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
};

// Le o template e substitui linha a linha. Preserva comentarios/linhas em branco.
const template = readFileSync(templatePath, "utf8");
const output = template
  .split(/\r?\n/)
  .map((line) => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) return line;
    const [, key] = match;
    if (key in replacements) {
      return `${key}=${replacements[key]}`;
    }
    return line;
  })
  .join("\n");

// Prepend timestamp header
const header = `# Taskflow self-hosted — gerado em ${new Date().toISOString()} (perfil ${profile})\n# Secrets aleatorios gerados por scripts/setup-env.mjs\n\n`;

writeFileSync(targetPath, header + output, "utf8");

console.log(`OK  Criado ${targetPath}`);
console.log(`    Perfil: ${profile}`);
console.log(`    Revise valores de AUTH_MODE, STORAGE_DRIVER, etc antes de subir o stack.`);
console.log(``);
console.log(`    Proximo passo:`);
console.log(`      docker compose -f docker/docker-compose.${profile}.yml --env-file .env.local up -d`);
