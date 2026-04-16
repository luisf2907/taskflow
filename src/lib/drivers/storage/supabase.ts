/**
 * Supabase Storage driver — wrap do SDK oficial.
 *
 * Usado como default (mantem comportamento cloud atual) e tambem no
 * perfil full do self-hosted (que inclui container storage-api).
 */

import { createServiceClient } from "@/lib/supabase/server";
import type {
  SignedUploadResult,
  StorageDriver,
  StorageStream,
  UploadOptions,
  UploadResult,
} from "./types";

export class SupabaseStorageDriver implements StorageDriver {
  async upload(
    bucket: string,
    path: string,
    data: Uint8Array | Buffer,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const admin = createServiceClient();
    const { error } = await admin.storage.from(bucket).upload(path, data, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });
    if (error) throw new Error(`Supabase upload: ${error.message}`);
    return { path };
  }

  async delete(bucket: string, path: string): Promise<void> {
    const admin = createServiceClient();
    const { error } = await admin.storage.from(bucket).remove([path]);
    // Nao relatamos erro se arquivo nao existe (idempotente)
    if (error && !error.message.includes("not found")) {
      throw new Error(`Supabase delete: ${error.message}`);
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    // Constroi sincronamente — Supabase SDK permite isto:
    //   const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    // mas precisa do client. Pra evitar inicializar um, constroi a URL
    // manualmente (formato Supabase fixo).
    const baseUrl =
      process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${baseUrl}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
  }

  async createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSec: number,
  ): Promise<string> {
    const admin = createServiceClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSec);
    if (error || !data) throw new Error(`Supabase signed url: ${error?.message}`);
    return data.signedUrl;
  }

  async createSignedUploadUrl(
    bucket: string,
    path: string,
    _expiresInSec: number,
  ): Promise<SignedUploadResult> {
    // Supabase Storage API:
    //   createSignedUploadUrl(path) — cria token com TTL fixo do Supabase
    const admin = createServiceClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Supabase signed upload: ${error?.message}`);
    return {
      url: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  }

  async getStream(bucket: string, path: string): Promise<StorageStream | null> {
    const admin = createServiceClient();
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) {
      if (error?.message?.includes("not found")) return null;
      throw new Error(`Supabase download: ${error?.message}`);
    }
    return {
      stream: data.stream(),
      size: data.size,
      contentType: data.type,
    };
  }
}
