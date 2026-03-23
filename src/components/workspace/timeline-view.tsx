"use client";

import { Quadro } from "@/types";
import { CartaoBacklog } from "@/hooks/use-backlog";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useMemo, useRef, useState } from "react";

interface TimelineViewProps {
  sprints: Quadro[];
  cartoesDaSprint: (quadroId: string) => CartaoBacklog[];
  onSprintClick: (quadroId: string) => void;
}

type Zoom = "semana" | "mes" | "trimestre";

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatarMes(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function TimelineView({ sprints, cartoesDaSprint, onSprintClick }: TimelineViewProps) {
  const [zoom, setZoom] = useState<Zoom>("mes");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtrar sprints que têm datas
  const sprintsComDatas = useMemo(
    () => sprints.filter((s) => s.data_inicio && s.data_fim).sort(
      (a, b) => new Date(a.data_inicio!).getTime() - new Date(b.data_inicio!).getTime()
    ),
    [sprints]
  );

  const sprintsSemDatas = useMemo(
    () => sprints.filter((s) => !s.data_inicio || !s.data_fim),
    [sprints]
  );

  // Calcular range da timeline
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

    // Padding
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
  const alturaLinha = 52;
  const headerAltura = 48;
  const padding = { top: headerAltura + 12, left: 0 };

  // Hoje
  const hoje = new Date();
  const hojeX = diasEntre(inicioTimeline, hoje) * diaLargura;

  // Grid markers
  const markers = useMemo(() => {
    const result: { x: number; label: string; tipo: "mes" | "semana" }[] = [];
    const cursor = new Date(inicioTimeline);

    if (zoom === "semana") {
      // Marca cada dia, label a cada semana
      while (cursor <= fimTimeline) {
        const x = diasEntre(inicioTimeline, cursor) * diaLargura;
        if (cursor.getDay() === 1) {
          result.push({ x, label: formatarData(cursor), tipo: "semana" });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (zoom === "mes") {
      // Label a cada semana
      while (cursor <= fimTimeline) {
        const x = diasEntre(inicioTimeline, cursor) * diaLargura;
        if (cursor.getDay() === 1) {
          result.push({ x, label: formatarData(cursor), tipo: "semana" });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // Label a cada mês
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

  // Mês labels para header
  const mesesHeader = useMemo(() => {
    const result: { x: number; largura: number; label: string }[] = [];
    const cursor = new Date(inicioTimeline);
    cursor.setDate(1);

    while (cursor <= fimTimeline) {
      const mesInicio = new Date(cursor);
      const mesFim = new Date(cursor);
      mesFim.setMonth(mesFim.getMonth() + 1);
      mesFim.setDate(0); // último dia do mês

      const xInicio = Math.max(0, diasEntre(inicioTimeline, mesInicio) * diaLargura);
      const xFim = Math.min(larguraTotal, diasEntre(inicioTimeline, mesFim) * diaLargura);

      result.push({
        x: xInicio,
        largura: xFim - xInicio,
        label: `${mesInicio.toLocaleDateString("pt-BR", { month: "long" })} ${mesInicio.getFullYear()}`,
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

  // Progresso de uma sprint
  function progressoSprint(sprint: Quadro): number {
    const cards = cartoesDaSprint(sprint.id);
    if (cards.length === 0) return 0;
    const concluidos = cards.filter(
      (c) => c.coluna_nome?.toLowerCase().includes("conclu") || c.coluna_nome?.toLowerCase().includes("done")
    ).length;
    return Math.round((concluidos / cards.length) * 100);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Zoom control */}
          <div className="flex rounded-[8px] p-0.5" style={{ background: "var(--tf-bg-secondary)" }}>
            {(["semana", "mes", "trimestre"] as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-[8px] capitalize"
                style={{
                  background: zoom === z ? "var(--tf-surface)" : "transparent",
                  color: zoom === z ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                  boxShadow: zoom === z ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {z === "semana" ? "Semana" : z === "mes" ? "Mês" : "Trimestre"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scrollToHoje}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-[8px]"
            style={{
              background: "var(--tf-accent-light)",
              color: "var(--tf-accent-text)",
              transition: "opacity 0.15s ease",
            }}
          >
            <Clock size={12} /> Hoje
          </button>

          <button
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollLeft -= 200; }}
            className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollLeft += 200; }}
            className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-[20px] border no-scrollbar"
        style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      >
        {sprintsComDatas.length === 0 && sprintsSemDatas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Calendar size={32} style={{ color: "var(--tf-border)" }} />
            <p className="text-[14px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>
              Nenhuma sprint ainda
            </p>
            <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
              Crie sprints com datas para visualizá-las na timeline
            </p>
          </div>
        ) : (
          <svg width={larguraTotal} height={alturaConteudo} className="select-none">
            {/* Mês headers */}
            {mesesHeader.map((m, i) => (
              <g key={i}>
                <rect
                  x={m.x}
                  y={0}
                  width={m.largura}
                  height={headerAltura}
                  fill={i % 2 === 0 ? "var(--tf-bg-secondary)" : "var(--tf-surface)"}
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

            {/* Sprint bars */}
            {sprintsComDatas.map((sprint, i) => {
              const inicio = new Date(sprint.data_inicio!);
              const fim = new Date(sprint.data_fim!);
              const x = diasEntre(inicioTimeline, inicio) * diaLargura;
              const w = Math.max(diasEntre(inicio, fim) * diaLargura, 60);
              const y = padding.top + i * alturaLinha + 8;
              const h = alturaLinha - 16;
              const progresso = progressoSprint(sprint);
              const cards = cartoesDaSprint(sprint.id);
              const statusLabel = sprint.status_sprint === "ativa" ? "Ativa" : sprint.status_sprint === "concluida" ? "Concluída" : "Planejada";

              return (
                <g
                  key={sprint.id}
                  className="cursor-pointer"
                  onClick={() => onSprintClick(sprint.id)}
                  style={{ transition: "opacity 0.15s ease" }}
                >
                  {/* Bar background */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={8}
                    fill={sprint.cor}
                    opacity={sprint.status_sprint === "concluida" ? 0.4 : 0.85}
                  />

                  {/* Progress fill */}
                  {progresso > 0 && progresso < 100 && (
                    <rect
                      x={x}
                      y={y}
                      width={w * (progresso / 100)}
                      height={h}
                      rx={8}
                      fill={sprint.cor}
                      opacity={1}
                    />
                  )}

                  {/* Sprint name */}
                  <text
                    x={x + 12}
                    y={y + h / 2 + 1}
                    dominantBaseline="middle"
                    className="text-[11px] font-bold"
                    fill="white"
                  >
                    {sprint.nome.length > (w / 7) ? sprint.nome.slice(0, Math.floor(w / 7)) + "…" : sprint.nome}
                  </text>

                  {/* Status + info to the right of bar */}
                  {w > 100 && (
                    <text
                      x={x + w - 8}
                      y={y + h / 2 + 1}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-[9px] font-bold"
                      fill="rgba(255,255,255,0.8)"
                    >
                      {cards.length} cards · {progresso}%
                    </text>
                  )}

                  {/* Hover overlay */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={8}
                    fill="transparent"
                    className="hover:fill-white/10"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Sprints sem datas */}
      {sprintsSemDatas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
            Sem datas definidas
          </p>
          <div className="flex flex-wrap gap-2">
            {sprintsSemDatas.map((s) => (
              <button
                key={s.id}
                onClick={() => onSprintClick(s.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-[8px] border text-[12px] font-semibold hover:border-[var(--tf-accent)]"
                style={{
                  borderColor: "var(--tf-border)",
                  color: "var(--tf-text-secondary)",
                  background: "var(--tf-surface)",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: s.cor }} />
                {s.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
