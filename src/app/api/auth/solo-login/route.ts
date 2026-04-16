import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { SUPABASE_STORAGE_KEY } from "@/lib/supabase/storage-key";

/**
 * Auto-login handler pro AUTH_MODE=solo.
 *
 * Fluxo:
 *   1. Valida que o env realmente esta em solo mode (defense in depth)
 *   2. Cria o user solo se nao existir (idempotente — get-or-create)
 *   3. Gera magic link via admin API (GoTrue)
 *   4. Troca hashed_token por sessao completa via verifyOtp
 *   5. Cookies setados na response via createServerClient
 *   6. Redirect pro path original (?next=)
 *
 * Rota publica — autorizada pelo proxy.ts mesmo sem sessao. Se chamada
 * fora de solo mode, retorna 400 (nao e caminho valido de login em outros
 * modos).
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();

  if (env.AUTH_MODE !== "solo") {
    return NextResponse.json(
      { error: "solo-login so disponivel quando AUTH_MODE=solo" },
      { status: 400 },
    );
  }

  const email = env.SOLO_USER_EMAIL;
  if (!email) {
    return NextResponse.json(
      { error: "SOLO_USER_EMAIL nao configurado" },
      { status: 500 },
    );
  }

  const admin = createServiceClient();

  // ───── Ensure user exists (idempotente) ─────
  // listUsers pagina — em solo, esperamos poucos users, default (50) cobre.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json(
      { error: `Falha ao listar users: ${listErr.message}` },
      { status: 500 },
    );
  }

  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: "Solo Admin",
        name: "Solo Admin",
      },
    });
    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: `Falha ao criar user solo: ${createErr?.message ?? "unknown"}` },
        { status: 500 },
      );
    }
    user = created.user;
  }

  // ───── Gera magic link e troca por sessao ─────
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: `Falha ao gerar magic link: ${linkErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // Resolve ?next= (com seguranca contra open redirect: so paths relativos)
  const nextParam = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";

  const response = NextResponse.redirect(new URL(safeNext, request.url));

  // Cliente SSR que seta cookies na response acima
  const supabase = createSSRServerClient(
    env.SUPABASE_INTERNAL_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { storageKey: SUPABASE_STORAGE_KEY },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyErr) {
    return NextResponse.json(
      { error: `Falha ao trocar token por sessao: ${verifyErr.message}` },
      { status: 500 },
    );
  }

  return response;
}
