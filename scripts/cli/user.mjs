// ═══════════════════════════════════════════════════════════════════════
// taskflow user:<subcommand> — gerenciamento de usuarios
// ═══════════════════════════════════════════════════════════════════════
// Subcomandos:
//   user:create          Cria um user no GoTrue + row em public.perfis
//   user:list            Lista users do instance
//   user:reset-password  Troca a senha de um user
//   user:delete          Remove user (GoTrue + perfis + dados relacionados)
//
// Exemplos:
//   node --env-file=.env.local scripts/cli.mjs user:create \
//     --email bruno@home.lab --password s3cret --name "Bruno"
//
//   node --env-file=.env.local scripts/cli.mjs user:list
//
//   node --env-file=.env.local scripts/cli.mjs user:reset-password \
//     --email bruno@home.lab --password nova123
//
//   node --env-file=.env.local scripts/cli.mjs user:delete \
//     --email bruno@home.lab --yes
// ═══════════════════════════════════════════════════════════════════════

import { getAdminClient, log, parseArgs, requireArgs, ensurePerfilRow } from "./lib.mjs";

// ───── user:create ─────
export async function userCreate(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["email", "password"]);

  const { email, password } = args;
  const name = args.name ?? email.split("@")[0];

  const admin = getAdminClient();

  // Checa se ja existe
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    log.err(`User ${email} ja existe (${existing.id}). Use user:reset-password pra trocar senha.`);
    process.exit(2);
  }

  // --no-password-change pula a flag must_change_password (util pra
  // admin que seta a senha definitiva diretamente, tipo solo mode).
  const mustChangePassword = args["no-password-change"] !== true;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, name },
    app_metadata: { must_change_password: mustChangePassword },
  });

  if (error || !created?.user) {
    log.err(`Falha ao criar: ${error?.message ?? "unknown"}`);
    process.exit(2);
  }

  await ensurePerfilRow(admin, created.user, name, { mustChangePassword });

  log.ok(`User criado: ${email}`);
  log.dim(`  ID: ${created.user.id}`);
  if (mustChangePassword) {
    log.dim(`  Senha temporaria — user vai trocar no primeiro login.`);
  }
}

// ───── user:list ─────
export async function userList() {
  const admin = getAdminClient();
  const { data: list, error } = await admin.auth.admin.listUsers();
  if (error) {
    log.err(`Falha ao listar: ${error.message}`);
    process.exit(2);
  }

  const users = list.users;
  if (users.length === 0) {
    log.info("Nenhum user cadastrado.");
    return;
  }

  console.log();
  console.log(
    `  ${pad("EMAIL", 38)}  ${pad("ID", 36)}  ${pad("CRIADO EM", 20)}  LAST SIGN IN`,
  );
  console.log(`  ${"─".repeat(38)}  ${"─".repeat(36)}  ${"─".repeat(20)}  ${"─".repeat(20)}`);
  for (const u of users) {
    const created = u.created_at ? new Date(u.created_at).toISOString().slice(0, 19).replace("T", " ") : "—";
    const lastSignIn = u.last_sign_in_at
      ? new Date(u.last_sign_in_at).toISOString().slice(0, 19).replace("T", " ")
      : "nunca";
    console.log(`  ${pad(u.email ?? "?", 38)}  ${u.id}  ${pad(created, 20)}  ${lastSignIn}`);
  }
  console.log();
  log.dim(`  Total: ${users.length} user(s)`);
}

// ───── user:reset-password ─────
export async function userResetPassword(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["email", "password"]);

  const { email, password } = args;
  const admin = getAdminClient();

  const { data: list } = await admin.auth.admin.listUsers();
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    log.err(`User ${email} nao encontrado.`);
    process.exit(2);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    log.err(`Falha ao atualizar senha: ${error.message}`);
    process.exit(2);
  }

  log.ok(`Senha de ${email} atualizada.`);
}

// ───── user:delete ─────
export async function userDelete(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["email"]);

  const { email } = args;
  const confirm = args.yes === true;

  const admin = getAdminClient();
  const { data: list } = await admin.auth.admin.listUsers();
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    log.err(`User ${email} nao encontrado.`);
    process.exit(2);
  }

  if (!confirm) {
    log.warn(`Isso vai deletar o user ${email} (ID: ${user.id}) e cascata em`);
    log.warn(`  - public.perfis`);
    log.warn(`  - workspace_usuarios (memberships)`);
    log.warn(`  - github_tokens, api_keys, etc (tudo que tem FK pra auth.users)`);
    log.warn("");
    log.warn("Re-execute com --yes pra confirmar.");
    process.exit(1);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    log.err(`Falha ao deletar: ${error.message}`);
    process.exit(2);
  }

  log.ok(`User ${email} deletado.`);
}

// ───── helpers ─────
function pad(s, n) {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
