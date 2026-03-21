"use client";

import useSWR from "swr";

export function usePRSync(repoId: string | undefined, enabled: boolean) {
  const { data, isLoading, mutate } = useSWR(
    enabled && repoId ? `pr-sync-${repoId}` : null,
    async () => {
      const res = await fetch("/api/pr-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId }),
      });
      return res.json();
    },
    { refreshInterval: 5 * 60 * 1000 } // 5 minutos
  );

  return { data, syncing: isLoading, sync: () => mutate() };
}
