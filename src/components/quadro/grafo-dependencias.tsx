"use client";

import { useGrafoDependencias, GrafoNo } from "@/hooks/use-grafo-dependencias";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { CheckCircle2, Lock, X } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { EpicoMarker } from "./epico-marker";
import { aoAtivarPorTeclado } from "@/lib/a11y";

// =============================================
// Layout com dagre (DAG top-down)
// =============================================
const NODE_W = 200;
const NODE_H = 56;

function layout(nos: GrafoNo[], arestas: { origem: string; destino: string }[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 28 });

  for (const n of nos) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  // Aresta: destino (pré-requisito) → origem (dependente). Fluxo de desbloqueio.
  for (const a of arestas) g.setEdge(a.destino, a.origem);

  dagre.layout(g);

  const pos: Record<string, { x: number; y: number }> = {};
  for (const n of nos) {
    const node = g.node(n.id);
    if (node) pos[n.id] = { x: node.x - NODE_W / 2, y: node.y - NODE_H / 2 };
  }
  return pos;
}

// =============================================
// Nó customizado
// =============================================
interface NoData extends Record<string, unknown> {
  no: GrafoNo;
  isFocus: boolean;
  onAbrir: (id: string) => void;
}

function CardNode({ data }: NodeProps<Node<NoData>>) {
  const { no, isFocus, onAbrir } = data;
  const concluido = !!no.data_conclusao;

  return (
    <div
      onClick={() => onAbrir(no.id)}
      onKeyDown={aoAtivarPorTeclado(() => onAbrir(no.id))}
      role="button"
      tabIndex={0}
      className="relative cursor-pointer transition-transform hover:scale-[1.02]"
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: "var(--tf-surface)",
        borderWidth: isFocus ? "2px" : "1px",
        borderStyle: "solid",
        borderColor: isFocus
          ? "var(--tf-accent)"
          : concluido
            ? "var(--tf-success)"
            : "var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
        boxShadow: isFocus ? "var(--tf-shadow-md)" : "var(--tf-shadow-sm)",
        padding: "8px 10px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Bolinha do épico */}
      {no.cor_epico && (
        <div className="absolute top-1.5 right-1.5">
          <EpicoMarker cor={no.cor_epico} titulo={null} enfase={no.eh_epico} tamanho={9} />
        </div>
      )}

      <div className="flex items-start gap-1.5">
        {concluido ? (
          <CheckCircle2
            size={12}
            strokeWidth={2}
            style={{ color: "var(--tf-success)", marginTop: 1, flexShrink: 0 }}
          />
        ) : (
          <Lock
            size={11}
            strokeWidth={1.75}
            style={{ color: "var(--tf-text-tertiary)", marginTop: 1, flexShrink: 0, opacity: 0.5 }}
          />
        )}
        <span
          className="text-[0.75rem] font-medium leading-snug"
          style={{
            color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
            textDecoration: concluido ? "line-through" : "none",
            letterSpacing: "-0.005em",
            paddingRight: no.cor_epico ? "10px" : undefined,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {no.titulo}
        </span>
      </div>

      {/* Contexto: sprint · coluna */}
      <div
        className="mt-1 text-[0.5625rem] truncate"
        style={{
          color: "var(--tf-text-tertiary)",
          fontFamily: "var(--tf-font-mono)",
        }}
      >
        {no.quadro_nome || "Backlog"}
        {no.coluna_nome && ` · ${no.coluna_nome}`}
      </div>
    </div>
  );
}

const nodeTypes = { card: CardNode };

// =============================================
// GrafoCanvas — ReactFlow + layout + legenda, reutilizável
// (usado pelo overlay foco-no-card e pela view global de deps)
// =============================================
interface GrafoCanvasProps {
  nos: GrafoNo[];
  arestas: { origem: string; destino: string }[];
  carregando: boolean;
  onAbrirNo: (id: string) => void;
  /** id do card em destaque (borda accent); null na view global */
  focoId?: string | null;
  emptyMsg?: string;
}

export function GrafoCanvas({
  nos,
  arestas,
  carregando,
  onAbrirNo,
  focoId = null,
  emptyMsg = "Nenhuma dependência pra mostrar",
}: GrafoCanvasProps) {
  const { rfNodes, rfEdges } = useMemo(() => {
    const pos = layout(nos, arestas);
    const rfNodes: Node<NoData>[] = nos.map((no) => ({
      id: no.id,
      type: "card",
      position: pos[no.id] || { x: 0, y: 0 },
      data: { no, isFocus: no.id === focoId, onAbrir: onAbrirNo },
    }));
    const rfEdges: Edge[] = arestas.map((a, i) => ({
      id: `e-${i}`,
      source: a.destino, // pré-requisito → dependente
      target: a.origem,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: "var(--tf-border-strong)", strokeWidth: 1.5 },
      animated: false,
    }));
    return { rfNodes, rfEdges };
  }, [nos, arestas, focoId, onAbrirNo]);

  const isVazio = !carregando && nos.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 relative min-h-0">
        {carregando ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[0.75rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              Montando o grafo…
            </span>
          </div>
        ) : isVazio ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
            <Lock size={24} strokeWidth={1.5} style={{ color: "var(--tf-border-strong)" }} />
            <p
              className="text-[0.8125rem] font-medium text-center"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              {emptyMsg}
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {/* Legenda */}
      <div
        className="flex items-center gap-4 px-4 h-9 shrink-0 text-[0.625rem]"
        style={{
          borderTop: "1px solid var(--tf-border)",
          color: "var(--tf-text-tertiary)",
          fontFamily: "var(--tf-font-mono)",
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 14,
              height: 0,
              borderTop: "1.5px solid var(--tf-border-strong)",
              display: "inline-block",
            }}
          />
          desbloqueia →
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 size={11} style={{ color: "var(--tf-success)" }} /> concluído
        </span>
        <span className="flex items-center gap-1">
          <Lock size={10} style={{ color: "var(--tf-text-tertiary)" }} /> pendente
        </span>
        <span className="ml-auto">{nos.length} cards · clique num nó pra abrir</span>
      </div>
    </div>
  );
}

// =============================================
// Overlay principal — foco em um card
// =============================================
interface Props {
  cartaoId: string;
  cartaoTitulo: string;
  onClose: () => void;
  onAbrirCartao: (id: string) => void;
}

export function GrafoDependenciasOverlay({
  cartaoId,
  cartaoTitulo,
  onClose,
  onAbrirCartao,
}: Props) {
  const { nos, arestas, carregando } = useGrafoDependencias(cartaoId);

  // ESC fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Clicar no nó-foco não faz nada (já está aberto atrás do overlay).
  const handleAbrir = useCallback(
    (id: string) => {
      if (id !== cartaoId) onAbrirCartao(id);
    },
    [cartaoId, onAbrirCartao]
  );

  return (
    // Backdrop. Fecha no clique, que e o caminho do MOUSE; o equivalente de
    // teclado e o Esc, verificado presente neste componente.
    // Nao leva role nem tabIndex — poe-lo na ordem de Tab colocaria uma
    // parada antes do conteudo do proprio dialogo.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-[120] flex flex-col"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        // Overlay de tela cheia: com viewportFit: "cover" o topo fica sob a
        // Dynamic Island e a base sobre a home indicator. Como e flex-col, o
        // padding aqui empurra a barra de ferramentas e o grafo de uma vez.
        // No desktop os dois env() sao 0.
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
        Existe so para o clique nao subir ao elemento clicavel do pai.
        Nao e um controle: dar role/tabIndex criaria uma parada fantasma no
        Tab, anunciada como botao, que nao faz nada ao ser ativada.
      */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="m-3 md:m-6 flex-1 flex flex-col overflow-hidden"
        style={{
          background: "var(--tf-bg)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--tf-border)",
          borderRadius: "var(--tf-radius-lg)",
          boxShadow: "var(--tf-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-12 shrink-0"
          style={{ borderBottom: "1px solid var(--tf-border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <h2
              className="text-[0.875rem] font-semibold truncate"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
            >
              Árvore de dependências
            </h2>
            <span
              className="text-[0.6875rem] truncate max-w-[280px]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              · {cartaoTitulo}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center transition-colors"
            style={{ color: "var(--tf-text-tertiary)", borderRadius: "var(--tf-radius-xs)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Fechar"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Canvas reutilizável */}
        <GrafoCanvas
          nos={nos}
          arestas={arestas}
          carregando={carregando}
          onAbrirNo={handleAbrir}
          focoId={cartaoId}
          emptyMsg="Este card não tem dependências"
        />
      </div>
    </div>
  );
}
