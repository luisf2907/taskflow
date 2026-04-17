// ═══════════════════════════════════════════════════════════════════════
// CLI lib — helpers pra invocar Docker / Compose via child_process
// ═══════════════════════════════════════════════════════════════════════
// Primeira (e unica, por ora) parte do CLI que chama `docker` no host. Os
// subcomandos de backup/restore rodam no HOST, nao dentro do container
// `app`, porque precisam alcancar tanto o container postgres quanto o
// volume named `taskflow-storage-data` e gravar o resultado num
// diretorio do filesystem local.
//
// Projeto pra reuso: `token:rotate`, `migrate:storage` etc. devem
// importar `run`, `compose`, `ensureDocker`, `containerHealth` daqui.
//
// Convencao de retorno:
//   - `run(cmd, args, opts)` sempre resolve (nao rejeita) com
//     `{ code, stdout, stderr }` — cabe ao chamador decidir se code !== 0
//     e' erro. Rejeita apenas se o processo nao pode ser spawned (ENOENT
//     em `docker` nao instalado, etc).
//   - `spawnRaw` expoe o ChildProcess diretamente pra quem precisa fazer
//     piping (backup do pg_dump faz stream -> gzip -> arquivo).
// ═══════════════════════════════════════════════════════════════════════

import { spawn } from "node:child_process";

// ───── spawn "raw" — retorna ChildProcess pra streaming ─────
// Use quando precisar `proc.stdout.pipe(...)`. Chame `waitForClose(proc)`
// depois pra capturar erros de exit non-zero.
export function spawnRaw(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
    ...opts,
  });
}

// ───── Aguarda close e consolida stderr pra mensagem de erro ─────
// Se stdio[2] === "pipe", consome stderr num buffer e inclui na msg de erro.
export function waitForClose(proc, label = "processo") {
  return new Promise((resolve, reject) => {
    let stderr = "";
    if (proc.stderr) proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.once("error", (err) => reject(new Error(`${label} falhou: ${err.message}`)));
    proc.once("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`${label} saiu com codigo ${code}: ${stderr.trim() || "(sem stderr)"}`));
    });
  });
}

// ───── run — modo buffer (pequenos comandos tipo `docker --version`) ─────
export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    if (proc.stdout) proc.stdout.on("data", (d) => (stdout += d.toString()));
    if (proc.stderr) proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.once("error", (err) => reject(new Error(`spawn ${cmd}: ${err.message}`)));
    proc.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

// ───── Garante que `docker` esta no PATH ─────
export async function ensureDocker() {
  try {
    const { code } = await run("docker", ["--version"]);
    if (code !== 0) throw new Error("docker --version retornou nao-zero");
  } catch (err) {
    throw new Error(`Docker nao encontrado no PATH: ${err.message}`);
  }
}

// ───── Checa health de um container ─────
// Retorna "healthy" | "unhealthy" | "starting" | "none" (sem healthcheck)
// Lanca se container nao existe.
export async function containerHealth(name) {
  const { code, stdout, stderr } = await run("docker", [
    "inspect",
    "--format={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
    name,
  ]);
  if (code !== 0) {
    throw new Error(`docker inspect ${name}: ${stderr.trim() || "container nao existe"}`);
  }
  return stdout.trim();
}

// ───── Checa se um volume named existe ─────
export async function volumeExists(name) {
  const { code } = await run("docker", ["volume", "inspect", name]);
  return code === 0;
}

// ───── Spawn `docker exec` com envs extras ─────
// Usado pra `docker exec -T <container> pg_dump ...`. Mais robusto que
// `docker compose exec`: trabalha com o nome do CONTAINER (nao do service)
// e nao depende do compose file estar certo. Passa env custom
// (PGPASSWORD etc) via -e inline.
export function dockerExec(container, execArgs, { env = {}, stdio } = {}) {
  const envFlags = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  return spawnRaw(
    "docker",
    ["exec", "-i", ...envFlags, container, ...execArgs],
    { stdio: stdio ?? ["ignore", "pipe", "pipe"] },
  );
}
