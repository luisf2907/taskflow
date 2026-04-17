import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/clear-must-change
 *
 * Chamado pela tela /trocar-senha apos o user definir nova senha.
 * Limpa app_metadata.must_change_password no GoTrue E perfis.must_change_password
 * no DB. Precisa de sessao autenticada (o user acabou de fazer login).
 *
 * Service role necessario porque updateUser de app_metadata exige admin API.
 */
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const admin = createServiceClient();

  // Limpa flag no GoTrue (app_metadata)
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { must_change_password: false },
  });

  if (authError) {
    return NextResponse.json(
      { error: `Falha ao limpar flag auth: ${authError.message}` },
      { status: 500 },
    );
  }

  // Limpa flag no perfis (consistency)
  await admin
    .from("perfis")
    .update({ must_change_password: false })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
