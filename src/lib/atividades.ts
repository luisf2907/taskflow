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
const wsCacheByQuadro = new Map<string, string>();
const wsCacheByCartao = new Map<string, string>();

/**
 * Registra atividade de forma NON-BLOCKING.
 * Retorna imediatamente — o insert roda em background.
 * Nunca bloqueia a operação principal.
 */
export function registrarAtividade(params: RegistrarParams): void {
  // Fire-and-forget: nao espera a promise resolver
  registrarAsync(params).catch((err) => {
    console.error(
      "[atividades] Falha ao registrar:",
      err instanceof Error ? err.message : err,
      { acao: params.acao, entidade: params.entidade },
    );
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

  // Auto-resolve workspace_id. Fallback: quadro_id -> cartao_id.
  let workspaceId = params.workspaceId || null;

  if (!workspaceId && params.quadroId) {
    const cached = wsCacheByQuadro.get(params.quadroId);
    if (cached) {
      workspaceId = cached;
    } else {
      const { data: quadro } = await supabase
        .from("quadros")
        .select("workspace_id")
        .eq("id", params.quadroId)
        .single();
      workspaceId = quadro?.workspace_id || null;
      if (workspaceId) wsCacheByQuadro.set(params.quadroId, workspaceId);
    }
  }

  if (!workspaceId && params.cartaoId) {
    const cached = wsCacheByCartao.get(params.cartaoId);
    if (cached) {
      workspaceId = cached;
    } else {
      const { data: cartao } = await supabase
        .from("cartoes")
        .select("workspace_id")
        .eq("id", params.cartaoId)
        .single();
      workspaceId = cartao?.workspace_id || null;
      if (workspaceId) wsCacheByCartao.set(params.cartaoId, workspaceId);
    }
  }

  // workspace_id e NOT NULL no banco. Sem ele nao da pra registrar.
  if (!workspaceId) return;

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
