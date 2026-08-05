import { createServerClient } from "@/lib/supabase/server";
import type { DadosBoard } from "@/lib/board-loader";
import type { CartaoComResumo } from "@/hooks/use-cartoes";
import type { Coluna, Quadro } from "@/types";

// ═══════════════════════════════════════════════════════════════════════
// Leitura do board no SERVIDOR
// ═══════════════════════════════════════════════════════════════════════
// Contraparte server-side do `board-loader.ts`. O resultado vai pro
// `fallback` do SWRConfig em /quadro/[id], entao o HTML ja sai com os
// cartoes — e a LCP para de esperar o JS hidratar.
//
// Medido em producao no VPS: o atraso de renderizacao era 2.880 ms, e o
// custo desta chamada server-side e ~171-250 ms. Razao de ~1:12.
//
// BEST-EFFORT, DE PROPOSITO. Qualquer falha devolve `null`, o Server
// Component nao injeta fallback nenhum, e os hooks buscam como sempre
// fizeram (incluindo o proprio fallback de queries separadas do
// board-loader.ts).
//
// Isso existe por um modo de falha concreto: o proxy renova o cookie de
// auth durante a request, e nao esta estabelecido que o cookie renovado
// alcanca o Server Component no mesmo ciclo. Se nao alcancar, a leitura
// aqui sai com JWT expirado e o RLS devolve vazio. Em vez de tentar
// resolver essa incerteza, o desenho faz ela nao importar: o piso nunca
// fica abaixo do comportamento de hoje.
//
// Sem o caminho de queries separadas de proposito — o fallback e o client.
// ═══════════════════════════════════════════════════════════════════════

interface RespostaRpc {
  quadro: Quadro | null;
  colunas: Coluna[] | null;
  cartoes: CartaoComResumo[] | null;
}

export async function carregarBoardServidor(
  quadroId: string,
): Promise<DadosBoard | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc("get_board_data", {
      p_quadro_id: quadroId,
    });

    if (error || !data) return null;

    const d = data as RespostaRpc;

    // Sem quadro: ou o RLS barrou, ou o id nao existe, ou o cookie estava
    // velho. Em qualquer um dos casos o client confirma — nao adianta
    // injetar um estado vazio que o SWR trataria como resposta valida.
    if (!d.quadro) return null;

    return {
      quadro: d.quadro,
      colunas: d.colunas ?? [],
      cartoes: d.cartoes ?? [],
    };
  } catch {
    return null;
  }
}
