// ═══════════════════════════════════════════════════════════════════════
// taskflow workspace:<subcommand> — gerenciamento de workspaces
// ═══════════════════════════════════════════════════════════════════════
// Subcomandos:
//   workspace:create   Cria um workspace e associa owner
//   workspace:list     Lista workspaces do instance
//   workspace:invite   Gera link de convite (sem email)
//
// Exemplos:
//   node --env-file=.env.local scripts/cli.mjs workspace:create \
//     --name "Home Lab" --owner admin@taskflow.local
//
//   node --env-file=.env.local scripts/cli.mjs workspace:invite \
//     --workspace "Home Lab" --email bruno@home.lab
// ═══════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";

import { getAdminClient, log, parseArgs, requireArgs } from "./lib.mjs";

const AVATAR_CORES = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#78716C",
];

// ───── workspace:create ─────
export async function workspaceCreate(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["name", "owner"]);

  const { name, owner } = args;
  const admin = getAdminClient();

  const { data: list } = await admin.auth.admin.listUsers();
  const ownerUser = list?.users.find((u) => u.email?.toLowerCase() === owner.toLowerCase());
  if (!ownerUser) {
    log.err(`Owner ${owner} nao encontrado em auth.users. Crie com user:create antes.`);
    process.exit(2);
  }

  const cor = AVATAR_CORES[Math.floor(Math.random() * AVATAR_CORES.length)];

  const { data: ws, error } = await admin
    .from("workspaces")
    .insert({ nome: name, cor, criado_por: ownerUser.id })
    .select("id")
    .single();

  if (error || !ws) {
    log.err(`Falha ao criar workspace: ${error?.message ?? "unknown"}`);
    process.exit(2);
  }

  // Trigger trg_auto_add_workspace_creator deveria adicionar. Upsert manual
  // como seguranca.
  const { error: wsUserErr } = await admin.from("workspace_usuarios").upsert(
    {
      workspace_id: ws.id,
      user_id: ownerUser.id,
      papel: "admin",
    },
    { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
  );
  if (wsUserErr) {
    log.warn(`Aviso ao associar owner: ${wsUserErr.message}`);
  }

  log.ok(`Workspace "${name}" criado (${ws.id})`);
  log.dim(`  Owner: ${owner}`);
}

// ───── workspace:list ─────
export async function workspaceList() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, nome, cor, criado_em, criado_por")
    .order("criado_em", { ascending: false });

  if (error) {
    log.err(`Falha ao listar: ${error.message}`);
    process.exit(2);
  }

  if (!data || data.length === 0) {
    log.info("Nenhum workspace cadastrado.");
    return;
  }

  console.log();
  console.log(`  ${pad("NOME", 30)}  ${pad("ID", 36)}  CRIADO EM`);
  console.log(`  ${"─".repeat(30)}  ${"─".repeat(36)}  ${"─".repeat(20)}`);
  for (const ws of data) {
    const criado = ws.criado_em
      ? new Date(ws.criado_em).toISOString().slice(0, 19).replace("T", " ")
      : "—";
    console.log(`  ${pad(ws.nome, 30)}  ${ws.id}  ${criado}`);
  }
  console.log();
  log.dim(`  Total: ${data.length} workspace(s)`);
}

// ───── workspace:invite ─────
// Gera link de convite em invite_links. Sem disparar email.
export async function workspaceInvite(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["workspace", "email"]);

  const { workspace: wsName, email } = args;
  const papel = args.papel === "admin" ? "admin" : "membro";
  const admin = getAdminClient();

  // Resolve workspace por nome (tolerante: pega primeiro matching)
  const { data: wsList, error: wsErr } = await admin
    .from("workspaces")
    .select("id, nome")
    .ilike("nome", wsName)
    .limit(1);

  if (wsErr) {
    log.err(`Falha ao buscar workspace: ${wsErr.message}`);
    process.exit(2);
  }
  if (!wsList || wsList.length === 0) {
    log.err(`Workspace "${wsName}" nao encontrado.`);
    process.exit(2);
  }

  const ws = wsList[0];

  // Gera code aleatorio (12 chars base62)
  const code = crypto.randomBytes(9).toString("base64url").slice(0, 12);

  // Expira em 7 dias por default
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: inviteErr } = await admin.from("invite_links").insert({
    code,
    workspace_id: ws.id,
    email_alvo: email,
    papel,
    expira_em: expiraEm,
  });

  if (inviteErr) {
    log.err(`Falha ao criar invite: ${inviteErr.message}`);
    process.exit(2);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${siteUrl}/convite/${code}`;

  log.ok(`Invite criado pra ${email} em "${ws.nome}" (papel: ${papel})`);
  console.log();
  console.log(`  Link de convite (expira em 7 dias):`);
  console.log(`  ${link}`);
  console.log();
  log.dim(`  Envie esse link pra ${email}. Quem tiver o link + conta logada aceita.`);
}

// ───── helpers ─────
function pad(s, n) {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
