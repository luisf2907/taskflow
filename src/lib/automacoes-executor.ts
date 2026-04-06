import { Automacao } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * Executa automações que combinam com o trigger dado.
 * Funciona tanto client-side (browser supabase) quanto server-side (service role).
 * Registra logs de cada execução.
 */
export async function executarAutomacoes(
  client: SupabaseClient,
  automacoes: Automacao[],
  trigger: {
    tipo: string;
    config: Record<string, string>;
    cartao_id: string;
    workspace_id?: string;
  }
) {
  const matching = automacoes.filter((a) => {
    if (!a.ativo) return false;
    if (a.trigger_tipo !== trigger.tipo) return false;

    // Verificar config do trigger
    if (a.trigger_tipo === "card_moved_to_column") {
      return a.trigger_config.coluna_id === trigger.config.coluna_id;
    }

    // Triggers sem config específica (card_created, pr_merged, pr_opened, pr_closed)
    return true;
  });

  if (matching.length === 0) return;

  // Buscar título do cartão para o log (1 query)
  const { data: cartao } = await client
    .from("cartoes")
    .select("titulo")
    .eq("id", trigger.cartao_id)
    .maybeSingle();
  const cartaoTitulo = cartao?.titulo || null;

  // Executar todas as automações em PARALELO (não sequencial)
  const resultados = await Promise.allSettled(
    matching.map((auto) => executarUmaAutomacao(client, auto, trigger))
  );

  // Registrar logs em batch (1 insert com todas as rows)
  const logs = matching.map((auto, i) => {
    const result = resultados[i];
    const sucesso = result.status === "fulfilled" && result.value.sucesso;
    const erro = result.status === "rejected"
      ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
      : (result.status === "fulfilled" ? result.value.erro : null);

    return {
      automacao_id: auto.id,
      automacao_nome: auto.nome,
      trigger_tipo: auto.trigger_tipo,
      acao_tipo: auto.acao_tipo,
      cartao_id: trigger.cartao_id,
      cartao_titulo: cartaoTitulo,
      workspace_id: trigger.workspace_id || auto.workspace_id,
      sucesso,
      erro,
    };
  }).filter((log) => log.workspace_id);

  if (logs.length > 0) {
    try {
      await client.from("automacao_logs").insert(logs);
    } catch (logErr) {
      logger.error(logErr instanceof Error ? logErr.message : String(logErr), "Automacao", { action: "registrar_logs_batch" });
    }
  }
}

async function executarUmaAutomacao(
  client: SupabaseClient,
  auto: Automacao,
  trigger: { cartao_id: string }
): Promise<{ sucesso: boolean; erro: string | null }> {
  try {
    switch (auto.acao_tipo) {
      case "move_to_column": {
        const colunaId = auto.acao_config.coluna_id;
        if (colunaId) {
          await client
            .from("cartoes")
            .update({ coluna_id: colunaId })
            .eq("id", trigger.cartao_id);
        }
        break;
      }

      case "assign_member": {
        const membroId = auto.acao_config.membro_id;
        if (membroId) {
          // upsert evita check+insert (race condition safe)
          await client
            .from("cartao_membros")
            .upsert(
              { cartao_id: trigger.cartao_id, membro_id: membroId },
              { onConflict: "cartao_id,membro_id", ignoreDuplicates: true }
            );
        }
        break;
      }

      case "add_label": {
        const etiquetaId = auto.acao_config.etiqueta_id;
        if (etiquetaId) {
          // upsert evita check+insert (race condition safe)
          await client
            .from("cartao_etiquetas")
            .upsert(
              { cartao_id: trigger.cartao_id, etiqueta_id: etiquetaId },
              { onConflict: "cartao_id,etiqueta_id", ignoreDuplicates: true }
            );
        }
        break;
      }
    }
    return { sucesso: true, erro: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(msg, "Automacao", { nome: auto.nome });
    return { sucesso: false, erro: msg };
  }
}
