// ═══════════════════════════════════════════════════════════════════════
// taskflow restore — inverso de backup, DESTRUTIVO
// ═══════════════════════════════════════════════════════════════════════
// Le um diretorio de backup (formato produzido por `taskflow backup`):
//   <dir>/
//     manifest.json       — metadata + sha256 de cada componente
//     database.sql.gz     — dump Postgres comprimido
//     storage.tar.gz      — snapshot do volume de storage (se havia)
//
// Aplica no instance atual:
//   - DB: psql -v ON_ERROR_STOP=1 com o SQL gunziped (o dump ja tem
//     `DROP ... IF EXISTS`, entao a limpeza eh feita pelo proprio SQL)
//   - Storage: limpa o volume e extrai o tar em cima
//
// Requer --yes pra confirmar, padrao igual user:delete.
//
// Uso:
//   node --env-file=.env.local scripts/cli.mjs restore --from ./backups/xyz --yes
// ═══════════════════════════════════════════════════════════════════════

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

import { log, parseArgs, requireArgs } from "./lib.mjs";
import {
  ensureDocker,
  containerHealth,
  volumeExists,
  dockerExec,
  waitForClose,
  run,
} from "./docker.mjs";

const DEFAULTS = {
  composeFile: "docker/docker-compose.solo.yml",
  postgresContainer: "taskflow-postgres",
  storageVolume: "taskflow-storage-data",
  alpineImage: "alpine:3.19",
};

const SUPPORTED_MANIFEST_VERSIONS = new Set([1]);

export async function restore(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    return;
  }

  requireArgs(args, ["from"]);

  const composeFile = args["compose-file"] ?? DEFAULTS.composeFile;
  const postgresContainer = args["postgres-container"] ?? DEFAULTS.postgresContainer;
  const storageVolume = args["storage-volume"] ?? DEFAULTS.storageVolume;

  const dbOnly = args["db-only"] === true;
  const storageOnly = args["storage-only"] === true;
  if (dbOnly && storageOnly) {
    log.err("Flags --db-only e --storage-only sao mutuamente exclusivas.");
    process.exit(1);
  }

  const fromDir = path.resolve(args.from);
  const manifestPath = path.join(fromDir, "manifest.json");

  // ───── Valida manifest ─────
  let manifest;
  try {
    const raw = await readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw);
  } catch (err) {
    log.err(`Nao consegui ler ${manifestPath}: ${err.message}`);
    process.exit(2);
  }

  if (!SUPPORTED_MANIFEST_VERSIONS.has(manifest.version)) {
    log.err(`Versao de manifest ${manifest.version} nao suportada por este CLI.`);
    log.dim(`  Versoes suportadas: ${[...SUPPORTED_MANIFEST_VERSIONS].join(", ")}`);
    process.exit(2);
  }

  const hasDb = !!manifest.components?.database;
  const hasStorage = !!manifest.components?.storage;

  if (dbOnly && !hasDb) {
    log.err("Backup nao contem componente 'database' (--db-only especificado).");
    process.exit(2);
  }
  if (storageOnly && !hasStorage) {
    log.err("Backup nao contem componente 'storage' (--storage-only especificado).");
    process.exit(2);
  }

  const applyDb = hasDb && !storageOnly;
  const applyStorage = hasStorage && !dbOnly;

  // ───── Valida sha256 ─────
  log.info("Validando sha256 dos componentes...");
  if (applyDb) {
    await verifyHash(path.join(fromDir, manifest.components.database.file), manifest.components.database.sha256, "database");
  }
  if (applyStorage) {
    await verifyHash(path.join(fromDir, manifest.components.storage.file), manifest.components.storage.sha256, "storage");
  }
  log.ok("  hashes OK");
  log.dim("");

  // ───── Pre-flight Docker ─────
  await ensureDocker();

  if (applyDb) {
    let health;
    try {
      health = await containerHealth(postgresContainer);
    } catch (err) {
      log.err(err.message);
      process.exit(2);
    }
    if (health !== "healthy" && health !== "none") {
      log.err(`Container ${postgresContainer} nao esta saudavel (status: ${health}).`);
      process.exit(2);
    }
  }

  if (applyStorage) {
    const exists = await volumeExists(storageVolume);
    if (!exists) {
      log.warn(`Volume ${storageVolume} nao existe — sera criado na extracao.`);
      // docker run com -v <volume>:/storage cria o volume se nao existir.
    }
  }

  // ───── Confirmacao destrutiva ─────
  if (args.yes !== true) {
    log.warn("Isto e DESTRUTIVO. O restore vai sobrescrever:");
    if (applyDb) {
      log.warn(`  - Postgres db 'taskflow' (schemas public, storage, auth etc)`);
    }
    if (applyStorage) {
      log.warn(`  - Todo conteudo do volume ${storageVolume}`);
    }
    log.warn("");
    log.warn(`  Backup origem:  ${fromDir}`);
    log.warn(`  Criado em:      ${manifest.createdAt}`);
    log.warn("");
    log.warn("Re-execute com --yes pra confirmar.");
    process.exit(1);
  }

  const started = Date.now();

  // ───── Restore DB ─────
  if (applyDb) {
    log.info("Restore do Postgres (pode demorar alguns minutos)...");
    await restoreDatabase({
      postgresContainer,
      dumpFile: path.join(fromDir, manifest.components.database.file),
      password: process.env.POSTGRES_PASSWORD,
    });
    log.ok("  database restaurado");
  }

  // ───── Restore storage ─────
  if (applyStorage) {
    log.info("Restore do volume de storage...");
    await restoreStorage({
      volume: storageVolume,
      tarFile: path.join(fromDir, manifest.components.storage.file),
      alpineImage: DEFAULTS.alpineImage,
    });
    log.ok("  storage restaurado");
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log.dim("");
  log.ok(`Restore concluido em ${elapsed}s`);
  log.dim("");
  log.warn("Recomendado reiniciar o container app pra invalidar caches in-memory:");
  log.dim(`  docker restart taskflow-app`);
}

// ────────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────────

async function verifyHash(filePath, expectedHex, label) {
  try {
    await stat(filePath);
  } catch {
    throw new Error(`arquivo ${label} nao encontrado: ${filePath}`);
  }
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  const actual = hash.digest("hex");
  if (actual !== expectedHex) {
    log.err(`Hash de ${label} nao bate:`);
    log.err(`  esperado: ${expectedHex}`);
    log.err(`  atual:    ${actual}`);
    log.dim("  Backup corrompido ou adulterado. Abortando.");
    process.exit(2);
  }
}

// Pipe `gunzip(database.sql.gz) | psql ...`. Se o psql encontrar erro,
// `-v ON_ERROR_STOP=1` aborta com exit !=0 e stderr eh exposto.
async function restoreDatabase({ postgresContainer, dumpFile, password }) {
  const env = {};
  if (password) env.PGPASSWORD = password;

  const proc = dockerExec(postgresContainer, [
    "psql",
    "-U", "postgres",
    "-d", "taskflow",
    "-v", "ON_ERROR_STOP=1",
    "--quiet",
  ], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const gunzip = createGunzip();
  const input = createReadStream(dumpFile);

  await Promise.all([
    pipeline(input, gunzip, proc.stdin),
    waitForClose(proc, "psql"),
  ]);
}

// Limpa o volume e extrai o tar em cima. Um unico container alpine faz
// os dois passos pra manter atomicidade na visao do host.
async function restoreStorage({ volume, tarFile, alpineImage }) {
  const absDir = path.dirname(path.resolve(tarFile));
  const name = path.basename(tarFile);

  const { code, stderr } = await run("docker", [
    "run", "--rm",
    "-v", `${volume}:/storage`,
    "-v", `${absDir}:/in:ro`,
    alpineImage,
    "sh", "-c",
    `find /storage -mindepth 1 -delete && tar -xzf /in/${name} -C /storage`,
  ]);
  if (code !== 0) {
    throw new Error(`restore storage falhou (exit ${code}): ${stderr.trim() || "(sem stderr)"}`);
  }
}

function showHelp() {
  console.log();
  console.log("  taskflow restore — restaura Postgres + storage a partir de backup");
  console.log();
  console.log("  Uso:");
  console.log("    node --env-file=.env.local scripts/cli.mjs restore --from <dir> [flags]");
  console.log();
  console.log("  Flags:");
  console.log("    --from <dir>                Diretorio com manifest.json (obrigatorio)");
  console.log("    --yes                       Pula confirmacao destrutiva");
  console.log("    --db-only                   Restaura so DB");
  console.log("    --storage-only              Restaura so storage");
  console.log("    --compose-file <path>       default: docker/docker-compose.solo.yml");
  console.log("    --postgres-container <name> default: taskflow-postgres");
  console.log("    --storage-volume <name>     default: taskflow-storage-data");
  console.log();
  console.log("  AVISO: operacao destrutiva. Vai sobrescrever DB e volume de storage.");
  console.log();
}
