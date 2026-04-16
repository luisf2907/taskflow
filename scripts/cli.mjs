#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// taskflow CLI — entry point
// ═══════════════════════════════════════════════════════════════════════
// Uso:
//   node --env-file=.env.local scripts/cli.mjs <command> [flags]
//
// Via Makefile (atalho):
//   make admin EMAIL=x PASSWORD=y NAME=z
//
// Comandos disponiveis:
//   bootstrap              Primeiro setup (admin + workspace default)
//   user:create            Cria user + perfis row
//   user:list              Lista users
//   user:reset-password    Troca senha de user
//   user:delete            Remove user (usa --yes pra confirmar)
//   help                   Mostra esta lista
//
// Flags globais:
//   --help, -h             Mostra ajuda deste comando
//
// Exemplos:
//   node --env-file=.env.local scripts/cli.mjs bootstrap \\
//     --admin-email admin@taskflow.local --admin-password changeme
//
//   node --env-file=.env.local scripts/cli.mjs user:create \\
//     --email bruno@home.lab --password s3cret --name Bruno
// ═══════════════════════════════════════════════════════════════════════

import { bootstrap } from "./cli/bootstrap.mjs";
import { health } from "./cli/health.mjs";
import {
  userCreate,
  userList,
  userResetPassword,
  userDelete,
} from "./cli/user.mjs";
import {
  workspaceCreate,
  workspaceList,
  workspaceInvite,
} from "./cli/workspace.mjs";
import { log } from "./cli/lib.mjs";

const COMMANDS = {
  bootstrap: { fn: bootstrap, desc: "Primeiro setup (admin + workspace default)" },
  health: { fn: health, desc: "Valida stack (postgres, gotrue, postgrest, schema)" },
  "user:create": { fn: userCreate, desc: "Cria user + perfis row" },
  "user:list": { fn: userList, desc: "Lista users do instance" },
  "user:reset-password": { fn: userResetPassword, desc: "Troca senha de user" },
  "user:delete": { fn: userDelete, desc: "Remove user (use --yes pra confirmar)" },
  "workspace:create": { fn: workspaceCreate, desc: "Cria workspace e associa owner" },
  "workspace:list": { fn: workspaceList, desc: "Lista workspaces" },
  "workspace:invite": { fn: workspaceInvite, desc: "Gera link de convite (sem email)" },
};

function showHelp() {
  console.log();
  console.log("  taskflow CLI — gerenciamento do instance self-hosted");
  console.log();
  console.log("  Uso:");
  console.log("    node --env-file=.env.local scripts/cli.mjs <command> [flags]");
  console.log();
  console.log("  Comandos:");
  for (const [name, { desc }] of Object.entries(COMMANDS)) {
    console.log(`    ${name.padEnd(24)} ${desc}`);
  }
  console.log();
  console.log("  Mais detalhes de cada comando:  <command> --help");
  console.log();
}

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const cmd = COMMANDS[command];
  if (!cmd) {
    log.err(`Comando desconhecido: "${command}"`);
    log.dim("Rode com 'help' pra ver lista.");
    process.exit(1);
  }

  try {
    await cmd.fn(rest);
  } catch (err) {
    log.err(`Erro: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(2);
  }
}

main();
