"use client";

import { CartaoComResumo, useCartoes } from "@/hooks/use-cartoes";
import { toast } from "@/hooks/use-toast";
import { useColunas } from "@/hooks/use-colunas";
import { useEtiquetasWorkspace } from "@/hooks/use-etiquetas-workspace";
import { useMembrosWorkspace } from "@/hooks/use-membros-workspace";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarraFiltros, Filtros } from "./barra-filtros";
import { Cartao } from "./cartao";
import { Coluna } from "./coluna";
import { NovaColuna } from "./nova-coluna";
import { ViewSwitcher, type ViewMode } from "./view-switcher";
import { ListaView } from "./lista-view";
import { TabelaView } from "./tabela-view";

const DetalheCartao = dynamic(
  () => import("./detalhe-cartao").then((m) => m.DetalheCartao),
  { ssr: false }
);

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
  } = useEtiquetasWorkspace(workspaceId || "");

  const {
    membros,
    criar: criarMembro,
  } = useMembrosWorkspace(workspaceId || "");

  const [cartaoSelecionado, setCartaoSelecionado] =
    useState<CartaoComResumo | null>(null);
  const [cartaoArrastando, setCartaoArrastando] =
    useState<CartaoComResumo | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ texto: "", etiquetaIds: [], membroIds: [] });
  const [alertaBloqueio, setAlertaBloqueio] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("kanban");

  // Carregar view persistida do localStorage por sprint. set-state-in-effect
  // intencional: lê localStorage que não existe em SSR.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`tf_view_${quadroId}`);
    if (saved === "kanban" || saved === "lista" || saved === "tabela") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(saved);
    }
  }, [quadroId]);

  function handleViewChange(v: ViewMode) {
    setView(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(`tf_view_${quadroId}`, v);
    }
  }

  const cartoesFiltradosPorColuna = useMemo(() => {
    const textoLower = filtros.texto.toLowerCase();
    const map: Record<string, CartaoComResumo[]> = {};
    for (const coluna of colunas) {
      map[coluna.id] = cartoesDaColuna(coluna.id).filter((card) => {
        if (textoLower && !card.titulo.toLowerCase().includes(textoLower)) return false;
        if (filtros.etiquetaIds.length > 0 && !filtros.etiquetaIds.some((id) => card.etiqueta_ids.includes(id))) return false;
        if (filtros.membroIds.length > 0 && !filtros.membroIds.some((id) => card.membro_ids.includes(id))) return false;
        return true;
      });
    }
    return map;
  }, [colunas, filtros, cartoesDaColuna]);

  function cartoesFiltrados(colunaId: string) {
    return cartoesFiltradosPorColuna[colunaId] || [];
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

  const handleRenomearColuna = useCallback(
    (colunaId: string, nome: string) => atualizarColuna(colunaId, { nome }),
    [atualizarColuna]
  );

  const handleExcluirColuna = useCallback(
    (colunaId: string) => excluirColuna(colunaId),
    [excluirColuna]
  );

  const handleFecharDetalhe = useCallback(
    () => setCartaoSelecionado(null),
    []
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Pipeline de collision detection permissiva:
  //   pointerWithin → rectIntersection → closestCorners
  // A ultima camada (closestCorners) nunca retorna vazio: mesmo que o
  // cursor caia num gap entre colunas na hora do drop, resolve pra
  // coluna mais proxima. Sem isso, o drop silenciosamente nao fazia
  // nada quando o user soltava um pouco fora.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const withinPointer = pointerWithin(args);
    if (withinPointer.length > 0) return withinPointer;
    const rectInt = rectIntersection(args);
    if (rectInt.length > 0) return rectInt;
    return closestCorners(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === "cartao") {
      setCartaoArrastando(data.cartao);
    }
  }

  // Durante o drag, o DragOverlay renderiza um "fantasma" do cartao
  // seguindo o cursor — isso ja e feedback suficiente. Nao movemos o
  // cartao entre colunas aqui: se movessemos, cada cruzada de borda
  // disparava mover() e o cartao teleportava. Todo o commit acontece
  // no handleDragEnd.
  function handleDragOver(_event: DragOverEvent) {
    // no-op intencional
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setCartaoArrastando(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "cartao") return;
    const cartaoAtivo = activeData.cartao as CartaoComResumo;

    // Resolve coluna alvo + indice dentro dela
    let colunaAlvoId: string | null = null;
    let indiceAlvo: number = 0;

    if (overData?.type === "cartao") {
      const cartaoAlvo = overData.cartao as CartaoComResumo;
      if (cartaoAlvo.id === cartaoAtivo.id) return;
      if (!cartaoAlvo.coluna_id) return;
      colunaAlvoId = cartaoAlvo.coluna_id;
      const cartoesAlvo = cartoesDaColuna(cartaoAlvo.coluna_id);
      indiceAlvo = cartoesAlvo.findIndex((c) => c.id === cartaoAlvo.id);
    } else if (overData?.type === "coluna") {
      colunaAlvoId = overData.coluna.id;
      indiceAlvo = cartoesDaColuna(overData.coluna.id).length;
    }

    if (!colunaAlvoId) return;

    const mesmaColuna = colunaAlvoId === cartaoAtivo.coluna_id;

    if (mesmaColuna) {
      // Reorder dentro da mesma coluna
      const cartoesCol = cartoesDaColuna(colunaAlvoId);
      const idxAtivo = cartoesCol.findIndex((c) => c.id === cartaoAtivo.id);
      if (idxAtivo === -1 || idxAtivo === indiceAlvo) return;
      const reordenados = [...cartoesCol];
      const [movido] = reordenados.splice(idxAtivo, 1);
      reordenados.splice(indiceAlvo, 0, movido);
      reordenarNaColuna(colunaAlvoId, reordenados);
    } else {
      // Move entre colunas
      try {
        const result = await mover(cartaoAtivo.id, colunaAlvoId, indiceAlvo);
        if (result?.blocked) {
          setAlertaBloqueio(result.reason || "Ação bloqueada.");
          setTimeout(() => setAlertaBloqueio(null), 4000);
        }
      } catch {
        toast.error("Erro ao mover cartão. Tente novamente.");
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
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-3.5 h-9 text-[0.8125rem] font-medium flex items-center gap-2.5"
          style={{
            background: "var(--tf-surface-raised)",
            color: "var(--tf-text)",
            border: "1px solid var(--tf-danger)",
            borderLeft: "3px solid var(--tf-danger)",
            borderRadius: "var(--tf-radius-md)",
            boxShadow: "var(--tf-shadow-lg)",
          }}
        >
          <span style={{ color: "var(--tf-danger)" }}>⚠</span>
          {alertaBloqueio}
          <button
            onClick={() => setAlertaBloqueio(null)}
            className="ml-1 p-0.5 transition-colors hover:text-[var(--tf-text)]"
            style={{ color: "var(--tf-text-tertiary)" }}
            aria-label="Fechar alerta"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar: View Switcher + Barra de filtros */}
        <div className="pt-4 pb-3 shrink-0 px-4 lg:px-6 flex items-center gap-3 flex-wrap">
          <ViewSwitcher view={view} onChange={handleViewChange} />
          <div className="flex-1 min-w-0">
            <BarraFiltros filtros={filtros} onChange={setFiltros} etiquetas={etiquetas} membros={membros} />
          </div>
        </div>

        {/* View: Kanban */}
        {view === "kanban" && (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 flex flex-col overflow-hidden px-3 md:px-4 lg:px-6">
              <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6 no-scrollbar snap-x snap-mandatory md:snap-none">
                <div className="flex gap-3 md:gap-4 items-start h-full pt-1">
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
                        onRenomear={(nome) => handleRenomearColuna(coluna.id, nome)}
                        onExcluir={() => handleExcluirColuna(coluna.id)}
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
        )}

        {/* View: Lista */}
        {view === "lista" && (
          <ListaView
            colunas={colunas}
            cartoesFiltradosPorColuna={cartoesFiltradosPorColuna}
            etiquetas={etiquetas}
            membros={membros}
            onCartaoClick={setCartaoSelecionado}
          />
        )}

        {/* View: Tabela */}
        {view === "tabela" && (
          <TabelaView
            colunas={colunas}
            cartoesFiltradosPorColuna={cartoesFiltradosPorColuna}
            etiquetas={etiquetas}
            membros={membros}
            onCartaoClick={setCartaoSelecionado}
          />
        )}
      </div>

      <DetalheCartao
        cartao={cartaoSelecionado}
        etiquetas={etiquetas}
        membros={membros}
        quadroId={quadroId}
        onFechar={handleFecharDetalhe}
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
