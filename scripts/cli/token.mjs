// ═══════════════════════════════════════════════════════════════════════
// taskflow token:rotate — rotaciona JWT_SECRET e/ou ENCRYPTION_KEY
// ═══════════════════════════════════════════════════════════════════════
// Sem este comando, rotacionar um secret que vazou seria destrutivo:
//   - Trocar JWT_SECRET a mao invalida sessoes mas tambem deixa ANON_KEY
//     e SERVICE_ROLE_KEY incompativeis (sao JWTs assinados com ele).
//   - Trocar ENCRYPTION_KEY a mao torna github_tokens.encrypted_token
//     irrecuperavel.
//
// Este CLI faz a transicao segura:
//
//   --encryption  Re-encripta github_tokens.encrypted_token com key nova.
//                 Para o container app durante a transacao pra evitar
//                 race com escritas concorrentes. Rollback automatico se
//                 qualquer row falhar (ON_ERROR_STOP=1). Backup prévio do
//                 DB eh responsabilidade do admin (rode `cli.mjs backup`).
//
//   --jwt         Gera novo JWT_SECRET, re-emite NEXT_PUBLIC_SUPABASE_
//                 ANON_KEY e SUPABASE_SERVICE_ROLE_KEY assinados com ele.
//                 NAO rebuilda a imagem app (leva 3-5min) — imprime os
//                 comandos pro admin rodar. Todas as sessoes ativas viram
//                 invalidas; relogin forcado eh inevitavel (GoTrue nao
//                 tem endpoint de re-sign).
//
//   --all         Ambos. --encryption primeiro, depois --jwt.
//
// Uso:
//   node --env-file=.env.local scripts/cli.mjs token:rotate --encryption --yes
//   node --env-file=.env.local scripts/cli.mjs token:rotate --jwt --yes
//   node --env-file=.env.local scripts/cli.mjs token:rotate --all --yes
// ═══════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";

import { log, parseArgs } from "./lib.mjs";
import {
  ensureDocker,
  containerHealth,
  dockerExec,
  waitForClose,
  run,
} from "./docker.mjs";
import { rand, signJwt, aesGcmDecrypt, aesGcmEncrypt } from "./crypto.mjs";

const DEFAULTS = {
  composeFile: "docker/docker-compose.solo.yml",
  postgresContainer: "taskflow-postgres",
  appContainer: "taskflow-app",
  envFile: ".env.local",
};

export async function tokenRotate(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    return;
  }

  const doJwt = args.jwt === true || args.all === true;
  const doEnc = args.encryption === true || args.all === true;
  if (!doJwt && !doEnc) {
    showHelp();
    log.err("Pass --jwt, --encryption, ou --all.");
    process.exit(1);
  }

  const envFile = args["env-file"] ?? DEFAULTS.envFile;
  const composeFile = args["compose-file"] ?? DEFAULTS.composeFile;
  const postgresContainer = args["postgres-container"] ?? DEFAULTS.postgresContainer;
  const appContainer = args["app-container"] ?? DEFAULTS.appContainer;

  // ───── Read env ─────
  const envPath = path.resolve(envFile);
  if (!fs.existsSync(envPath)) {
    log.err(`arquivo env nao encontrado: ${envPath}`);
    process.exit(2);
  }
  const envText = fs.readFileSync(envPath, "utf8");
  const envMap = parseEnv(envText);

  // ───── Pre-flight ─────
  await ensureDocker();
  let pgHealth;
  try {
    pgHealth = await containerHealth(postgresContainer);
  } catch (err) {
    log.err(err.message);
    process.exit(2);
  }
  if (pgHealth !== "healthy" && pgHealth !== "none") {
    log.err(`container ${postgresContainer} nao saudavel (${pgHealth})`);
    process.exit(2);
  }

  // ───── Confirmacao destrutiva ─────
  if (args.yes !== true) {
    log.warn("token:rotate e DESTRUTIVO. O que acontece:");
    if (doEnc) {
      log.warn("  --encryption:");
      log.warn("    - re-encripta todos github_tokens.encrypted_token");
      log.warn(`    - container ${appContainer} e parado durante a transacao (~30s)`);
      log.warn("    - backup recomendado: rode 'scripts/cli.mjs backup' antes");
    }
    if (doJwt) {
      log.warn("  --jwt:");
      log.warn("    - todas as sessoes ativas serao invalidadas (relogin forcado)");
      log.warn("    - imagem app precisa de rebuild (ANON + SERVICE_ROLE sao build args)");
      log.warn("    - signed URLs em voo do local-disk ficam invalidas");
    }
    log.warn("");
    log.warn("Re-execute com --yes pra confirmar.");
    process.exit(1);
  }

  // ───── Backup do env ─────
  const backupPath = `${envPath}.bak.${timestamp()}`;
  fs.writeFileSync(backupPath, envText, "utf8");
  log.ok(`backup do env: ${backupPath}`);

  // ───── Execucao ─────
  // --encryption primeiro: precisa do app rodavel antes do --jwt mudar tudo.
  // Na pratica sao independentes, mas ordenar eh mais claro.
  if (doEnc) {
    await rotateEncryption({ envMap, envPath, postgresContainer, appContainer });
  }
  if (doJwt) {
    await rotateJwt({ envMap, envPath, composeFile, envFile });
  }

  log.dim("");
  log.ok("token:rotate concluido.");
}

// ────────────────────────────────────────────────────────────────────────
// --encryption
// ────────────────────────────────────────────────────────────────────────

async function rotateEncryption({ envMap, envPath, postgresContainer, appContainer }) {
  const oldKey = envMap.ENCRYPTION_KEY;
  if (!oldKey || !/^[0-9a-f]{64}$/i.test(oldKey)) {
    throw new Error("ENCRYPTION_KEY no env invalida (esperado 64 hex chars)");
  }

  log.info("rotacionando ENCRYPTION_KEY...");

  // Conta rows alvo antes de parar o app
  const rowCount = await countEncryptedRows(postgresContainer);
  log.dim(`  ${rowCount} tokens a re-encriptar`);

  if (rowCount === 0) {
    // Ainda assim gera key nova — garante que um cenario "zero tokens
    // agora" nao deixe a key velha em uso depois de uma suspeita de vazamento.
    const newKey = rand(32);
    rewriteEnv(envPath, { ENCRYPTION_KEY: newKey });
    envMap.ENCRYPTION_KEY = newKey;
    log.ok("  ENCRYPTION_KEY rotacionada (zero tokens afetados).");
    return;
  }

  // Para o app pra evitar race: enquanto a gente le+escreve com key velha,
  // o app poderia estar escrevendo com a mesma key mas iria depois usar a
  // nova — primeira leitura seguinte falharia decrypt.
  log.info(`parando ${appContainer}...`);
  await run("docker", ["stop", appContainer]);

  let txSucceeded = false;
  try {
    // Le todas as rows (user_id | encrypted_token)
    const rows = await readEncryptedRows(postgresContainer);
    if (rows.length !== rowCount) {
      throw new Error(`row count mismatch: pre-count ${rowCount}, lido ${rows.length}`);
    }

    // Gera nova key
    const newKey = rand(32);

    // Constroi transacao com UPDATEs atomicos
    let sql = "BEGIN;\n";
    for (const { userId, encryptedToken } of rows) {
      const plain = aesGcmDecrypt(encryptedToken, oldKey);
      const reEncrypted = aesGcmEncrypt(plain, newKey);
      // user_id eh UUID, seguro. encrypted_token eh base64 (safe). Ainda
      // assim fazemos double-single-quote defensive.
      const safeUserId = userId.replace(/'/g, "''");
      const safeToken = reEncrypted.replace(/'/g, "''");
      sql += `UPDATE github_tokens SET encrypted_token='${safeToken}' WHERE user_id='${safeUserId}';\n`;
    }
    sql += "COMMIT;\n";

    // Executa transacao via stdin do psql (ON_ERROR_STOP aborta no 1o erro)
    await execPsqlScript(postgresContainer, sql);

    // So reescreve o env depois do COMMIT OK
    rewriteEnv(envPath, { ENCRYPTION_KEY: newKey });
    envMap.ENCRYPTION_KEY = newKey;
    txSucceeded = true;

    log.ok(`  transacao commited (${rows.length} rows)`);
  } finally {
    // Sempre tenta restart, mesmo em falha — evita deixar app caido.
    log.info(`iniciando ${appContainer}...`);
    try {
      await run("docker", ["start", appContainer]);
    } catch (err) {
      log.err(`falha ao iniciar ${appContainer}: ${err.message}`);
    }
  }

  if (!txSucceeded) {
    throw new Error("transacao de rotacao abortada — env NAO foi alterado");
  }

  log.ok("ENCRYPTION_KEY rotacionada.");
}

async function countEncryptedRows(postgresContainer) {
  const proc = dockerExec(postgresContainer, [
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", "SELECT COUNT(*) FROM github_tokens WHERE encrypted_token IS NOT NULL;",
  ]);
  const out = await collectStdout(proc, "psql count");
  return parseInt(out.trim(), 10) || 0;
}

async function readEncryptedRows(postgresContainer) {
  const proc = dockerExec(postgresContainer, [
    "psql", "-U", "postgres", "-d", "taskflow",
    "-tAc", "SELECT user_id || '\u0001' || encrypted_token FROM github_tokens WHERE encrypted_token IS NOT NULL;",
  ]);
  const out = await collectStdout(proc, "psql select");
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // Separador \x01 evita colisao com o | que psql usa como col sep
      const idx = line.indexOf("\u0001");
      if (idx < 0) throw new Error(`linha mal-formada do psql: ${line.slice(0, 40)}...`);
      return {
        userId: line.slice(0, idx),
        encryptedToken: line.slice(idx + 1),
      };
    });
}

async function execPsqlScript(postgresContainer, sql) {
  const proc = dockerExec(postgresContainer, [
    "psql", "-U", "postgres", "-d", "taskflow",
    "-v", "ON_ERROR_STOP=1", "--quiet",
  ], { stdio: ["pipe", "pipe", "pipe"] });
  proc.stdin.write(sql);
  proc.stdin.end();
  await waitForClose(proc, "psql transaction");
}

// ────────────────────────────────────────────────────────────────────────
// --jwt
// ────────────────────────────────────────────────────────────────────────

async function rotateJwt({ envMap, envPath, composeFile, envFile }) {
  if (!envMap.JWT_SECRET) {
    throw new Error("JWT_SECRET ausente no env");
  }

  log.info("rotacionando JWT_SECRET...");

  const newJwt = rand(32);
  const newAnon = signJwt("anon", newJwt);
  const newServiceRole = signJwt("service_role", newJwt);

  rewriteEnv(envPath, {
    JWT_SECRET: newJwt,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: newAnon,
    SUPABASE_SERVICE_ROLE_KEY: newServiceRole,
  });
  envMap.JWT_SECRET = newJwt;
  envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY = newAnon;
  envMap.SUPABASE_SERVICE_ROLE_KEY = newServiceRole;

  log.ok("  JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY re-emitidos.");
  log.dim("");
  log.warn("Pra APLICAR a rotacao, rode:");
  log.dim(`  docker compose -f ${composeFile} --env-file ${envFile} build app`);
  log.dim(`  docker compose -f ${composeFile} --env-file ${envFile} up -d --force-recreate`);
  log.warn("Usuarios vao precisar fazer login novamente.");
}

// ────────────────────────────────────────────────────────────────────────
// env parsing / rewriting
// ────────────────────────────────────────────────────────────────────────

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

// Reescreve o arquivo preservando comentarios, linhas em branco e ordem.
// Substitui SOMENTE as keys em `replacements`. Atomico: escreve em tmp
// e rename.
function rewriteEnv(envPath, replacements) {
  const text = fs.readFileSync(envPath, "utf8");
  const out = text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) return line;
      const [, key] = m;
      if (key in replacements) return `${key}=${replacements[key]}`;
      return line;
    })
    .join("\n");
  const tmp = `${envPath}.new`;
  fs.writeFileSync(tmp, out, "utf8");
  fs.renameSync(tmp, envPath);
}

// ────────────────────────────────────────────────────────────────────────
// Misc
// ────────────────────────────────────────────────────────────────────────

async function collectStdout(proc, label) {
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d) => (stdout += d.toString()));
  proc.stderr.on("data", (d) => (stderr += d.toString()));
  await new Promise((resolve, reject) => {
    proc.once("error", (err) => reject(new Error(`${label}: ${err.message}`)));
    proc.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} saiu ${code}: ${stderr.trim()}`));
    });
  });
  return stdout;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function showHelp() {
  console.log();
  console.log("  taskflow token:rotate — rotaciona JWT_SECRET e/ou ENCRYPTION_KEY");
  console.log();
  console.log("  Uso:");
  console.log("    node --env-file=.env.local scripts/cli.mjs token:rotate [flags]");
  console.log();
  console.log("  Flags (pelo menos uma de --jwt/--encryption/--all):");
  console.log("    --encryption                Rotaciona ENCRYPTION_KEY + re-encripta github_tokens");
  console.log("    --jwt                       Rotaciona JWT_SECRET + re-emite ANON + SERVICE_ROLE");
  console.log("    --all                       Ambos (--encryption primeiro, depois --jwt)");
  console.log("    --yes                       Pula confirmacao destrutiva");
  console.log();
  console.log("  Flags adicionais (override do default solo):");
  console.log("    --env-file <path>           default: .env.local");
  console.log("    --compose-file <path>       default: docker/docker-compose.solo.yml");
  console.log("    --postgres-container <name> default: taskflow-postgres");
  console.log("    --app-container <name>      default: taskflow-app");
  console.log();
  console.log("  AVISO: operacao destrutiva. Backup recomendado antes (cli.mjs backup).");
  console.log();
}
