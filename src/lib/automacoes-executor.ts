import { Automacao } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Executa automações que combinam com o trigger dado.
 * Funciona tanto client-side (browser supabase) quanto server-side (service role).
 */
export async function executarAutomacoes(
  client: SupabaseClient,
  automacoes: Automacao[],
  trigger: {
    tipo: string;
    config: Record<string, string>;
    cartao_id: string;
  }
) {
  const matching = automacoes.filter((a) => {
    if (!a.ativo) return false;
    if (a.trigger_tipo !== trigger.tipo) return false;

    // Verificar config do trigger
    if (a.trigger_tipo === "card_moved_to_column") {
      return a.trigger_config.coluna_id === trigger.config.coluna_id;
    }

    // Triggers sem config específica (card_created, pr_merged, pr_opened)
    return true;
  });

  for (const auto of matching) {
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
            // Verificar se já está atribuído
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
            // Verificar se já tem a etiqueta
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
      console.error(`[Automação] Falha ao executar "${auto.nome}":`, err);
    }
  }
}
