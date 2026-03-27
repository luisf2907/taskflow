import { Automacao } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  // Buscar título do cartão para o log
  let cartaoTitulo: string | null = null;
  if (matching.length > 0) {
    const { data: cartao } = await client
      .from("cartoes")
      .select("titulo")
      .eq("id", trigger.cartao_id)
      .maybeSingle();
    cartaoTitulo = cartao?.titulo || null;
  }

  for (const auto of matching) {
    let sucesso = true;
    let erro: string | null = null;

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
            const { data: existe } = await client
              .from("cartao_membros")
              .select("id")
              .eq("cartao_id", trigger.cartao_id)
              .eq("membro_id", membroId)
              .maybeSingle();

            if (!existe) {
              await client
                .from("cartao_membros")
                .insert({ cartao_id: trigger.cartao_id, membro_id: membroId });
            }
          }
          break;
        }

        case "add_label": {
          const etiquetaId = auto.acao_config.etiqueta_id;
          if (etiquetaId) {
            const { data: existe } = await client
              .from("cartao_etiquetas")
              .select("id")
              .eq("cartao_id", trigger.cartao_id)
              .eq("etiqueta_id", etiquetaId)
              .maybeSingle();

            if (!existe) {
              await client
                .from("cartao_etiquetas")
                .insert({ cartao_id: trigger.cartao_id, etiqueta_id: etiquetaId });
            }
          }
          break;
        }
      }
    } catch (err) {
      sucesso = false;
      erro = err instanceof Error ? err.message : String(err);
      console.error(`[Automação] Falha ao executar "${auto.nome}":`, err);
    }

    // Registrar log
    const workspaceId = trigger.workspace_id || auto.workspace_id;
    if (workspaceId) {
      try {
        await client.from("automacao_logs").insert({
          automacao_id: auto.id,
          automacao_nome: auto.nome,
          trigger_tipo: auto.trigger_tipo,
          acao_tipo: auto.acao_tipo,
          cartao_id: trigger.cartao_id,
          cartao_titulo: cartaoTitulo,
          workspace_id: workspaceId,
          sucesso,
          erro,
        });
      } catch (logErr) {
        console.error("[Automação] Falha ao registrar log:", logErr);
      }
    }
  }
}
