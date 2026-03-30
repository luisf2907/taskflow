"use client";

import { Modal } from "@/components/ui/modal";
import { usePlanningPoker } from "@/hooks/use-planning-poker";
import { useBacklog } from "@/hooks/use-backlog";
import { useMembrosWorkspace } from "@/hooks/use-membros-workspace";
import { useWorkspaceUsuarios } from "@/hooks/use-workspace-usuarios";
import { useAuth } from "@/hooks/use-auth";
import { SeletorCartao } from "./seletor-cartao";
import { SalaPoker } from "./sala-poker";
import { Cartao } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface PlanningPokerModalProps {
  aberto: boolean;
  onFechar: () => void;
  workspaceId: string;
  cartaoInicialId?: string | null;
}

export function PlanningPokerModal({
  aberto,
  onFechar,
  workspaceId,
  cartaoInicialId,
}: PlanningPokerModalProps) {
  const { user } = useAuth();
  const { usuarios } = useWorkspaceUsuarios(workspaceId);
  const { membros } = useMembrosWorkspace(workspaceId);
  const { cartoes, carregando: carregandoBacklog } = useBacklog(workspaceId);
  const {
    sessaoAtiva,
    votos,
    carregando,
    meuVoto,
    estatisticas,
    iniciarSessao,
    votar,
    revelarVotos,
    resetarVotos,
    finalizarSessao,
    fecharSessao,
  } = usePlanningPoker(workspaceId);

  const [cartaoPreSelecionado, setCartaoPreSelecionado] = useState<string | null>(null);

  // Pre-selecionar cartao se passado como prop
  useEffect(() => {
    if (cartaoInicialId && aberto && !sessaoAtiva) {
      setCartaoPreSelecionado(cartaoInicialId);
    }
  }, [cartaoInicialId, aberto, sessaoAtiva]);

  // Iniciar sessao quando pre-selecionar
  useEffect(() => {
    if (cartaoPreSelecionado && aberto && !sessaoAtiva && !carregando) {
      iniciarSessao(cartaoPreSelecionado);
      setCartaoPreSelecionado(null);
    }
  }, [cartaoPreSelecionado, aberto, sessaoAtiva, carregando, iniciarSessao]);

  // Cartao atual em votacao
  const cartaoAtual: Cartao | null = useMemo(() => {
    if (!sessaoAtiva) return null;
    return cartoes.find((c) => c.id === sessaoAtiva.cartao_id) ?? null;
  }, [sessaoAtiva, cartoes]);

  // Verificar se o usuario pode facilitar (criador da sessao ou admin)
  const podeFacilitar = useMemo(() => {
    if (!sessaoAtiva || !user) return false;
    if (sessaoAtiva.criado_por === user.id) return true;
    const wsUser = usuarios.find((u) => u.user_id === user.id);
    return wsUser?.papel === "admin";
  }, [sessaoAtiva, user, usuarios]);

  const handleSelecionar = useCallback(async (cartaoId: string) => {
    await iniciarSessao(cartaoId);
  }, [iniciarSessao]);

  const handleFechar = useCallback(async () => {
    await fecharSessao();
    onFechar();
  }, [fecharSessao, onFechar]);

  const handleFinalizar = useCallback(async (valor: number) => {
    await finalizarSessao(valor);
  }, [finalizarSessao]);

  if (!aberto) return null;

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Planning Poker"
      className="max-w-xl"
    >
      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--tf-border)", borderTopColor: "var(--tf-accent)" }}
          />
        </div>
      ) : sessaoAtiva ? (
        <SalaPoker
          sessao={sessaoAtiva}
          cartao={cartaoAtual}
          votos={votos}
          membros={membros}
          meuVotoValor={meuVoto?.valor ?? null}
          podeFacilitar={podeFacilitar}
          estatisticas={estatisticas}
          onVotar={votar}
          onRevelar={revelarVotos}
          onResetar={resetarVotos}
          onFinalizar={handleFinalizar}
          onFechar={handleFechar}
        />
      ) : (
        <SeletorCartao
          cartoes={cartoes}
          carregando={carregandoBacklog}
          onSelecionar={handleSelecionar}
        />
      )}
    </Modal>
  );
}
