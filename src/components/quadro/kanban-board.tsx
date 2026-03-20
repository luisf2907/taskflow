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

  // Etiquetas e membros pertencem ao workspace (compartilhados entre sprints)
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

  // Filtrar cartões por coluna com filtros aplicados
  function cartoesFiltrados(colunaId: string) {
    return cartoesDaColuna(colunaId).filter((card) => {
      if (filtros.texto && !card.titulo.toLowerCase().includes(filtros.texto.toLowerCase())) return false;
      if (filtros.etiquetaIds.length > 0 && !filtros.etiquetaIds.some((id) => card.etiqueta_ids.includes(id))) return false;
      if (filtros.membroIds.length > 0 && !filtros.membroIds.some((id) => card.membro_ids.includes(id))) return false;
      return true;
    });
  }

  // Memoizar IDs das colunas para evitar re-render do SortableContext
  const colunaIds = useMemo(
    () => colunas.map((c) => `coluna-${c.id}`),
    [colunas]
  );

  // Callbacks estáveis para evitar re-render de NovoCartao/NovaColuna
  const handleCriarCartao = useCallback(
    (colunaId: string, titulo: string) => criarCartao(colunaId, titulo),
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

  function handleDragOver(event: DragOverEvent) {
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
        mover(cartaoAtivo.id, cartaoAlvo.coluna_id, indiceAlvo);
      }
    }

    if (overData?.type === "coluna") {
      const colunaAlvo = overData.coluna;
      if (cartaoAtivo.coluna_id !== colunaAlvo.id) {
        const cartoesAlvo = cartoesDaColuna(colunaAlvo.id);
        mover(cartaoAtivo.id, colunaAlvo.id, cartoesAlvo.length);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de filtros */}
          <div className="px-6 pt-4 pb-2 shrink-0 relative">
            <BarraFiltros filtros={filtros} onChange={setFiltros} etiquetas={etiquetas} membros={membros} />
          </div>

          <div className="flex-1 overflow-x-auto px-6 pb-6">
          <div className="flex gap-4 items-start h-full">
            <SortableContext
              items={colunaIds}
              strategy={horizontalListSortingStrategy}
            >
              {colunas.map((coluna) => (
                <Coluna
                  key={coluna.id}
                  coluna={coluna}
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
