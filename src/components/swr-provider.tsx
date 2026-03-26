"use client";

import { SWRConfig } from "swr";

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
      }}
    >
      {children}
    </SWRConfig>
  );
}
