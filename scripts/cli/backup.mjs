// ═══════════════════════════════════════════════════════════════════════
// taskflow backup — dump Postgres + snapshot do volume de storage
// ═══════════════════════════════════════════════════════════════════════
// Roda NO HOST (nao dentro do container app). Invoca:
//   - `docker compose exec -T postgres pg_dump ...` -> gzip -> arquivo
//   - `docker run --rm alpine tar -czf ...` no volume taskflow-storage-data
//
// Saida: diretorio com 3 arquivos (database.sql.gz, storage.tar.gz,
// manifest.json com sha256 de cada componente).
//
// Uso basico:
//   node --env-file=.env.local scripts/cli.mjs backup
//
// Exemplos avancados:
//   backup --out ./backups/pre-upgrade
//   backup --db-only
//   backup --storage-only --out ./backups/so-storage
//   backup --compose-file docker/docker-compose.team.yml \
//          --postgres-container taskflow-team-postgres \
//          --storage-volume taskflow-team-storage-data
// ═══════════════════════════════════════════════════════════════════════

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

import { log, parseArgs } from "./lib.mjs";
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

export async function backup(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    return;
  }

  const composeFile = args["compose-file"] ?? DEFAULTS.composeFile;
  const postgresContainer = args["postgres-container"] ?? DEFAULTS.postgresContainer;
  const storageVolume = args["storage-volume"] ?? DEFAULTS.storageVolume;

  const dbOnly = args["db-only"] === true;
  const storageOnly = args["storage-only"] === true;
  if (dbOnly && storageOnly) {
    log.err("Flags --db-only e --storage-only sao mutuamente exclusivas.");
    process.exit(1);
  }

  const outdir = path.resolve(args.out ?? path.join("backups", `taskflow-${timestamp()}`));

  log.info(`Backup -> ${outdir}`);
  log.dim(`  compose: ${composeFile}`);
  log.dim(`  postgres: ${postgresContainer}`);
  log.dim(`  storage volume: ${storageVolume}`);
  log.dim("");

  // ───── Pre-flight ─────
  await ensureDocker();

  const includeDb = !storageOnly;
  const includeStorage = !dbOnly;

  if (includeDb) {
    let health;
    try {
      health = await containerHealth(postgresContainer);
    } catch (err) {
      log.err(err.message);
      log.dim(`  Container ${postgresContainer} precisa estar up. Rode 'docker compose up -d' primeiro.`);
      process.exit(2);
    }
    if (health !== "healthy" && health !== "none") {
      log.err(`Container ${postgresContainer} nao esta saudavel (status: ${health}).`);
      log.dim("  Aguarde o healthcheck ficar verde ou reinicie a stack.");
      process.exit(2);
    }
  }

  const storageVolumePresent = includeStorage ? await volumeExists(storageVolume) : false;
  const storageDriver = process.env.STORAGE_DRIVER ?? "local-disk";
  if (includeStorage && !storageVolumePresent) {
    if (storageDriver === "local-disk") {
      log.warn(`Volume ${storageVolume} nao existe ainda. Nada a arquivar.`);
    } else {
      log.warn(`STORAGE_DRIVER=${storageDriver}: volume local nao se aplica. Pulando storage.`);
    }
  }

  // ───── Prep outdir ─────
  await mkdir(outdir, { recursive: true });

  const started = Date.now();
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    source: {
      composeFile,
      postgresContainer,
      storageVolume,
      storageDriver,
    },
    components: {},
  };

  // ───── DB dump ─────
  if (includeDb) {
    log.info("Dump do Postgres...");
    const dbFile = path.join(outdir, "database.sql.gz");
    await dumpDatabase({
      postgresContainer,
      outFile: dbFile,
      password: process.env.POSTGRES_PASSWORD,
    });
    const dbStat = await stat(dbFile);
    const dbHash = await sha256File(dbFile);
    manifest.components.database = {
      file: "database.sql.gz",
      sha256: dbHash,
      sizeBytes: dbStat.size,
    };
    log.ok(`  database.sql.gz  ${formatSize(dbStat.size)}  sha256=${dbHash.slice(0, 12)}...`);
  }

  // ───── Storage tar ─────
  if (includeStorage && storageVolumePresent) {
    log.info("Tar do volume de storage...");
    const storageFile = path.join(outdir, "storage.tar.gz");
    await tarStorage({
      volume: storageVolume,
      outFile: storageFile,
      alpineImage: DEFAULTS.alpineImage,
    });
    const stStat = await stat(storageFile);
    const stHash = await sha256File(storageFile);
    manifest.components.storage = {
      file: "storage.tar.gz",
      sha256: stHash,
      sizeBytes: stStat.size,
    };
    log.ok(`  storage.tar.gz   ${formatSize(stStat.size)}  sha256=${stHash.slice(0, 12)}...`);
  }

  // ───── Manifest ─────
  const manifestPath = path.join(outdir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log.ok(`  manifest.json`);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log.dim("");
  log.ok(`Backup concluido em ${elapsed}s`);
  log.dim(`  ${outdir}`);
}

// ────────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────────

// Dump o DB via `docker exec -i <container> pg_dump`, comprime em
// stream pro arquivo final. --clean --if-exists garante que o SQL ja
// traz `DROP ... IF EXISTS` pra cada objeto, simplificando o restore.
async function dumpDatabase({ postgresContainer, outFile, password }) {
  const env = {};
  if (password) env.PGPASSWORD = password;

  const proc = dockerExec(postgresContainer, [
    "pg_dump",
    "-U", "postgres",
    "-d", "taskflow",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--quote-all-identifiers",
  ], { env });

  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(outFile);

  // Em paralelo: pipeline do stream + espera processo fechar.
  // Se pg_dump sair com codigo !=0, waitForClose rejeita com stderr.
  await Promise.all([
    pipeline(proc.stdout, gzip, out),
    waitForClose(proc, "pg_dump"),
  ]);
}

// Tar o volume named usando um container alpine efemero. Monta:
//   - volume taskflow-storage-data em /storage (readonly)
//   - diretorio host onde vai sair o tar em /out (rw)
// Gera /out/<basename> dentro do container -> arquivo no host.
async function tarStorage({ volume, outFile, alpineImage }) {
  const absDir = path.dirname(path.resolve(outFile));
  const name = path.basename(outFile);

  const { code, stderr } = await run("docker", [
    "run", "--rm",
    "-v", `${volume}:/storage:ro`,
    "-v", `${absDir}:/out`,
    alpineImage,
    "tar", "-czf", `/out/${name}`, "-C", "/storage", ".",
  ]);
  if (code !== 0) {
    throw new Error(`tar storage falhou (exit ${code}): ${stderr.trim() || "(sem stderr)"}`);
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
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

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function showHelp() {
  console.log();
  console.log("  taskflow backup — dump Postgres + tar do volume de storage");
  console.log();
  console.log("  Uso:");
  console.log("    node --env-file=.env.local scripts/cli.mjs backup [flags]");
  console.log();
  console.log("  Flags:");
  console.log("    --out <dir>                 Destino (default: ./backups/taskflow-<timestamp>/)");
  console.log("    --db-only                   Pula storage");
  console.log("    --storage-only              Pula DB");
  console.log("    --compose-file <path>       default: docker/docker-compose.solo.yml");
  console.log("    --postgres-container <name> default: taskflow-postgres");
  console.log("    --storage-volume <name>     default: taskflow-storage-data");
  console.log();
  console.log("  Saida: <outdir>/{database.sql.gz, storage.tar.gz, manifest.json}");
  console.log();
}
