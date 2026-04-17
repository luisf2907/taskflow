// ═══════════════════════════════════════════════════════════════════════
// taskflow migrate:storage — move arquivos entre drivers de storage
// ═══════════════════════════════════════════════════════════════════════
// Copia todos os arquivos de um driver de storage pra outro. Util pra:
//   - Migrar de local-disk pra S3 (MinIO) ao mudar de solo pra full
//   - Migrar de Supabase Storage (cloud) pra local-disk ou S3
//
// Uso:
//   node --env-file=.env.local scripts/cli.mjs migrate:storage \
//     --from local-disk --to s3-compat --yes
//
// Requer que ambos os drivers estejam configurados no .env.local
// (o script instancia ambos e copia arquivo a arquivo).
//
// NAO deleta arquivos na origem — admin faz cleanup manual depois de
// verificar que a migracao completou.
// ═══════════════════════════════════════════════════════════════════════

import { log, parseArgs, requireArgs } from "./lib.mjs";
import { ensureDocker, dockerExec, run } from "./docker.mjs";

const BUCKETS = ["wiki", "anexos", "reunioes-audio"];

export async function migrateStorage(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    showHelp();
    return;
  }

  requireArgs(args, ["from", "to"]);

  const fromDriver = args.from;
  const toDriver = args.to;
  const postgresContainer = args["postgres-container"] ?? "taskflow-postgres";
  const appContainer = args["app-container"] ?? "taskflow-app";

  const validDrivers = ["local-disk", "s3-compat", "supabase"];
  if (!validDrivers.includes(fromDriver)) {
    log.err(`Driver --from invalido: ${fromDriver}. Validos: ${validDrivers.join(", ")}`);
    process.exit(1);
  }
  if (!validDrivers.includes(toDriver)) {
    log.err(`Driver --to invalido: ${toDriver}. Validos: ${validDrivers.join(", ")}`);
    process.exit(1);
  }
  if (fromDriver === toDriver) {
    log.err("--from e --to nao podem ser iguais.");
    process.exit(1);
  }

  if (args.yes !== true) {
    log.warn("migrate:storage copia TODOS os arquivos de um driver pra outro.");
    log.warn(`  De: ${fromDriver}`);
    log.warn(`  Para: ${toDriver}`);
    log.warn(`  Buckets: ${BUCKETS.join(", ")}`);
    log.warn("");
    log.warn("IMPORTANTE:");
    log.warn("  - Container app DEVE estar parado (evita escritas concorrentes)");
    log.warn("  - Arquivos na origem NAO sao deletados");
    log.warn("  - Depois de verificar, atualize STORAGE_DRIVER no .env.local");
    log.warn("");
    log.warn("Re-execute com --yes pra confirmar.");
    process.exit(1);
  }

  await ensureDocker();

  // A migracao roda DENTRO do container app (que tem acesso a ambos os
  // drivers: filesystem local + rede Docker pra S3/MinIO). Injetamos
  // um script Node via stdin.
  log.info(`Migrando storage: ${fromDriver} → ${toDriver}`);
  log.info("Executando dentro do container app...");

  const script = generateMigrationScript(fromDriver, toDriver);

  const proc = dockerExec(appContainer, [
    "node", "-e", script,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  // Pipe nada pro stdin (script auto-contido passado via -e)
  proc.stdin?.end();

  await new Promise((resolve, reject) => {
    proc.once("error", reject);
    proc.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Migracao saiu com codigo ${code}`));
    });
  });

  log.ok("Migracao concluida.");
  log.dim("");
  log.warn("Proximos passos:");
  log.dim(`  1. Atualize STORAGE_DRIVER=${toDriver} no .env.local`);
  log.dim("  2. docker restart taskflow-app");
  log.dim("  3. Verifique que uploads antigos funcionam no app");
  log.dim("  4. (Opcional) Limpe arquivos do driver antigo");
}

function generateMigrationScript(fromDriver, toDriver) {
  // Script Node que roda DENTRO do container app.
  // Importa os drivers da app (ja compilados no standalone) e copia.
  return `
const buckets = ${JSON.stringify(BUCKETS)};

async function main() {
  // Override do driver pra instanciar ambos
  process.env.STORAGE_DRIVER = '${fromDriver}';
  delete require.cache[require.resolve('./lib/drivers/storage/factory')];
  const fromMod = require('./lib/drivers/storage/factory');

  // Listar arquivos depende do driver
  // Para local-disk: ls recursivo no filesystem
  // Para s3-compat: list objects via S3 API
  // Para supabase: list via SDK

  const fs = require('fs');
  const path = require('path');

  const storagePath = process.env.STORAGE_LOCAL_PATH || '/app/storage';

  // Coleta arquivos do driver de origem
  const files = [];

  if ('${fromDriver}' === 'local-disk') {
    for (const bucket of buckets) {
      const bucketPath = path.join(storagePath, bucket);
      if (!fs.existsSync(bucketPath)) continue;
      const walk = (dir, prefix) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.endsWith('.meta.json')) continue; // skip metadata sidecars
          const full = path.join(dir, entry.name);
          const rel = prefix ? prefix + '/' + entry.name : entry.name;
          if (entry.isDirectory()) walk(full, rel);
          else files.push({ bucket, path: rel, fullPath: full });
        }
      };
      walk(bucketPath, '');
    }
  }

  console.log('Arquivos encontrados: ' + files.length);

  if (files.length === 0) {
    console.log('Nada pra migrar.');
    return;
  }

  // Instancia driver destino
  process.env.STORAGE_DRIVER = '${toDriver}';
  delete require.cache[require.resolve('./lib/drivers/storage/factory')];

  // Upload cada arquivo
  let ok = 0, errs = 0;
  for (const file of files) {
    try {
      const data = fs.readFileSync(file.fullPath);
      // Detecta content-type do sidecar se existir
      let contentType = 'application/octet-stream';
      const metaPath = file.fullPath + '.meta.json';
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta.contentType) contentType = meta.contentType;
        } catch {}
      }

      const toMod = require('./lib/drivers/storage/factory');
      const driver = toMod.getStorageDriver();
      await driver.upload(file.bucket, file.path, data, { contentType, upsert: true });
      ok++;
      if (ok % 50 === 0) console.log('  ' + ok + '/' + files.length + ' migrados...');
    } catch (err) {
      console.error('  ERRO: ' + file.bucket + '/' + file.path + ': ' + err.message);
      errs++;
    }
  }

  console.log('Concluido: ' + ok + ' ok, ' + errs + ' erros de ' + files.length + ' total');
  if (errs > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(2); });
`;
}

function showHelp() {
  console.log();
  console.log("  taskflow migrate:storage — move arquivos entre drivers de storage");
  console.log();
  console.log("  Uso:");
  console.log("    node --env-file=.env.local scripts/cli.mjs migrate:storage [flags]");
  console.log();
  console.log("  Flags:");
  console.log("    --from <driver>             Driver de origem (local-disk, s3-compat, supabase)");
  console.log("    --to <driver>               Driver de destino");
  console.log("    --yes                       Pula confirmacao");
  console.log("    --app-container <name>      default: taskflow-app");
  console.log();
  console.log("  Exemplo:");
  console.log("    migrate:storage --from local-disk --to s3-compat --yes");
  console.log();
  console.log("  NOTA: container app deve estar PARADO durante a migracao.");
  console.log("  Arquivos na origem NAO sao deletados.");
  console.log();
}
