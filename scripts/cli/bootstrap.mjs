// ═══════════════════════════════════════════════════════════════════════
// taskflow bootstrap — primeiro setup do instance
// ═══════════════════════════════════════════════════════════════════════
// Cria o primeiro admin user + perfis row + workspace default.
// Idempotente: pode ser rodado multiplas vezes, nao duplica dados.
//
// Uso:
//   node --env-file=.env.local scripts/cli.mjs bootstrap \
//     --admin-email admin@example.com \
//     --admin-password changeme123 \
//     --admin-name "Admin User" \
//     --workspace-name "My Workspace"
//
// Flags obrigatorias: --admin-email, --admin-password
// Flags opcionais:   --admin-name (default: admin), --workspace-name (default: Default)
// ═══════════════════════════════════════════════════════════════════════

import { getAdminClient, log, parseArgs, requireArgs, ensurePerfilRow } from "./lib.mjs";

export async function bootstrap(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["admin-email", "admin-password"]);

  const email = args["admin-email"];
  const password = args["admin-password"];
  const name = args["admin-name"] ?? "Admin";
  const workspaceName = args["workspace-name"] ?? "Default";

  const admin = getAdminClient();

  log.info(`Bootstrapping: admin=${email}, workspace="${workspaceName}"`);

  // ───── 1. User admin ─────
  // Tenta achar por email; se nao existe, cria.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    log.err(`Falha ao listar users: ${listErr.message}`);
    process.exit(2);
  }

  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (user) {
    log.info(`User ${email} ja existe (${user.id}) — pulando criacao.`);
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    });
    if (createErr || !created?.user) {
      log.err(`Falha ao criar user: ${createErr?.message ?? "unknown"}`);
      process.exit(2);
    }
    user = created.user;
    log.ok(`User criado: ${email} (${user.id})`);
  }

  // ───── 2. Perfis row ─────
  await ensurePerfilRow(admin, user, name);
  log.ok(`Row em public.perfis garantido pra ${email}`);

  // ───── 3. Workspace default ─────
  // Procura workspace com mesmo nome; se nao existe, cria + adiciona admin.
  const { data: existingWs, error: wsErr } = await admin
    .from("workspaces")
    .select("id, nome")
    .eq("nome", workspaceName)
    .limit(1);

  if (wsErr) {
    log.err(`Falha ao checar workspaces: ${wsErr.message}`);
    process.exit(2);
  }

  let workspaceId;
  if (existingWs && existingWs.length > 0) {
    workspaceId = existingWs[0].id;
    log.info(`Workspace "${workspaceName}" ja existe (${workspaceId}) — pulando criacao.`);
  } else {
    // Cores de avatar pra workspace (mesmas do seed original)
    const cores = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#78716C"];
    const cor = cores[Math.floor(Math.random() * cores.length)];

    const { data: ws, error: createWsErr } = await admin
      .from("workspaces")
      .insert({
        nome: workspaceName,
        cor,
        criado_por: user.id,
      })
      .select("id")
      .single();

    if (createWsErr || !ws) {
      log.err(`Falha ao criar workspace: ${createWsErr?.message ?? "unknown"}`);
      process.exit(2);
    }
    workspaceId = ws.id;
    log.ok(`Workspace criado: "${workspaceName}" (${workspaceId})`);

    // Trigger trg_auto_add_workspace_creator deveria adicionar o criador
    // automaticamente como admin em workspace_usuarios. Se falhar, upsert
    // manual como seguranca.
    await admin.from("workspace_usuarios").upsert(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        papel: "admin",
      },
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
    );
  }

  log.ok("Bootstrap completo!");
  log.dim("");
  log.dim(`  Email:     ${email}`);
  log.dim(`  User ID:   ${user.id}`);
  log.dim(`  Workspace: ${workspaceName} (${workspaceId})`);
  log.dim("");
  log.dim(`  Abra o app e faca login.`);
}
