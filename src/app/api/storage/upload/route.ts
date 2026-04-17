import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getLocalDiskDriverOrNull, getStorageDriver } from "@/lib/drivers/storage/factory";
import { createServerClient } from "@/lib/supabase/server";
import { guardAnexoAccess } from "@/lib/anexos-guard";

/**
 * POST /api/storage/upload?bucket=<b>&path=<p>[&token=<t>]
 * PUT  /api/storage/upload?bucket=<b>&path=<p>[&token=<t>]
 *
 * Upload de arquivo. Body = multipart/form-data com campo "file" OU
 * body cru (raw bytes) se Content-Type diferente de multipart.
 *
 * POST = do browser com multipart (wiki, anexos).
 * PUT  = do browser com raw body (reunioes-audio — signed upload URL,
 *        compat com clientes que assumem semantica S3/Supabase).
 *
 * Auth:
 * - Se ?token= presente (local-disk signed upload URL), valida HMAC
 *   contra bucket+path+"w". Sem sessao necessaria — o token e a
 *   credencial.
 * - Sem token: exige sessao autenticada. RLS do DB decide depois se
 *   o user pode escrever (quando a camada de permissao por bucket
 *   estiver implementada — hoje confiamos em policies do DB e no
 *   proprio bucket ser publico ou nao).
 *
 * Path handling: aceita path com ou sem prefixo "<bucket>/". Mapeia
 * pra bucket/path correto.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bucket = searchParams.get("bucket");
  const filePath = searchParams.get("path");
  const token = searchParams.get("token");

  if (!bucket || !filePath) {
    return NextResponse.json(
      { error: "Params obrigatorios: bucket, path" },
      { status: 400 },
    );
  }

  // ───── Auth ─────
  let userId: string | null = null;
  if (token) {
    // Signed upload URL — so faz sentido em local-disk driver
    const localDriver = getLocalDiskDriverOrNull();
    if (!localDriver) {
      return NextResponse.json(
        { error: "Token signed upload so valido com STORAGE_DRIVER=local-disk" },
        { status: 400 },
      );
    }
    if (!localDriver.verifyToken(token, bucket, filePath, "w")) {
      return NextResponse.json(
        { error: "Token invalido ou expirado" },
        { status: 403 },
      );
    }
  } else {
    // Sem token: exige sessao
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    userId = user.id;
  }

  // ───── Bucket-specific authz ─────
  // Bucket "anexos" exige sessao + membership do workspace dono do cartao.
  // Driver usa service_role (bypassa RLS), entao validamos aqui.
  if (bucket === "anexos") {
    if (!userId) {
      return NextResponse.json(
        { error: "Signed upload nao suportado no bucket anexos" },
        { status: 400 },
      );
    }
    const guard = await guardAnexoAccess(userId, filePath);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
  }

  // ───── Read body ─────
  let fileBytes: Uint8Array;
  let contentType: string | undefined;
  const reqContentType = request.headers.get("content-type") ?? "";

  if (reqContentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'file' ausente" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    fileBytes = new Uint8Array(arrayBuffer);
    contentType = file.type;
  } else {
    // Raw body (ex: PUT direto)
    const arrayBuffer = await request.arrayBuffer();
    fileBytes = new Uint8Array(arrayBuffer);
    contentType = reqContentType || undefined;
  }

  // ───── Upload via driver ─────
  try {
    const driver = getStorageDriver();
    const result = await driver.upload(bucket, filePath, fileBytes, {
      contentType,
      upsert: searchParams.get("upsert") === "true",
    });
    const publicUrl = driver.getPublicUrl(bucket, result.path);
    return NextResponse.json({
      bucket,
      path: result.path,
      url: publicUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "upload falhou";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT comparte a mesma logica que POST — clientes que assumem semantica
// S3/Supabase (signed upload URL + PUT raw body) funcionam sem mudanca.
export const PUT = POST;
