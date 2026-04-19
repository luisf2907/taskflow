import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getLocalDiskDriverOrNull, getStorageDriver } from "@/lib/drivers/storage/factory";
import { createServerClient } from "@/lib/supabase/server";
import { guardAnexoAccess } from "@/lib/anexos-guard";
import { applyRateLimitAsync } from "@/lib/api-utils";

/**
 * GET /api/storage/object/<bucket>/<path...>[?token=<t>]
 *
 * Serve um arquivo do storage. Para buckets publicos (wiki, anexos),
 * serve direto. Para privados (reunioes-audio), exige ?token= valido.
 *
 * Path handling: [bucket] vem de params, [...path] cobre o resto.
 * Ex: /api/storage/object/wiki/workspace-1/page-2/img.png
 *     bucket = "wiki", path = "workspace-1/page-2/img.png"
 */

// Buckets publicos — servem qualquer path sem auth
const PUBLIC_BUCKETS = new Set(["wiki", "anexos"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");
  const token = request.nextUrl.searchParams.get("token");

  // ───── Auth ─────
  if (!PUBLIC_BUCKETS.has(bucket)) {
    // Bucket privado — valida token HMAC (se local-disk)
    const localDriver = getLocalDiskDriverOrNull();
    if (!localDriver) {
      // Supabase driver: confiamos no SDK que ja valida via signed URL
      // No caso de acesso direto via /api/storage/object sem token,
      // rejeitamos por seguranca.
      return NextResponse.json(
        { error: "Bucket privado exige token (ou use signed URL do Supabase direto)" },
        { status: 401 },
      );
    }
    if (!token || !localDriver.verifyToken(token, bucket, filePath, "r")) {
      return NextResponse.json(
        { error: "Token invalido ou expirado" },
        { status: 403 },
      );
    }
  }

  // ───── Serve file ─────
  try {
    const driver = getStorageDriver();
    const file = await driver.getStream(bucket, filePath);
    if (!file) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", file.contentType ?? "application/octet-stream");
    headers.set("Content-Length", String(file.size));
    headers.set("Cache-Control", "public, max-age=3600");
    if (file.lastModified) {
      headers.set("Last-Modified", file.lastModified.toUTCString());
    }

    return new NextResponse(file.stream, {
      status: 200,
      headers,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/storage/object/<bucket>/<path...>
 *
 * Remove arquivo do storage. Exige sessao autenticada. Idempotente —
 * retorna 204 mesmo se arquivo nao existia.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  // Rate limit: 10 deletes/min por IP — previne DoS por delete em massa
  const limited = await applyRateLimitAsync(request, "storage-delete", { maxRequests: 10 });
  if (limited) return limited;

  const { bucket, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Auth — so user logado pode deletar
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Bucket "anexos" exige membership do workspace dono do cartao (service_role
  // bypassa RLS, entao validamos aqui — policy em storage.objects eh defense-in-depth).
  if (bucket === "anexos") {
    const guard = await guardAnexoAccess(user.id, filePath);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
  }

  try {
    const driver = getStorageDriver();
    await driver.delete(bucket, filePath);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
