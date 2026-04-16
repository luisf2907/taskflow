import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getLocalDiskDriverOrNull, getStorageDriver } from "@/lib/drivers/storage/factory";

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
