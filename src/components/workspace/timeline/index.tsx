"use client";

import { Quadro } from "@/types";
import { useQuadros } from "@/hooks/use-quadros";
import { useSprintDependencies } from "@/hooks/use-sprint-dependencies";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useMemo, useRef, useState, useCallback } from "react";
import {
  diasEntreRound as diasEntre,
  formatarMes,
  formatarDataCurta as formatarData,
} from "@/lib/datas";

import type { Zoom, SprintRect, TimelineViewProps } from "./_lib/types";
import { renderDependencyPath, progressoSprint } from "./_lib/helpers";
import { useTimelineDrag } from "./use-timeline-drag";

export function TimelineView({
  sprints,
  cartoesDaSprint,
  onSprintClick,
  workspaceId,
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<Zoom>("mes");
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { atualizar: atualizarQuadro } = useQuadros();
  const { deps, criar: criarDep, remover: removerDep } =
    useSprintDependencies(workspaceId);

  // Filtrar sprints com datas
  const sprintsComDatas = useMemo(
    () =>
      sprints
        .filter((s) => s.data_inicio && s.data_fim)
        .sort(
          (a, b) =>
            new Date(a.data_inicio!).getTime() -
            new Date(b.data_inicio!).getTime()
        ),
    [sprints]
  );

  const sprintsSemDatas = useMemo(
    () => sprints.filter((s) => !s.data_inicio || !s.data_fim),
    [sprints]
  );

  // Range da timeline
  const { inicioTimeline, fimTimeline, totalDias } = useMemo(() => {
    if (sprintsComDatas.length === 0) {
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 15);
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() + 30);
      return { inicioTimeline: inicio, fimTimeline: fim, totalDias: 45 };
    }

    const datas = sprintsComDatas.flatMap((s) => [
      new Date(s.data_inicio!),
      new Date(s.data_fim!),
    ]);
    const min = new Date(Math.min(...datas.map((d) => d.getTime())));
    const max = new Date(Math.max(...datas.map((d) => d.getTime())));

    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);

    return {
      inicioTimeline: min,
      fimTimeline: max,
      totalDias: diasEntre(min, max),
    };
  }, [sprintsComDatas]);

  // Dimensões
  const diaLargura = zoom === "semana" ? 40 : zoom === "mes" ? 20 : 6;
  const larguraTotal = totalDias * diaLargura;
  const alturaLinha = 56;
  const headerAltura = 48;
  const padding = { top: headerAltura + 12, left: 0 };

  const hoje = new Date();
  const hojeX = diasEntre(inicioTimeline, hoje) * diaLargura;

  // Sprint index map
  const sprintIndex = useMemo(() => {
    const map = new Map<string, number>();
    sprintsComDatas.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [sprintsComDatas]);

  // Hook de drag/dependencias
  const {
    drag,
    creatingDep,
    hoverSprintId,
    selectedDep,
    setHoverSprintId,
    setSelectedDep,
    iniciarDrag,
    iniciarCriacaoDep,
  } = useTimelineDrag({
    diaLargura,
    svgRef,
    atualizarQuadro,
    criarDep,
  });

  // Pegar dimensoes de uma sprint (com preview se em drag)
  const getSprintRect = useCallback(
    (sprint: Quadro): SprintRect => {
      let inicio = new Date(sprint.data_inicio!);
      let fim = new Date(sprint.data_fim!);

      if (drag && drag.sprintId === sprint.id) {
        inicio = drag.currentInicio;
        fim = drag.currentFim;
      }

      const x = diasEntre(inicioTimeline, inicio) * diaLargura;
      const w = Math.max(diasEntre(inicio, fim) * diaLargura, 40);
      const i = sprintIndex.get(sprint.id) || 0;
      const y = padding.top + i * alturaLinha + 12;
      const h = alturaLinha - 24;
      return { x, y, w, h, inicio, fim };
    },
    [drag, diaLargura, inicioTimeline, sprintIndex, padding.top]
  );

  // Markers do grid
  const markers = useMemo(() => {
    const result: { x: number; label: string; tipo: "mes" | "semana" }[] = [];
    const cursor = new Date(inicioTimeline);

    if (zoom === "semana" || zoom === "mes") {
      while (cursor <= fimTimeline) {
        const x = diasEntre(inicioTimeline, cursor) * diaLargura;
        if (cursor.getDay() === 1) {
          result.push({ x, label: formatarData(cursor), tipo: "semana" });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      cursor.setDate(1);
      cursor.setMonth(cursor.getMonth() + 1);
      while (cursor <= fimTimeline) {
        const x = diasEntre(inicioTimeline, cursor) * diaLargura;
        result.push({ x, label: formatarMes(cursor), tipo: "mes" });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    return result;
  }, [inicioTimeline, fimTimeline, diaLargura, zoom]);

  const mesesHeader = useMemo(() => {
    const result: { x: number; largura: number; label: string }[] = [];
    const cursor = new Date(inicioTimeline);
    cursor.setDate(1);

    while (cursor <= fimTimeline) {
      const mesInicio = new Date(cursor);
      const mesFim = new Date(cursor);
      mesFim.setMonth(mesFim.getMonth() + 1);
      mesFim.setDate(0);

      const xInicio = Math.max(
        0,
        diasEntre(inicioTimeline, mesInicio) * diaLargura
      );
      const xFim = Math.min(
        larguraTotal,
        diasEntre(inicioTimeline, mesFim) * diaLargura
      );

      result.push({
        x: xInicio,
        largura: xFim - xInicio,
        label: `${mesInicio.toLocaleDateString("pt-BR", {
          month: "long",
        })} ${mesInicio.getFullYear()}`,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [inicioTimeline, fimTimeline, diaLargura, larguraTotal]);

  const alturaConteudo = sprintsComDatas.length * alturaLinha + padding.top + 40;

  function scrollToHoje() {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = hojeX - scrollRef.current.clientWidth / 2;
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex p-0.5"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            {(["semana", "mes", "trimestre"] as Zoom[]).map((z) => {
              const ativo = zoom === z;
              return (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className="h-7 px-2.5 text-[0.6875rem] font-medium transition-colors"
                  style={{
                    background: ativo ? "var(--tf-surface)" : "transparent",
                    color: ativo ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                    border: ativo ? "1px solid var(--tf-border)" : "1px solid transparent",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {z === "semana" ? "Semana" : z === "mes" ? "Mês" : "Trimestre"}
                </button>
              );
            })}
          </div>

          <div
            className="hidden md:block text-[0.6875rem] px-2.5 h-7 flex items-center"
            style={{
              background: "var(--tf-accent-light)",
              color: "var(--tf-accent-text)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
              lineHeight: "calc(1.75rem - 2px)",
            }}
          >
            Arraste barras p/ mover · borda direita cria dependências
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={scrollToHoje}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent-light)",
              color: "var(--tf-accent-text)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Clock size={11} strokeWidth={1.75} /> Hoje
          </button>

          <button
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollLeft -= 200;
            }}
            className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            aria-label="Anterior"
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollLeft += 200;
            }}
            className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            aria-label="Próximo"
          >
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Drag preview tooltip */}
      {drag && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 h-8 flex items-center z-[100] text-[0.75rem] font-medium"
          style={{
            background: "var(--tf-surface-raised)",
            color: "var(--tf-text)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
            boxShadow: "var(--tf-shadow-lg)",
          }}
        >
          {formatarData(drag.currentInicio)} → {formatarData(drag.currentFim)}
          {" · "}
          {diasEntre(drag.currentInicio, drag.currentFim)}d
        </div>
      )}

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        {sprintsComDatas.length === 0 && sprintsSemDatas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Calendar
              size={24}
              strokeWidth={1.5}
              style={{ color: "var(--tf-border-strong)" }}
            />
            <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
              Nenhuma sprint ainda
            </p>
            <p
              className="text-[0.75rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              Crie sprints com datas para visualizá-las na timeline
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={larguraTotal}
            height={alturaConteudo}
            className="select-none"
            onClick={() => setSelectedDep(null)}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="var(--tf-text-tertiary)" />
              </marker>
              <marker
                id="arrowhead-warn"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="var(--tf-danger)" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="var(--tf-accent)" />
              </marker>
            </defs>

            {/* Mês headers */}
            {mesesHeader.map((m, i) => (
              <g key={i}>
                <rect
                  x={m.x}
                  y={0}
                  width={m.largura}
                  height={headerAltura}
                  fill={
                    i % 2 === 0 ? "var(--tf-bg-secondary)" : "var(--tf-surface)"
                  }
                  opacity={0.5}
                />
                <text
                  x={m.x + m.largura / 2}
                  y={headerAltura / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[11px] font-bold uppercase tracking-wider"
                  fill="var(--tf-text-tertiary)"
                >
                  {m.label}
                </text>
              </g>
            ))}

            {/* Grid lines */}
            {markers.map((m, i) => (
              <line
                key={i}
                x1={m.x}
                y1={headerAltura}
                x2={m.x}
                y2={alturaConteudo}
                stroke="var(--tf-border)"
                strokeWidth={0.5}
                opacity={0.5}
              />
            ))}

            {/* Alternating row backgrounds */}
            {sprintsComDatas.map((_, i) => (
              <rect
                key={i}
                x={0}
                y={padding.top + i * alturaLinha}
                width={larguraTotal}
                height={alturaLinha}
                fill={i % 2 === 0 ? "transparent" : "var(--tf-bg-secondary)"}
                opacity={0.2}
              />
            ))}

            {/* Today line */}
            {hojeX > 0 && hojeX < larguraTotal && (
              <g>
                <line
                  x1={hojeX}
                  y1={headerAltura}
                  x2={hojeX}
                  y2={alturaConteudo}
                  stroke="var(--tf-danger)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
                <rect
                  x={hojeX - 22}
                  y={headerAltura + 2}
                  width={44}
                  height={16}
                  rx={8}
                  fill="var(--tf-danger)"
                />
                <text
                  x={hojeX}
                  y={headerAltura + 12}
                  textAnchor="middle"
                  className="text-[8px] font-black uppercase tracking-wider"
                  fill="white"
                >
                  HOJE
                </text>
              </g>
            )}

            {/* DEPENDENCIAS (renderizar antes das barras) */}
            {deps.map((dep) => {
              const origem = sprintsComDatas.find(
                (s) => s.id === dep.sprint_origem
              );
              const destino = sprintsComDatas.find(
                (s) => s.id === dep.sprint_destino
              );
              if (!origem || !destino) return null;

              const rOrigem = getSprintRect(origem);
              const rDestino = getSprintRect(destino);
              const fromX = rOrigem.x + rOrigem.w;
              const fromY = rOrigem.y + rOrigem.h / 2;
              const toX = rDestino.x;
              const toY = rDestino.y + rDestino.h / 2;

              // Validacao: destino comeca antes do fim do origem?
              const violacao = rDestino.inicio < rOrigem.fim;
              const cor = violacao
                ? "var(--tf-danger)"
                : "var(--tf-text-tertiary)";
              const marker = violacao ? "arrowhead-warn" : "arrowhead";
              const isSelected = selectedDep === dep.id;

              return (
                <g key={dep.id}>
                  <path
                    d={renderDependencyPath(fromX, fromY, toX, toY)}
                    fill="none"
                    stroke={cor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    opacity={isSelected ? 1 : 0.7}
                    markerEnd={`url(#${marker})`}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDep(isSelected ? null : dep.id);
                    }}
                  />
                  {/* Click area mais larga */}
                  <path
                    d={renderDependencyPath(fromX, fromY, toX, toY)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDep(isSelected ? null : dep.id);
                    }}
                  />
                  {/* Botao remover */}
                  {isSelected && (
                    <g
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removerDep(dep.id);
                        setSelectedDep(null);
                      }}
                    >
                      <circle
                        cx={(fromX + toX) / 2}
                        cy={(fromY + toY) / 2}
                        r={10}
                        fill="var(--tf-danger)"
                      />
                      <text
                        x={(fromX + toX) / 2}
                        y={(fromY + toY) / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={14}
                        fontWeight="bold"
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* DEPENDENCIA EM CRIACAO */}
            {creatingDep && (
              <path
                d={renderDependencyPath(
                  creatingDep.fromX,
                  creatingDep.fromY,
                  creatingDep.toX,
                  creatingDep.toY
                )}
                fill="none"
                stroke="var(--tf-accent)"
                strokeWidth={2}
                strokeDasharray="4 3"
                markerEnd="url(#arrowhead-active)"
                opacity={0.8}
                pointerEvents="none"
              />
            )}

            {/* Sprint bars */}
            {sprintsComDatas.map((sprint) => {
              const rect = getSprintRect(sprint);
              const progresso = progressoSprint(sprint, cartoesDaSprint);
              const cards = cartoesDaSprint(sprint.id);
              const isDragging = drag?.sprintId === sprint.id;
              const isHover = hoverSprintId === sprint.id;
              const isCreatingTarget =
                creatingDep &&
                creatingDep.fromSprintId !== sprint.id &&
                isHover;

              return (
                <g
                  key={sprint.id}
                  onMouseEnter={() => setHoverSprintId(sprint.id)}
                  onMouseLeave={() => setHoverSprintId(null)}
                >
                  {/* Bar background */}
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={2}
                    fill={sprint.cor}
                    opacity={sprint.status_sprint === "concluida" ? 0.4 : 0.85}
                    stroke={
                      isDragging || isCreatingTarget
                        ? "var(--tf-accent)"
                        : "transparent"
                    }
                    strokeWidth={2}
                    style={{ cursor: "grab" }}
                    onMouseDown={(e) => iniciarDrag(e, sprint, "move")}
                    onDoubleClick={() => onSprintClick(sprint.id)}
                  />

                  {/* Progress fill */}
                  {progresso > 0 && progresso < 100 && (
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.w * (progresso / 100)}
                      height={rect.h}
                      rx={2}
                      fill={sprint.cor}
                      opacity={1}
                      pointerEvents="none"
                    />
                  )}

                  {/* Sprint name */}
                  <text
                    x={rect.x + 12}
                    y={rect.y + rect.h / 2 + 1}
                    dominantBaseline="middle"
                    className="text-[11px] font-bold"
                    fill="white"
                    pointerEvents="none"
                  >
                    {sprint.nome.length > rect.w / 7
                      ? sprint.nome.slice(0, Math.floor(rect.w / 7)) + "…"
                      : sprint.nome}
                  </text>

                  {rect.w > 100 && (
                    <text
                      x={rect.x + rect.w - 8}
                      y={rect.y + rect.h / 2 + 1}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-[9px] font-bold"
                      fill="rgba(255,255,255,0.8)"
                      pointerEvents="none"
                    >
                      {cards.length} cards · {progresso}%
                    </text>
                  )}

                  {/* Resize handle ESQUERDA */}
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={6}
                    height={rect.h}
                    fill="transparent"
                    style={{ cursor: "ew-resize" }}
                    onMouseDown={(e) => iniciarDrag(e, sprint, "resize-start")}
                  />

                  {/* Resize handle DIREITA */}
                  <rect
                    x={rect.x + rect.w - 6}
                    y={rect.y}
                    width={6}
                    height={rect.h}
                    fill="transparent"
                    style={{ cursor: "ew-resize" }}
                    onMouseDown={(e) => iniciarDrag(e, sprint, "resize-end")}
                  />

                  {/* Handle de dependencia (borda direita, aparece no hover) */}
                  {(isHover || creatingDep?.fromSprintId === sprint.id) && (
                    <circle
                      cx={rect.x + rect.w}
                      cy={rect.y + rect.h / 2}
                      r={5}
                      fill="var(--tf-accent)"
                      stroke="white"
                      strokeWidth={2}
                      style={{ cursor: "crosshair" }}
                      onMouseDown={(e) => iniciarCriacaoDep(e, sprint, rect)}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Sprints sem datas */}
      {sprintsSemDatas.length > 0 && (
        <div className="space-y-2">
          <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
            Sem datas definidas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sprintsSemDatas.map((s) => (
              <button
                key={s.id}
                onClick={() => onSprintClick(s.id)}
                className="flex items-center gap-2 h-8 px-2.5 text-[0.75rem] font-medium transition-colors"
                style={{
                  border: "1px solid var(--tf-border)",
                  color: "var(--tf-text-secondary)",
                  background: "var(--tf-surface)",
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "-0.005em",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--tf-accent)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--tf-border)")
                }
              >
                <div
                  className="w-2 h-2 shrink-0"
                  style={{ background: s.cor, borderRadius: "1px" }}
                />
                {s.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
