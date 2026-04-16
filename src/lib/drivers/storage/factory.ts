/**
 * Factory do driver de storage — seleciona backend via env.
 *
 * Singleton: 1 instancia por runtime (evita recriar HMAC key etc).
 */

import { LocalDiskStorageDriver } from "./local-disk";
import { SupabaseStorageDriver } from "./supabase";
import type { StorageDriver } from "./types";

let instance: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (instance) return instance;

  const driver = process.env.STORAGE_DRIVER ?? "supabase";

  switch (driver) {
    case "supabase":
      instance = new SupabaseStorageDriver();
      break;
    case "local-disk":
      instance = new LocalDiskStorageDriver();
      break;
    case "s3-compat":
      // Fase 6 — placeholder
      throw new Error(
        "STORAGE_DRIVER=s3-compat ainda nao implementado (planejado pra Fase 6)",
      );
    default:
      throw new Error(`STORAGE_DRIVER desconhecido: ${driver}`);
  }

  return instance;
}

/**
 * Getter pra impl especifica — uso interno da API route quando precisa
 * dos metodos extras (ex: verifyToken do local-disk).
 */
export function getLocalDiskDriverOrNull(): LocalDiskStorageDriver | null {
  const driver = getStorageDriver();
  return driver instanceof LocalDiskStorageDriver ? driver : null;
}
