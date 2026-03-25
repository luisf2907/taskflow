import { supabase } from "@/lib/supabase/client";
import type { AcaoAtividade, EntidadeAtividade } from "@/types";

interface RegistrarParams {
  workspaceId?: string | null;
  quadroId?: string | null;
  cartaoId?: string | null;
  acao: AcaoAtividade;
  entidade: EntidadeAtividade;
  detalhes?: Record<string, unknown>;
}

export async function registrarAtividade(params: RegistrarParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Auto-resolve workspace_id from quadro_id if not provided
    let workspaceId = params.workspaceId || null;
    if (!workspaceId && params.quadroId) {
      const { data: quadro } = await supabase
        .from("quadros")
        .select("workspace_id")
        .eq("id", params.quadroId)
        .single();
      workspaceId = quadro?.workspace_id || null;
    }

    await supabase.from("atividades").insert({
      workspace_id: workspaceId,
      quadro_id: params.quadroId || null,
      cartao_id: params.cartaoId || null,
      user_id: user.id,
      acao: params.acao,
      entidade: params.entidade,
      detalhes: params.detalhes || {},
    });
  } catch {
    // Silent fail - activity logging must never block main operations
  }
}
