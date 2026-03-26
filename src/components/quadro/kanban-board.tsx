"use client";

import { CartaoComResumo, useCartoes } from "@/hooks/use-cartoes";
import { useColunas } from "@/hooks/use-colunas";
import { useEtiquetasWorkspace } from "@/hooks/use-etiquetas-workspace";
import { useMembrosWorkspace } from "@/hooks/use-membros-workspace";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BarraFiltros, Filtros } from "./barra-filtros";
import { Cartao } from "./cartao";
import { Coluna } from "./coluna";
import { DetalheCartao } from "./detalhe-cartao";
import { NovaColuna } from "./nova-coluna";

interface KanbanBoardProps {
  quadroId: string;
  workspaceId: string | null;
}

export function KanbanBoard({ quadroId, workspaceId }: KanbanBoardProps) {
  const {
    colunas,
    carregando: carregandoColunas,
    criar: criarColuna,
    atualizar: atualizarColuna,
    excluir: excluirColuna,
  } = useColunas(quadroId);

  const {
    cartoesDaColuna,
    criar: criarCartao,
    atualizar: atualizarCartao,
    excluir: excluirCartao,
    mover,
    reordenarNaColuna,
    buscar: refreshCartoes,
  } = useCartoes(quadroId);

  const {
    etiquetas,
    criar: criarEtiqueta,
    excluir: excluirEtiqueta,
  } = useEtiquetasWorkspace(workspaceId || `quadro-${quadroId}`);

  const {
    membros,
    criar: criarMembro,
  } = useMembrosWorkspace(workspaceId || `quadro-${quadroId}`);

  const [cartaoSelecionado, setCartaoSelecionado] =
    useState<CartaoComResumo | null>(null);
  const [cartaoArrastando, setCartaoArrastando] =
    useState<CartaoComResumo | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ texto: "", etiquetaIds: [], membroIds: [] });
  const [alertaBloqueio, setAlertaBloqueio] = useState<string | null>(null);

  function cartoesFiltrados(colunaId: string) {
    return cartoesDaColuna(colunaId).filter((card) => {
      if (filtros.texto && !card.titulo.toLowerCase().includes(filtros.texto.toLowerCase())) return false;
      if (filtros.etiquetaIds.length > 0 && !filtros.etiquetaIds.some((id) => card.etiqueta_ids.includes(id))) return false;
      if (filtros.membroIds.length > 0 && !filtros.membroIds.some((id) => card.membro_ids.includes(id))) return false;
      return true;
    });
  }

  const colunaIds = useMemo(
    () => colunas.map((c) => `coluna-${c.id}`),
    [colunas]
  );

  const handleCriarCartao = useCallback(
    (colunaId: string, titulo: string, peso?: number | null) => criarCartao(colunaId, titulo, peso),
    [criarCartao]
  );

  const handleCriarColuna = useCallback(
    (nome: string) => criarColuna(nome),
    [criarColuna]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === "cartao") {
      setCartaoArrastando(data.cartao);
    }
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "cartao") return;

    const cartaoAtivo = activeData.cartao as CartaoComResumo;

    if (overData?.type === "cartao") {
      const cartaoAlvo = overData.cartao as CartaoComResumo;
      if (cartaoAtivo.coluna_id !== cartaoAlvo.coluna_id && cartaoAlvo.coluna_id) {
        const cartoesAlvo = cartoesDaColuna(cartaoAlvo.coluna_id);
        const indiceAlvo = cartoesAlvo.findIndex(
          (c) => c.id === cartaoAlvo.id
        );
        const result = await mover(cartaoAtivo.id, cartaoAlvo.coluna_id, indiceAlvo);
        if (result?.blocked) {
          setAlertaBloqueio(result.reason || "Ação bloqueada.");
          setTimeout(() => setAlertaBloqueio(null), 4000);
        }
      }
    }

    if (overData?.type === "coluna") {
      const colunaAlvo = overData.coluna;
      if (cartaoAtivo.coluna_id !== colunaAlvo.id) {
        const cartoesAlvo = cartoesDaColuna(colunaAlvo.id);
        const result = await mover(cartaoAtivo.id, colunaAlvo.id, cartoesAlvo.length);
        if (result?.blocked) {
          setAlertaBloqueio(result.reason || "Ação bloqueada.");
          setTimeout(() => setAlertaBloqueio(null), 4000);
        }
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setCartaoArrastando(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "cartao" && overData?.type === "cartao") {
      const cartaoAtivo = activeData.cartao as CartaoComResumo;
      const cartaoAlvo = overData.cartao as CartaoComResumo;

      if (cartaoAtivo.id === cartaoAlvo.id) return;

      const colunaId = cartaoAlvo.coluna_id;
      if (!colunaId) return;
      const cartoesColuna = cartoesDaColuna(colunaId);

      const indiceAntigo = cartoesColuna.findIndex(
        (c) => c.id === cartaoAtivo.id
      );
      const indiceNovo = cartoesColuna.findIndex(
        (c) => c.id === cartaoAlvo.id
      );

      if (indiceAntigo !== -1 && indiceNovo !== -1) {
        const reordenados = [...cartoesColuna];
        const [movido] = reordenados.splice(indiceAntigo, 1);
        reordenados.splice(indiceNovo, 0, movido);
        reordenarNaColuna(colunaId, reordenados);
      }
    }
  }

  if (carregandoColunas) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
      </div>
    );
  }

  return (
    <>
      {/* Toast de bloqueio */}
      {alertaBloqueio && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-[12px] text-sm font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
          style={{
            background: "var(--tf-danger, #ef4444)",
            color: "#fff",
          }}
        >
          <span>⚠</span>
          {alertaBloqueio}
          <button
            onClick={() => setAlertaBloqueio(null)}
            className="ml-2 p-0.5 rounded-full bg-white/20 hover:bg-white/30 border-none cursor-pointer text-white text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden px-4 lg:px-6">
          {/* Barra de filtros */}
          <div className="pt-4 pb-3 shrink-0 relative">
            <BarraFiltros filtros={filtros} onChange={setFiltros} etiquetas={etiquetas} membros={membros} />
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6 no-scrollbar">
            <div className="flex gap-4 items-start h-full pt-1">
              <SortableContext
                items={colunaIds}
                strategy={horizontalListSortingStrategy}
              >
                {colunas.map((coluna, index) => (
                  <Coluna
                    key={coluna.id}
                    coluna={coluna}
                    index={index}
                    cartoes={cartoesFiltrados(coluna.id)}
                    etiquetas={etiquetas}
                    membros={membros}
                    onCriarCartao={handleCriarCartao}
                    onCartaoClick={setCartaoSelecionado}
                    onRenomear={(nome) => atualizarColuna(coluna.id, { nome })}
                    onExcluir={() => excluirColuna(coluna.id)}
                  />
                ))}
              </SortableContext>
              <NovaColuna onCriar={handleCriarColuna} />
            </div>
          </div>
        </div>

        <DragOverlay>
          {cartaoArrastando && (
            <div className="rotate-3 w-[256px]">
              <Cartao
                cartao={cartaoArrastando}
                etiquetas={etiquetas}
                membros={membros}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DetalheCartao
        cartao={cartaoSelecionado}
        etiquetas={etiquetas}
        membros={membros}
        quadroId={quadroId}
        onFechar={() => setCartaoSelecionado(null)}
        onAtualizar={atualizarCartao}
        onExcluir={excluirCartao}
        onCriarEtiqueta={criarEtiqueta}
        onExcluirEtiqueta={excluirEtiqueta}
        onCriarMembro={criarMembro}
        onRefresh={refreshCartoes}
      />
    </>
  );
}
