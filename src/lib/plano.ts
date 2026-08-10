import { NextResponse } from "next/server";
import type { createServerClient } from "@/lib/supabase/server";
import type { PlanoUsuario } from "@/types";

type Supa = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Guarda de plano para as rotas que exigem PRO (hoje, /api/ai/*).
 *
 * Le o plano do proprio usuario autenticado — `perfis_select` permite ler a
 * propria linha, e a coluna e protegida por trigger contra escrita pelo
 * client (migration 057), entao o valor aqui e confiavel.
 *
 * Devolve uma resposta 403 pronta quando o usuario nao pode passar, e `null`
 * quando pode:
 *
 *   const barrado = await exigirPro(supabase, user.id);
 *   if (barrado) return barrado;
 */
export async function exigirPro(
  supabase: Supa,
  userId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("perfis")
    .select("plano")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Nao foi possivel verificar seu plano." },
      { status: 500 }
    );
  }

  const plano = (data?.plano ?? "free") as PlanoUsuario;
  if (plano !== "pro") {
    return NextResponse.json(
      {
        error: "A IA do TaskFlow faz parte do plano PRO.",
        // A UI usa isso pra abrir o aviso de PRO em vez de um toast de erro.
        codigo: "plano_requerido",
        plano_necessario: "pro",
      },
      { status: 403 }
    );
  }

  return null;
}
