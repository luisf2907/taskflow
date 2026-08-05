import { SWRConfig } from "swr";
import { BoardClient } from "./board-client";
import { carregarBoardServidor } from "@/lib/board-loader-server";
import {
  chaveCartoes,
  chaveColunas,
  chaveQuadro,
} from "@/lib/board-keys";

// ═══════════════════════════════════════════════════════════════════════
// Server Component — o board sai pronto no HTML
// ═══════════════════════════════════════════════════════════════════════
// Item 7 do diagnostico. Medido no VPS, o elemento da LCP e o titulo de um
// cartao, e ele levava 2.880 ms de "atraso na renderizacao" — o tempo entre
// o HTML chegar e os cartoes aparecerem, gasto baixando JS, hidratando e so
// entao buscando os dados.
//
// Client Components JA renderizam no servidor. O HTML saia vazio nao por
// falta de SSR, mas porque o dado so era buscado depois de hidratar. Aqui o
// dado passa a estar presente na hora do render.
//
// O mecanismo e o `fallback` do SWR, que casa por chave. Os tres hooks do
// board (useQuadro, useColunas, useCartoes) leem das chaves de
// `@/lib/board-keys` — as mesmas usadas aqui. NENHUM HOOK MUDA, e as
// mutacoes otimistas continuam intactas.
//
// `revalidateOnMount: true` continua ligado no SWRProvider de proposito.
// Ele dispara um get_board_data client-side depois de hidratar, mas isso
// custa ~9 KiB fora do caminho critico e nao toca a LCP. Desligar quebraria
// navegacao client-side com cache antigo: o `fallback` do SWR so vale
// quando nao ha dado em cache pra chave, e com `keepPreviousData: true` o
// cache velho venceria — o usuario veria board stale. Trocar staleness por
// uma request off-critical-path seria mau negocio.
//
// Se `carregarBoardServidor` devolver null, nao injetamos fallback nenhum e
// os hooks se comportam exatamente como antes desta mudanca. Ver o
// comentario em board-loader-server.ts pra entender por que essa regra
// existe.
// ═══════════════════════════════════════════════════════════════════════

export default async function PaginaQuadro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await carregarBoardServidor(id);

  if (!dados) {
    return <BoardClient quadroId={id} />;
  }

  return (
    <SWRConfig
      value={{
        fallback: {
          [chaveQuadro(id)]: dados.quadro,
          [chaveColunas(id)]: dados.colunas,
          [chaveCartoes(id)]: dados.cartoes,
        },
      }}
    >
      <BoardClient quadroId={id} />
    </SWRConfig>
  );
}
