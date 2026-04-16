/**
 * Local-Disk driver — armazena em filesystem local.
 *
 * Usado no perfil solo do self-hosted. Arquivos vivem em
 * $STORAGE_LOCAL_PATH/<bucket>/<path> (default /app/storage/).
 *
 * URLs publicas apontam pra /api/storage/object/<bucket>/<path> —
 * servidas pelo proprio Next.js (zero dependencia externa).
 *
 * Signed URLs usam HMAC-SHA256 com JWT_SECRET pra assinar:
 *   path + expiresAt + op ("r" download / "w" upload)
 * Token no formato: base64url(<payload>.<signature>)
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";

import type {
  SignedUploadResult,
  StorageDriver,
  StorageStream,
  UploadOptions,
  UploadResult,
} from "./types";

export class LocalDiskStorageDriver implements StorageDriver {
  private readonly rootDir: string;
  private readonly publicUrlBase: string;
  private readonly hmacSecret: string;

  constructor() {
    this.rootDir = process.env.STORAGE_LOCAL_PATH ?? "/app/storage";
    // URL publica é sempre relativa ao NEXT_PUBLIC_SITE_URL
    this.publicUrlBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    // HMAC secret: reusa JWT_SECRET pra nao exigir env extra.
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("LocalDiskStorage requer JWT_SECRET (usado como HMAC).");
    }
    this.hmacSecret = secret;
  }

  // ─────────────────────────────────────────────────────────────────
  async upload(
    bucket: string,
    filePath: string,
    data: Uint8Array | Buffer,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const absPath = this.resolve(bucket, filePath);

    // Seguranca: impede path traversal (../)
    this.assertSafePath(absPath, bucket);

    if (!options?.upsert && existsSync(absPath)) {
      throw new Error(`Arquivo ja existe: ${bucket}/${filePath}`);
    }

    await fs.mkdir(path.dirname(absPath), { recursive: true });
    // Buffer.from funciona tanto pra Buffer quanto pra Uint8Array
    await fs.writeFile(absPath, Buffer.from(data));

    // Content-type e preservado escrevendo um arquivo .meta irmao com JSON.
    // Simples e efetivo — storage SDK nao tem outro jeito no local-disk.
    if (options?.contentType) {
      await fs.writeFile(
        `${absPath}.meta.json`,
        JSON.stringify({ contentType: options.contentType }),
      );
    }

    return { path: filePath };
  }

  // ─────────────────────────────────────────────────────────────────
  async delete(bucket: string, filePath: string): Promise<void> {
    const absPath = this.resolve(bucket, filePath);
    this.assertSafePath(absPath, bucket);

    try {
      await fs.unlink(absPath);
      await fs.unlink(`${absPath}.meta.json`).catch(() => {});
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return; // idempotente
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  getPublicUrl(bucket: string, filePath: string): string {
    // URL relativa ao site — API route serve o arquivo.
    const base = this.publicUrlBase || "";
    return `${base}/api/storage/object/${bucket}/${encodeURI(filePath)}`;
  }

  // ─────────────────────────────────────────────────────────────────
  async createSignedDownloadUrl(
    bucket: string,
    filePath: string,
    expiresInSec: number,
  ): Promise<string> {
    const token = this.signToken(bucket, filePath, expiresInSec, "r");
    const base = this.publicUrlBase || "";
    return `${base}/api/storage/object/${bucket}/${encodeURI(filePath)}?token=${token}`;
  }

  // ─────────────────────────────────────────────────────────────────
  async createSignedUploadUrl(
    bucket: string,
    filePath: string,
    expiresInSec: number,
  ): Promise<SignedUploadResult> {
    const token = this.signToken(bucket, filePath, expiresInSec, "w");
    const base = this.publicUrlBase || "";
    const url = `${base}/api/storage/upload?bucket=${bucket}&path=${encodeURIComponent(filePath)}&token=${token}`;
    return { url, token, path: filePath };
  }

  // ─────────────────────────────────────────────────────────────────
  async getStream(bucket: string, filePath: string): Promise<StorageStream | null> {
    const absPath = this.resolve(bucket, filePath);
    this.assertSafePath(absPath, bucket);

    if (!existsSync(absPath)) return null;

    const stat = await fs.stat(absPath);
    let contentType: string | undefined;
    try {
      const meta = await fs.readFile(`${absPath}.meta.json`, "utf8");
      contentType = JSON.parse(meta).contentType;
    } catch {
      // Sem metadata.json — deixa undefined
    }

    const nodeStream = createReadStream(absPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return {
      stream: webStream,
      size: stat.size,
      contentType,
      lastModified: stat.mtime,
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // Token signing — HMAC SHA-256
  // ═════════════════════════════════════════════════════════════════

  /**
   * Gera token assinado. Formato: base64url(payload).base64url(sig)
   * Payload: { b: bucket, p: path, e: expiresAt_unix, o: "r"|"w" }
   */
  private signToken(bucket: string, filePath: string, expiresInSec: number, op: "r" | "w"): string {
    const payload = {
      b: bucket,
      p: filePath,
      e: Math.floor(Date.now() / 1000) + expiresInSec,
      o: op,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(payloadB64)
      .digest("base64url");
    return `${payloadB64}.${sig}`;
  }

  /**
   * Valida token. Retorna payload se ok, null se invalido/expirado/mismatch.
   * Usado pela API route /api/storage/* quando ha ?token=
   */
  verifyToken(
    token: string,
    expectedBucket: string,
    expectedPath: string,
    expectedOp: "r" | "w",
  ): boolean {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;

    const expectedSig = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(payloadB64)
      .digest("base64url");
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return false;
    }

    let payload: { b: string; p: string; e: number; o: string };
    try {
      payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    } catch {
      return false;
    }

    if (payload.b !== expectedBucket) return false;
    if (payload.p !== expectedPath) return false;
    if (payload.o !== expectedOp) return false;
    if (payload.e < Math.floor(Date.now() / 1000)) return false;

    return true;
  }

  // ═════════════════════════════════════════════════════════════════
  // Paths
  // ═════════════════════════════════════════════════════════════════

  private resolve(bucket: string, filePath: string): string {
    return path.join(this.rootDir, bucket, filePath);
  }

  /**
   * Bloqueia path traversal. absPath deve comecar com this.rootDir/bucket/
   * (sem nenhum "..") — se resolver pra fora, rejeita.
   */
  private assertSafePath(absPath: string, bucket: string): void {
    const bucketRoot = path.join(this.rootDir, bucket);
    const resolved = path.resolve(absPath);
    if (!resolved.startsWith(path.resolve(bucketRoot) + path.sep)) {
      throw new Error(`Path invalido (tentativa de traversal): ${absPath}`);
    }
  }
}
