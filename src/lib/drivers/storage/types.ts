/**
 * Driver de Storage — contrato server-side.
 *
 * Impls: supabase (cloud default), local-disk (self-hosted), s3-compat
 * (futuro). Todas rodam no Node.js — client chama via fetch nos
 * endpoints /api/storage/*, que delegam pro driver.
 *
 * Cada bucket tem config propria no self-hosted:
 *   - wiki:            publico, 5MB, imagens
 *   - anexos:          publico, 50MB, any MIME
 *   - reunioes-audio:  privado (signed URLs), 50MB, audio/video
 */

export interface StorageDriver {
  /**
   * Upload de arquivo. O path pode incluir diretorios (serao criados).
   * Retorna o path final (igual ao input, mas driver pode normalizar).
   */
  upload(
    bucket: string,
    path: string,
    data: Uint8Array | Buffer,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Deleta arquivo. Se nao existir, no-op silencioso.
   */
  delete(bucket: string, path: string): Promise<void>;

  /**
   * URL publica absoluta pra download (bucket publico). Sincrona —
   * nao envolve I/O.
   */
  getPublicUrl(bucket: string, path: string): string;

  /**
   * Signed URL pra download temporario (bucket privado).
   * `expiresInSec`: tempo de validade em segundos.
   */
  createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSec: number,
  ): Promise<string>;

  /**
   * Signed URL pra upload direto do browser (sem passar pelo server).
   * Util pra uploads grandes tipo audio de reuniao. O token e HMAC'd
   * contra o path + expiracao pra evitar que clientes escrevam em
   * paths arbitrarios.
   */
  createSignedUploadUrl(
    bucket: string,
    path: string,
    expiresInSec: number,
  ): Promise<SignedUploadResult>;

  /**
   * Le arquivo em stream (pra API route servir download).
   * Retorna null se arquivo nao existe.
   */
  getStream(bucket: string, path: string): Promise<StorageStream | null>;
}

export interface UploadOptions {
  contentType?: string;
  upsert?: boolean; // default false — falha se arquivo existe
}

export interface UploadResult {
  path: string;
}

export interface SignedUploadResult {
  url: string;
  token: string;
  path: string;
}

export interface StorageStream {
  stream: ReadableStream<Uint8Array>;
  size: number;
  contentType?: string;
  lastModified?: Date;
}
