/**
 * Anexos bucket authorization guard.
 *
 * O bucket `anexos` guarda arquivos atachados a cartoes. Path dentro
 * do bucket: `{cartao_id}/{timestamp}_{filename}`.
 *
 * O `SupabaseStorageDriver` usa service_role (bypassa RLS), entao a
 * validacao de membership precisa acontecer nos handlers de /api/storage/*.
 * As policies em storage.objects existem em paralelo como defense-in-depth
 * pra quem tentar acessar o DB direto.
 *
 * Uso:
 *   if (bucket === "anexos") {
 *     const guard = await guardAnexoAccess(user.id, filePath);
 *     if (!guard.ok) {
 *       return NextResponse.json({ error: guard.error }, { status: guard.status });
 *     }
 *   }
 */

import { createServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Valida que `userId` e membro do workspace dono do cartao cujo id eh o
 * primeiro segmento de `filePath`. Service role, bypass RLS — a validacao
 * acontece no codigo, nao nas policies.
 */
export async function guardAnexoAccess(
  userId: string,
  filePath: string,
): Promise<GuardResult> {
  const cartaoId = filePath.split("/")[0] ?? "";
  if (!UUID_RE.test(cartaoId)) {
    return {
      ok: false,
      status: 400,
      error: "Path invalido no bucket anexos: esperado '<cartao_id>/<arquivo>'",
    };
  }

  const admin = createServiceClient();

  const { data: cartao } = await admin
    .from("cartoes")
    .select("workspace_id")
    .eq("id", cartaoId)
    .maybeSingle();

  if (!cartao) {
    return { ok: false, status: 404, error: "Cartao nao encontrado" };
  }

  const { data: mem } = await admin
    .from("workspace_usuarios")
    .select("id")
    .eq("workspace_id", cartao.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!mem) {
    return { ok: false, status: 403, error: "Sem acesso ao cartao" };
  }

  return { ok: true };
}
