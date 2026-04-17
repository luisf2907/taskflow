#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// validate-schema.mjs — Compara schema do DB rodando com bootstrap.sql
// ═══════════════════════════════════════════════════════════════════════
// Detecta drift entre o bootstrap.sql consolidado e o banco em execucao.
// Util pra saber se o DB de producao mudou e bootstrap.sql precisa ser
// regenerado.
//
// Uso:
//   node --env-file=.env.local scripts/validate-schema.mjs
//
// Requer stack rodando (postgres container acessivel via docker exec).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const postgresContainer = process.argv[2] ?? "taskflow-postgres";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

function log(color, prefix, msg) {
  console.log(`${color}${prefix}${RESET} ${msg}`);
}

// ───── Dump schema do DB rodando ─────
function dumpLiveSchema() {
  const result = spawnSync("docker", [
    "exec", "-i", postgresContainer,
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `,
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    console.error("Falha ao conectar no DB:", result.stderr);
    process.exit(2);
  }

  return result.stdout.trim().split("\n").filter(Boolean);
}

function dumpLiveColumns() {
  const result = spawnSync("docker", [
    "exec", "-i", postgresContainer,
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", `
      SELECT table_name || '.' || column_name || ' (' || data_type || ')'
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `,
  ], { encoding: "utf8" });

  return result.stdout.trim().split("\n").filter(Boolean);
}

function dumpLivePolicies() {
  const result = spawnSync("docker", [
    "exec", "-i", postgresContainer,
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", `
      SELECT polname FROM pg_policy
      JOIN pg_class ON pg_class.oid = pg_policy.polrelid
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE nspname IN ('public', 'storage')
      ORDER BY polname;
    `,
  ], { encoding: "utf8" });

  return result.stdout.trim().split("\n").filter(Boolean);
}

function dumpLiveFunctions() {
  const result = spawnSync("docker", [
    "exec", "-i", postgresContainer,
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `,
  ], { encoding: "utf8" });

  return result.stdout.trim().split("\n").filter(Boolean);
}

// ───── Parse tabelas do bootstrap.sql ─────
function parseBootstrapTables() {
  const sql = readFileSync(resolve(repoRoot, "supabase/self-hosted/bootstrap.sql"), "utf8");
  const matches = sql.matchAll(/CREATE TABLE IF NOT EXISTS "public"\."(\w+)"/g);
  return [...matches].map((m) => m[1]).sort();
}

function parseBootstrapPolicies() {
  const sql = readFileSync(resolve(repoRoot, "supabase/self-hosted/bootstrap.sql"), "utf8");
  const matches = sql.matchAll(/CREATE POLICY "(\w+)"/g);
  return [...matches].map((m) => m[1]).sort();
}

// ───── Compare ─────
function compare(label, bootstrapItems, liveItems) {
  const bSet = new Set(bootstrapItems);
  const lSet = new Set(liveItems);

  const onlyInBootstrap = bootstrapItems.filter((t) => !lSet.has(t));
  const onlyInLive = liveItems.filter((t) => !bSet.has(t));

  console.log(`\n${label}:`);
  log(DIM, "  ", `bootstrap: ${bootstrapItems.length}, live: ${liveItems.length}`);

  if (onlyInBootstrap.length === 0 && onlyInLive.length === 0) {
    log(GREEN, "  ✓", "Em sync");
    return 0;
  }

  let drifts = 0;
  for (const item of onlyInBootstrap) {
    log(YELLOW, "  !", `Somente no bootstrap.sql: ${item}`);
    drifts++;
  }
  for (const item of onlyInLive) {
    log(RED, "  ✗", `Somente no DB live (falta no bootstrap): ${item}`);
    drifts++;
  }
  return drifts;
}

// ───── Main ─────
console.log("Schema drift validation");
console.log(`Container: ${postgresContainer}\n`);

let totalDrifts = 0;

const bootstrapTables = parseBootstrapTables();
const liveTables = dumpLiveSchema();
totalDrifts += compare("Tabelas", bootstrapTables, liveTables);

const bootstrapPolicies = parseBootstrapPolicies();
const livePolicies = dumpLivePolicies();
totalDrifts += compare("Policies", bootstrapPolicies, livePolicies);

const liveFunctions = dumpLiveFunctions();
console.log(`\nFuncoes no DB live: ${liveFunctions.length}`);

console.log(`\n${"═".repeat(50)}`);
if (totalDrifts === 0) {
  log(GREEN, "✓", "Schema em sync — nenhum drift detectado.");
} else {
  log(RED, "!", `${totalDrifts} drift(s) detectado(s).`);
  log(DIM, " ", "Regenere bootstrap.sql se necessario:");
  log(DIM, " ", "  supabase db dump --linked --schema public > dump-public.sql");
}
console.log();

process.exit(totalDrifts > 0 ? 1 : 0);
