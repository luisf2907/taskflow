"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";

import type { NovoQuadroDados } from "@/app/dashboard/_modais/modal-criar-quadro";

const ModalCriarQuadro = dynamic(
  () =>
    import("@/app/dashboard/_modais/modal-criar-quadro").then(
      (m) => m.ModalCriarQuadro
    ),
  { ssr: false }
);

/**
 * Modal de "Nova sprint" em escopo global: escuta o evento
 * `open-sprint-modal` (disparado pela sidebar de qualquer pagina) e
 * abre sobre a pagina atual em vez de forcar um redirect ao dashboard.
 *
 * So ativa pra usuario autenticado pra nao puxar hooks SWR em rotas
 * publicas (landing/login).
 */
export function GlobalSprintModal() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return <Inner />;
}

function Inner() {
  const router = useRouter();
  const { workspaces } = useWorkspaces();
  const { criar: criarQuadro } = useQuadros();

  const [aberto, setAberto] = useState(false);
  const [initialWorkspaceId, setInitialWorkspaceId] = useState<string>("");

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { workspaceId?: string }
        | undefined;
      setInitialWorkspaceId(detail?.workspaceId || workspaces[0]?.id || "");
      setAberto(true);
    }
    window.addEventListener("open-sprint-modal", handleOpen);

    // Deep-link: /dashboard?new-sprint=1 abre o modal automaticamente.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new-sprint")) {
        setInitialWorkspaceId(workspaces[0]?.id || "");
        setAberto(true);
        const { pathname } = window.location;
        window.history.replaceState({}, "", pathname);
      }
    }

    return () => window.removeEventListener("open-sprint-modal", handleOpen);
  }, [workspaces]);

  const handleCriar = useCallback(
    async (dados: NovoQuadroDados) => {
      const quadro = await criarQuadro({
        nome: dados.nome,
        cor: dados.cor,
        workspaceId: dados.workspaceId,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        statusSprint: "planejada",
        meta: dados.meta,
      });

      if (quadro) {
        const ws = workspaces.find((w) => w.id === dados.workspaceId);
        if (ws?.colunas_padrao && ws.colunas_padrao.length > 0) {
          const { supabase } = await import("@/lib/supabase/client");
          const colunas = ws.colunas_padrao.map((nome, i) => ({
            quadro_id: quadro.id,
            nome,
            posicao: i,
          }));
          await supabase.from("colunas").insert(colunas);
        }
        setAberto(false);
        router.push(`/quadro/${quadro.id}`);
      }
    },
    [criarQuadro, workspaces, router]
  );

  return (
    <ModalCriarQuadro
      aberto={aberto}
      onFechar={() => setAberto(false)}
      workspaces={workspaces}
      initialWorkspaceId={initialWorkspaceId}
      onCriar={handleCriar}
    />
  );
}
