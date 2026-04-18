#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// test-rls.mjs — Testa isolamento multi-tenant via RLS
// ═══════════════════════════════════════════════════════════════════════
// Cria 2 users em workspaces diferentes e valida que:
//   1. User A ve dados do workspace A
//   2. User A NAO ve dados do workspace B
//   3. User B NAO ve dados do workspace A
//
// Roda via CLI:
//   node --env-file=.env.local scripts/test-rls.mjs
//
// Usado no CI (GitHub Actions) pra garantir que RLS nao regrediu.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error("✗ Envs faltando: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FALHOU: ${label}`);
    failed++;
  }
}

async function createUserWithSession(email, password, name) {
  // Create user via admin API
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, name },
  });
  if (error) throw new Error(`Criar user ${email}: ${error.message}`);

  const user = created?.user;
  if (!user?.id) {
    throw new Error(`Criar user ${email}: resposta sem user.id — data=${JSON.stringify(created)}`);
  }

  // Create perfil row (workaround trigger)
  await admin.from("perfis").upsert(
    { id: user.id, email, nome: name },
    { onConflict: "id", ignoreDuplicates: true },
  );

  // Create authenticated client (simulates browser session)
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginErr } = await userClient.auth.signInWithPassword({ email, password });
  if (loginErr) throw new Error(`Login ${email}: ${loginErr.message}`);

  return { user, client: userClient };
}

async function createWorkspace(client, userId, name) {
  if (!userId) throw new Error(`createWorkspace: userId e null/undefined`);

  const { data, error } = await admin.from("workspaces").insert({ nome: name }).select().single();
  if (error) throw new Error(`Criar workspace: ${error.message}`);

  const { error: memErr } = await admin.from("workspace_usuarios").insert({
    workspace_id: data.id,
    user_id: userId,
    papel: "admin",
  });
  if (memErr) throw new Error(`Criar workspace membership: ${memErr.message}`);

  return data;
}

async function createQuadro(workspaceId, name) {
  const { data, error } = await admin.from("quadros").insert({
    workspace_id: workspaceId,
    nome: name,
  }).select().single();
  if (error) throw new Error(`Criar quadro: ${error.message}`);
  return data;
}

async function createCartao(workspaceId, quadroId, titulo) {
  // Create coluna first
  const { data: coluna } = await admin.from("colunas").insert({
    quadro_id: quadroId,
    nome: "Backlog",
    posicao: 0,
  }).select().single();

  const { data, error } = await admin.from("cartoes").insert({
    workspace_id: workspaceId,
    coluna_id: coluna.id,
    titulo,
    posicao: 0,
  }).select().single();
  if (error) throw new Error(`Criar cartao: ${error.message}`);
  return data;
}

async function main() {
  console.log("\n🔒 Teste de isolamento RLS (multi-tenant)\n");

  // ───── Setup ─────
  console.log("Setup: criando users e workspaces...");

  const userA = await createUserWithSession("rls-a@ci.test", "testpass123", "User A");
  const userB = await createUserWithSession("rls-b@ci.test", "testpass123", "User B");

  const workspaceA = await createWorkspace(userA.client, userA.user.id, "Workspace A (RLS test)");
  const workspaceB = await createWorkspace(userB.client, userB.user.id, "Workspace B (RLS test)");

  const quadroA = await createQuadro(workspaceA.id, "Quadro A");
  const quadroB = await createQuadro(workspaceB.id, "Quadro B");

  const cartaoA = await createCartao(workspaceA.id, quadroA.id, "Cartao de A");
  const cartaoB = await createCartao(workspaceB.id, quadroB.id, "Cartao de B");

  console.log("  ✓ Setup concluido\n");

  // ───── Testes: User A ─────
  console.log("User A (deve ver so workspace A):");

  // Workspaces
  const { data: wsA } = await userA.client.from("workspaces").select("id, nome");
  assert(wsA?.length === 1, "User A ve exatamente 1 workspace");
  assert(wsA?.[0]?.id === workspaceA.id, "User A ve Workspace A");

  // Quadros
  const { data: qA } = await userA.client.from("quadros").select("id, nome");
  assert(qA?.length === 1, "User A ve exatamente 1 quadro");
  assert(qA?.[0]?.id === quadroA.id, "User A ve Quadro A");

  // Cartoes
  const { data: cA } = await userA.client.from("cartoes").select("id, titulo");
  assert(cA?.length === 1, "User A ve exatamente 1 cartao");
  assert(cA?.[0]?.titulo === "Cartao de A", "User A ve 'Cartao de A'");

  // NAO ve dados de B
  const { data: wsAall } = await userA.client.from("workspaces").select("id").eq("id", workspaceB.id);
  assert(wsAall?.length === 0, "User A NAO ve Workspace B");

  const { data: cAcrossB } = await userA.client.from("cartoes").select("id").eq("id", cartaoB.id);
  assert(cAcrossB?.length === 0, "User A NAO ve Cartao de B");

  // ───── Testes: User B ─────
  console.log("\nUser B (deve ver so workspace B):");

  const { data: wsB } = await userB.client.from("workspaces").select("id, nome");
  assert(wsB?.length === 1, "User B ve exatamente 1 workspace");
  assert(wsB?.[0]?.id === workspaceB.id, "User B ve Workspace B");

  const { data: cB } = await userB.client.from("cartoes").select("id, titulo");
  assert(cB?.length === 1, "User B ve exatamente 1 cartao");
  assert(cB?.[0]?.titulo === "Cartao de B", "User B ve 'Cartao de B'");

  const { data: wsBcrossA } = await userB.client.from("workspaces").select("id").eq("id", workspaceA.id);
  assert(wsBcrossA?.length === 0, "User B NAO ve Workspace A");

  const { data: cBcrossA } = await userB.client.from("cartoes").select("id").eq("id", cartaoA.id);
  assert(cBcrossA?.length === 0, "User B NAO ve Cartao de A");

  // ───── Cleanup ─────
  console.log("\nCleanup...");
  await admin.from("cartoes").delete().in("id", [cartaoA.id, cartaoB.id]);
  await admin.from("colunas").delete().in("quadro_id", [quadroA.id, quadroB.id]);
  await admin.from("quadros").delete().in("id", [quadroA.id, quadroB.id]);
  await admin.from("workspace_usuarios").delete().in("workspace_id", [workspaceA.id, workspaceB.id]);
  await admin.from("workspaces").delete().in("id", [workspaceA.id, workspaceB.id]);
  await admin.auth.admin.deleteUser(userA.user.id);
  await admin.auth.admin.deleteUser(userB.user.id);

  // ───── Resultado ─────
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(50)}\n`);

  if (failed > 0) {
    console.error("⚠️  RLS ISOLATION BREACH DETECTED — fix before deploying!");
    process.exit(1);
  }

  console.log("✓ RLS isolation verified — all tenants properly isolated.\n");
}

main().catch((err) => {
  console.error("✗ Test setup failed:", err.message);
  process.exit(2);
});
