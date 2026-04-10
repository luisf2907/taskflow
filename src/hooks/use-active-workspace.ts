"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useActiveWorkspace() {
  const { data: activeWorkspaceId, mutate: setActiveWorkspaceId } = useSWR<string | null>("active_workspace_id", null, { fallbackData: null });
  const pathname = usePathname();

  // Tenta inferir o workspace ativo a partir da rota de forma automática
  useEffect(() => {
    // Rotas como /workspace/123, /workspace/123/repos, etc
    const workspaceMatch = pathname.match(/\/workspace\/([a-zA-Z0-9-]+)/);
    if (workspaceMatch && workspaceMatch[1]) {
      const matchId = workspaceMatch[1];
      if (matchId !== activeWorkspaceId) {
        setActiveWorkspaceId(matchId, false);
      }
    }
    // Obs: Se for rotas como /quadro/123 precisaríamos fazer fetch do quadro
    // para descobrir seu workspace, o que é mais complexo aqui. 
    // Por enquanto cuidamos disso no nível do componente se precisarmos.
  }, [pathname, activeWorkspaceId, setActiveWorkspaceId]);

  return { activeWorkspaceId, setActiveWorkspaceId };
}
