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

// Cache de user_id e workspace_id para evitar queries repetidas
let cachedUserId: string | null = null;
let cachedUserExpiry = 0;
const wsCache = new Map<string, string>();

/**
 * Registra atividade de forma NON-BLOCKING.
 * Retorna imediatamente — o insert roda em background.
 * Nunca bloqueia a operação principal.
 */
export function registrarAtividade(params: RegistrarParams): void {
  // Fire-and-forget: nao espera a promise resolver
  registrarAsync(params).catch(() => {
    // Silent fail - activity logging must never block main operations
  });
}

async function registrarAsync(params: RegistrarParams): Promise<void> {
  // Cache getUser por 60s para evitar chamada a cada ação
  const now = Date.now();
  if (!cachedUserId || now > cachedUserExpiry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    cachedUserId = user.id;
    cachedUserExpiry = now + 60_000;
  }

  // Auto-resolve workspace_id from quadro_id (com cache)
  let workspaceId = params.workspaceId || null;
  if (!workspaceId && params.quadroId) {
    const cached = wsCache.get(params.quadroId);
    if (cached) {
      workspaceId = cached;
    } else {
      const { data: quadro } = await supabase
        .from("quadros")
        .select("workspace_id")
        .eq("id", params.quadroId)
        .single();
      workspaceId = quadro?.workspace_id || null;
      if (workspaceId) wsCache.set(params.quadroId, workspaceId);
    }
  }

  await supabase.from("atividades").insert({
    workspace_id: workspaceId,
    quadro_id: params.quadroId || null,
    cartao_id: params.cartaoId || null,
    user_id: cachedUserId,
    acao: params.acao,
    entidade: params.entidade,
    detalhes: params.detalhes || {},
  });
}
