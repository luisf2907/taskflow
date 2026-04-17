"use client";

import { SWRConfig } from "swr";
import { features } from "@/lib/features";

// Polling driver: quando REALTIME_DRIVER=polling, os hooks de realtime
// sao no-op (nao abrem EventSource nem supabase.channel). Em vez disso,
// SWR revalida os dados periodicamente via refreshInterval global.
// 10s eh um bom compromisso entre responsividade e carga no servidor.
const pollingInterval =
  features.realtime.driver === "polling" ? 10_000 : undefined;

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
