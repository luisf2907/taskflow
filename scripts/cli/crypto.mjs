// ═══════════════════════════════════════════════════════════════════════
// CLI lib — crypto helpers (Node puro, reimplementa src/lib/crypto.ts
// e scripts/gen-secrets.mjs num unico lugar)
// ═══════════════════════════════════════════════════════════════════════
// Usado pelo subcomando `token:rotate`. Node puro porque o CLI (.mjs)
// nao carrega TypeScript, e queremos zero dependencia externa.
//
// IMPORTANTE — formato AES-GCM compat com src/lib/crypto.ts:
//   base64( iv[12 bytes] | ciphertext | tag[16 bytes] )
//
// Web Crypto API (subtle.encrypt) entrega `ciphertext+tag` concatenados
// no output. Em Node a gente usa `createCipheriv` que devolve ciphertext
// puro + `getAuthTag()` separado — precisamos remontar o mesmo layout
// pra ficar intercambiavel. Decrypt faz o caminho inverso.
// ═══════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// ───── Random hex ─────
export function rand(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

// ───── JWT HS256 (Supabase-style anon/service_role keys) ─────
// Espelha scripts/gen-secrets.mjs:28-46 — manter em sync se aquele mudar.
export function signJwt(role, secret) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      role,
      iss: "supabase-local",
      iat: now,
      exp: now + 315_360_000, // 10 anos
    }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

// ───── AES-256-GCM encrypt ─────
// plaintext: string (UTF-8)
// keyHex: 64 hex chars (32 bytes)
// retorna: base64 string no formato iv|ciphertext|tag
export function aesGcmEncrypt(plaintext, keyHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("keyHex deve ter 64 caracteres hex (32 bytes)");
  }
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

// ───── AES-256-GCM decrypt ─────
// base64str: formato produzido por aesGcmEncrypt ou src/lib/crypto.ts:encrypt
// keyHex: 64 hex chars
// Lanca se key errada / tag invalida / dados corrompidos.
export function aesGcmDecrypt(base64str, keyHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("keyHex deve ter 64 caracteres hex (32 bytes)");
  }
  const key = Buffer.from(keyHex, "hex");
  const combined = Buffer.from(base64str, "base64");
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error(`ciphertext muito curto (${combined.length} bytes)`);
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
