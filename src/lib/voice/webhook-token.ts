/**
 * HMAC-SHA256 tokens para autenticar o webhook do worker de voz.
 *
 * Fluxo:
 *   1. Next.js gera `token = hmac(secret, reuniao_id)` e envia pro worker
 *   2. Worker processa e chama o callback Next.js com `Authorization: Bearer <token>`
 *   3. Next.js recalcula o token pra aquela reuniao_id e compara em
 *      constant-time. Se bater, o worker tem permissao pra escrever o
 *      resultado daquela reuniao especifica (e so daquela).
 *
 * Stateless — nao precisa coluna no banco.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";

export class WebhookSecretNotConfiguredError extends Error {
  constructor() {
    super("VOICE_WEBHOOK_SECRET ausente em .env.local");
    this.name = "WebhookSecretNotConfiguredError";
  }
}

function requireSecret(): string {
  const env = getServerEnv();
  if (!env.VOICE_WEBHOOK_SECRET) {
    throw new WebhookSecretNotConfiguredError();
  }
  return env.VOICE_WEBHOOK_SECRET;
}

/** Gera o token HMAC que o worker deve ecoar no callback. */
export function signReuniaoToken(reuniaoId: string): string {
  const secret = requireSecret();
  return createHmac("sha256", secret).update(reuniaoId).digest("hex");
}

/** Valida um token recebido no header Authorization contra o reuniao_id. */
export function verifyReuniaoToken(
  reuniaoId: string,
  providedToken: string,
): boolean {
  let expected: string;
  try {
    expected = signReuniaoToken(reuniaoId);
  } catch {
    return false;
  }

  // timingSafeEqual exige buffers do mesmo tamanho
  const expectedBuf = Buffer.from(expected, "hex");
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(providedToken, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/** Extrai o token do header `Authorization: Bearer <token>`. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return null;
  return authHeader.slice(prefix.length).trim() || null;
}
