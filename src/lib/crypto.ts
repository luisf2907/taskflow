/**
 * AES-256-GCM encryption/decryption para dados sensíveis (GitHub tokens, etc.).
 *
 * Usa crypto.subtle do Node.js (Web Crypto API) — funciona em Edge e Node.
 * Key derivada de ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 *
 * Formato do ciphertext: base64(iv[12] + ciphertext + tag[16])
 * O IV é gerado aleatoriamente a cada encrypt — nunca reutilizado.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits (recomendado pelo NIST para AES-GCM)

let cachedKey: CryptoKey | null = null;

function getKeyHex(): string | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return hex;
}

async function getKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;

  const hex = getKeyHex();
  if (!hex) return null;

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

/**
 * Encripta um plaintext string. Retorna base64 string ou null se ENCRYPTION_KEY
 * não estiver configurada.
 */
export async function encrypt(plaintext: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combinar iv + ciphertext num único buffer
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  // Retornar como base64
  return Buffer.from(combined).toString("base64");
}

/**
 * Decripta uma string encriptada com encrypt(). Retorna plaintext ou null se
 * falhar (key errada, dados corrompidos, etc.)
 */
export async function decrypt(encrypted: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;

  try {
    const combined = Buffer.from(encrypted, "base64");
    if (combined.length < IV_LENGTH + 1) return null;

    const iv = combined.subarray(0, IV_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/** Retorna true se a ENCRYPTION_KEY está configurada. */
export function isEncryptionConfigured(): boolean {
  return getKeyHex() !== null;
}
