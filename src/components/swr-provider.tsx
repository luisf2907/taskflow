"use client";

import { SWRConfig } from "swr";
import { features } from "@/lib/features";

// Polling driver: quando REALTIME_DRIVER=polling, os hooks de realtime
// sao no-op (nao abrem EventSource nem supabase.channel). Em vez disso,
// SWR revalida os dados periodicamente via refreshInterval global.
//
// ATENCAO: este intervalo vale para TODAS as chaves do SWR, inclusive a do
// board. E a chave do board e o `get_board_data` — join de 8 tabelas que
// devolve ~67 KB. A 10s, cada usuario com um board aberto relia o board
// inteiro 6x por minuto.
//
// Medido no Supabase (Free) com 8 usuarios: numa janela de ~50s, o banco
// gastou 171s de tempo de execucao — 3,4x mais do que a instancia entrega.
// O `get_board_data` sozinho foi 42% disso, com media de 1.443 ms para uma
// funcao que executa em ~10 ms isolada. A diferenca era fila.
//
// 30s reduz o volume em 3x. Perto da saturacao a latencia cai bem mais que
// proporcional, entao o efeito esperado e maior que 3x.
//
// Ver `use-cartoes.ts`: mutacoes locais continuam otimistas e instantaneas.
// O intervalo so governa quanto tempo a mudanca DE OUTRA PESSOA demora a
// aparecer.
const pollingInterval =
  features.realtime.driver === "polling" ? 30_000 : undefined;

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: false,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        keepPreviousData: true,
        revalidateOnMount: true,
        refreshInterval: pollingInterval,
      }}
    >
      {children}
    </SWRConfig>
  );
}
