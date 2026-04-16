/**
 * Helper de conexao Postgres pra LISTEN/NOTIFY.
 *
 * Cria UMA conexao postgres por SSE client. Cada subscriber do endpoint
 * /api/realtime/* abre sua propria. Simples e suficiente pro perfil solo/
 * team. Pra escala real (perfil full), pode-se migrar pra um hub pubsub
 * interno com uma conexao compartilhada.
 */

import postgres from "postgres";

import { getServerEnv } from "@/lib/env";

/**
 * Monta DATABASE_URL a partir das envs existentes.
 * Em self-hosted: postgres://postgres:<PASSWORD>@postgres:5432/taskflow
 * Em cloud: pode-se usar DATABASE_URL direto se o operador setar, mas o
 * container gotrue/postgrest ja tem isso embutido — aqui a gente assume
 * POSTGRES_PASSWORD + convencoes do compose.
 */
function getDatabaseUrl(): string {
  // Permite override explicito (util pra cloud que setou DATABASE_URL)
  const explicit = process.env.DATABASE_URL;
  if (explicit) return explicit;

  const password = process.env.POSTGRES_PASSWORD;
  if (!password) {
    throw new Error(
      "pg-listen requer DATABASE_URL ou POSTGRES_PASSWORD no ambiente.",
    );
  }

  // Defaults matchando docker-compose.solo.yml
  const host = process.env.POSTGRES_HOST ?? "postgres";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const user = process.env.POSTGRES_USER ?? "postgres";
  const db = process.env.POSTGRES_DB ?? "taskflow";

  return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

export interface ListenerHandle {
  unlisten(): Promise<void>;
}

/**
 * Abre uma conexao postgres, executa LISTEN no canal especificado, e
 * registra um callback pra cada notify. Retorna handle com .unlisten()
 * que fecha tudo.
 */
export async function listenOnChannel(
  channel: string,
  onNotify: (payload: string) => void,
): Promise<ListenerHandle> {
  // Valida env (throws se missing)
  getServerEnv();

  const url = getDatabaseUrl();

  // postgres.js configuration:
  // - max: 1 (este client e dedicado a LISTEN, nao precisa pool)
  // - idle_timeout: 0 (nao fecha idle — precisamos ficar listening)
  // - connect_timeout: 10s
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
  });

  const listener = await sql.listen(channel, onNotify);

  return {
    async unlisten() {
      try {
        await listener.unlisten();
      } catch {
        // ignora
      }
      try {
        await sql.end({ timeout: 2 });
      } catch {
        // ignora — conexao ja pode estar fechada
      }
    },
  };
}
