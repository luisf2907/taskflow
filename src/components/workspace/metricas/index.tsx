"use client";

import { CartaoBacklog } from "@/hooks/use-backlog";
import { Etiqueta, Membro, Quadro } from "@/types";
import {
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Layers,
  CheckCircle2,
  Clock,
  Timer,
  Download,
  Calendar,
} from "lucide-react";
import { useMemo, useCallback } from "react";
import { diasEntreCeil as diasEntre } from "@/lib/datas";

import { StatCard } from "./stat-card";
import { LineChart } from "./line-chart";
import { DonutChart } from "./donut-chart";
import { BurndownChart } from "./burndown-chart";

interface MetricasProps {
  sprints: Quadro[];
  cartoesDaSprint: (quadroId: string) => CartaoBacklog[];
  backlogPuro: CartaoBacklog[];
  etiquetas: Etiqueta[];
  membros: Membro[];
}

export function MetricasWorkspace({
  sprints,
  cartoesDaSprint,
  backlogPuro,
  etiquetas,
  membros,
}: MetricasProps) {
  const sprintsConcl = useMemo(
    () => sprints.filter((s) => s.status_sprint === "concluida"),
    [sprints]
  );
  const sprintAtiva = useMemo(
    () => sprints.find((s) => s.status_sprint === "ativa"),
    [sprints]
  );
  const sprintsParaMetricas = useMemo(
    () => [...sprintsConcl, ...(sprintAtiva ? [sprintAtiva] : [])],
    [sprintsConcl, sprintAtiva]
  );

  // ── Velocity por sprint ──
  const velocityData = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      const totalPontos = cards.reduce((acc, c) => acc + (c.peso || 0), 0);
      const concluidos = cards.filter((c) => c.concluido);
      const pontosConcluidos = concluidos.reduce(
        (acc, c) => acc + (c.peso || 0),
        0
      );
      return {
        nome: s.nome,
        pontosConcluidos,
        totalPontos,
        status: s.status_sprint,
        totalCards: cards.length,
        cardsConcluidos: concluidos.length,
      };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Sprint ativa stats ──
  const ativaCards = useMemo(
    () => (sprintAtiva ? cartoesDaSprint(sprintAtiva.id) : []),
    [sprintAtiva, cartoesDaSprint]
  );
  const ativaPontosTotal = ativaCards.reduce((acc, c) => acc + (c.peso || 0), 0);
  const ativaConcluidos = ativaCards.filter((c) => c.concluido);
  const ativaPontosConcluidos = ativaConcluidos.reduce(
    (acc, c) => acc + (c.peso || 0),
    0
  );
  const ativaProgresso =
    ativaCards.length > 0
      ? Math.round((ativaConcluidos.length / ativaCards.length) * 100)
      : 0;

  // ── Velocity média ──
  const velocityMedia = useMemo(() => {
    const velocidades = sprintsConcl.map((s) => {
      const cards = cartoesDaSprint(s.id);
      return cards
        .filter((c) => c.concluido)
        .reduce((acc, c) => acc + (c.peso || 0), 0);
    });
    return velocidades.length > 0
      ? Math.round(velocidades.reduce((a, b) => a + b, 0) / velocidades.length)
      : 0;
  }, [sprintsConcl, cartoesDaSprint]);

  // ── Distribuição por status (sprint ativa) ──
  const statusData = useMemo(() => {
    if (!sprintAtiva) return [];
    const cards = cartoesDaSprint(sprintAtiva.id);
    const porColuna: Record<string, number> = {};
    for (const c of cards) {
      const nome = c.coluna_nome || "Sem coluna";
      porColuna[nome] = (porColuna[nome] || 0) + 1;
    }
    const cores = ["#60A5FA", "var(--tf-accent-yellow)", "#A78BFA", "var(--tf-success)", "var(--tf-danger)", "#FB923C"];
    return Object.entries(porColuna).map(([label, valor], i) => ({
      label,
      valor,
      cor: cores[i % cores.length],
    }));
  }, [sprintAtiva, cartoesDaSprint]);

  // ── Cards por membro (sprint ativa) ──
  const membroData = useMemo(() => {
    const todosCards = sprintAtiva ? cartoesDaSprint(sprintAtiva.id) : [];
    const porMembro: Record<
      string,
      { nome: string; cor: string; cards: number; pontos: number; concluidos: number }
    > = {};
    for (const card of todosCards) {
      for (const mId of card.membro_ids || []) {
        const m = membros.find((mb) => mb.id === mId);
        if (m) {
          if (!porMembro[mId])
            porMembro[mId] = {
              nome: m.nome,
              cor: m.cor_avatar,
              cards: 0,
              pontos: 0,
              concluidos: 0,
            };
          porMembro[mId].cards++;
          porMembro[mId].pontos += card.peso || 0;
          if (card.concluido) porMembro[mId].concluidos++;
        }
      }
    }
    return Object.values(porMembro).sort((a, b) => b.pontos - a.pontos);
  }, [sprintAtiva, cartoesDaSprint, membros]);

  // ── Distribuição por etiqueta ──
  const etiquetaStats = useMemo(() => {
    const todosCards = sprints.flatMap((s) => cartoesDaSprint(s.id));
    const porEtiqueta: Record<
      string,
      { nome: string; cor: string; count: number; pontos: number }
    > = {};
    for (const card of todosCards) {
      for (const eId of card.etiqueta_ids || []) {
        const et = etiquetas.find((e) => e.id === eId);
        if (et) {
          if (!porEtiqueta[eId])
            porEtiqueta[eId] = { nome: et.nome, cor: et.cor, count: 0, pontos: 0 };
          porEtiqueta[eId].count++;
          porEtiqueta[eId].pontos += card.peso || 0;
        }
      }
    }
    return Object.values(porEtiqueta).sort((a, b) => b.count - a.count);
  }, [sprints, cartoesDaSprint, etiquetas]);

  // ── Sprint completion rate ──
  const completionData = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      const total = cards.length;
      const concluidos = cards.filter((c) => c.concluido).length;
      return {
        label: s.nome,
        valor: total > 0 ? Math.round((concluidos / total) * 100) : 0,
      };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Velocity trend (line chart) ──
  const velocityTrend = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      return {
        label: s.nome,
        valor: cards
          .filter((c) => c.concluido)
          .reduce((acc, c) => acc + (c.peso || 0), 0),
      };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Lead Time (criado → concluído) ──
  const leadTimeData = useMemo(() => {
    const todosCards = sprints.flatMap((s) => cartoesDaSprint(s.id));
    const concluidos = todosCards.filter(
      (c) => c.concluido && c.data_conclusao && c.criado_em
    );
    if (concluidos.length === 0)
      return { media: 0, mediana: 0, min: 0, max: 0, total: 0 };

    const tempos = concluidos
      .map((c) => {
        const dias = diasEntre(new Date(c.criado_em), new Date(c.data_conclusao!));
        return Math.max(dias, 0);
      })
      .sort((a, b) => a - b);

    const soma = tempos.reduce((a, b) => a + b, 0);
    const media = Math.round((soma / tempos.length) * 10) / 10;
    const mediana =
      tempos.length % 2 === 0
        ? (tempos[tempos.length / 2 - 1] + tempos[tempos.length / 2]) / 2
        : tempos[Math.floor(tempos.length / 2)];

    return {
      media,
      mediana: Math.round(mediana * 10) / 10,
      min: tempos[0],
      max: tempos[tempos.length - 1],
      total: tempos.length,
    };
  }, [sprints, cartoesDaSprint]);

  // ── Cycle Time por Sprint ──
  const cycleTimePerSprint = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      const concluidos = cards.filter(
        (c) => c.concluido && c.data_conclusao && c.criado_em
      );
      if (concluidos.length === 0) return { label: s.nome, valor: 0 };

      const tempos = concluidos.map((c) =>
        Math.max(
          diasEntre(new Date(c.criado_em), new Date(c.data_conclusao!)),
          0
        )
      );
      const media =
        Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) /
        10;
      return { label: s.nome, valor: media };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Throughput Semanal (cards concluídos por semana) ──
  const throughputData = useMemo(() => {
    const todosCards = sprints.flatMap((s) => cartoesDaSprint(s.id));
    const concluidos = todosCards.filter((c) => c.concluido && c.data_conclusao);
    if (concluidos.length === 0) return [];

    // Agrupar por semana
    const porSemana: Record<string, number> = {};
    for (const c of concluidos) {
      const data = new Date(c.data_conclusao!);
      // Pegar segunda-feira da semana
      const dia = data.getDay();
      const segunda = new Date(data);
      segunda.setDate(data.getDate() - (dia === 0 ? 6 : dia - 1));
      const chave = segunda.toISOString().split("T")[0];
      porSemana[chave] = (porSemana[chave] || 0) + 1;
    }

    // Ordenar e pegar as últimas 12 semanas
    return Object.entries(porSemana)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([semana, count]) => {
        const d = new Date(semana);
        const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        return { label, valor: count };
      });
  }, [sprints, cartoesDaSprint]);

  // ── Export CSV ──
  const exportarCSV = useCallback(() => {
    const todosCards = sprints.flatMap((s) => {
      const cards = cartoesDaSprint(s.id);
      return cards.map((c) => ({ ...c, sprint_nome: s.nome }));
    });
    const backlogCards = backlogPuro.map((c) => ({ ...c, sprint_nome: "Backlog" }));
    const todos = [...todosCards, ...backlogCards];

    const header = [
      "Título",
      "Sprint",
      "Coluna",
      "Peso (pts)",
      "Status",
      "Criado em",
      "Concluído em",
      "Lead Time (dias)",
      "Etiquetas",
      "Membros",
    ];
    const rows = todos.map((c) => {
      const leadTime =
        c.concluido && c.data_conclusao && c.criado_em
          ? Math.max(
              diasEntre(new Date(c.criado_em), new Date(c.data_conclusao)),
              0
            )
          : "";
      const etqs = (c.etiqueta_ids || [])
        .map((id) => etiquetas.find((e) => e.id === id)?.nome || "")
        .filter(Boolean)
        .join("; ");
      const membs = (c.membro_ids || [])
        .map((id) => membros.find((m) => m.id === id)?.nome || "")
        .filter(Boolean)
        .join("; ");
      return [
        `"${(c.titulo || "").replace(/"/g, '""')}"`,
        `"${c.sprint_nome}"`,
        `"${c.coluna_nome || "Backlog"}"`,
        c.peso || 0,
        c.concluido ? "Concluído" : "Pendente",
        c.criado_em ? new Date(c.criado_em).toLocaleDateString("pt-BR") : "",
        c.data_conclusao
          ? new Date(c.data_conclusao).toLocaleDateString("pt-BR")
          : "",
        leadTime,
        `"${etqs}"`,
        `"${membs}"`,
      ].join(",");
    });

    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n"); // BOM para Excel reconhecer UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sprints, cartoesDaSprint, backlogPuro, etiquetas, membros]);

  const maxVelocity = Math.max(...velocityData.map((v) => v.totalPontos), 1);
  const maxEtCount = Math.max(...etiquetaStats.map((e) => e.count), 1);
  const maxMembroCards = Math.max(...membroData.map((m) => m.cards), 1);

  if (sprintsParaMetricas.length === 0) {
    return (
      <div className="text-center py-14">
        <BarChart3
          size={26}
          strokeWidth={1.5}
          className="mx-auto mb-3"
          style={{ color: "var(--tf-border-strong)" }}
        />
        <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
          Sem dados ainda
        </p>
        <p
          className="text-[0.75rem]"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          Conclua ou ative sprints para ver métricas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Header com Export */}
      <div className="flex items-center justify-end">
        <button
          onClick={exportarCSV}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
          style={{
            border: "1px solid var(--tf-border)",
            color: "var(--tf-text-secondary)",
            background: "var(--tf-surface)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Download size={12} strokeWidth={1.75} /> Exportar CSV
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
        <StatCard
          icone={TrendingUp}
          label="Velocity média"
          valor={`${velocityMedia} pts`}
          sub={`${sprintsConcl.length} sprints concluídas`}
          cor="var(--tf-accent)"
        />
        <StatCard
          icone={Target}
          label="Sprint ativa"
          valor={sprintAtiva?.nome || "—"}
          sub={`${ativaPontosConcluidos}/${ativaPontosTotal} pts · ${ativaProgresso}%`}
          cor="var(--tf-success)"
        />
        <StatCard
          icone={Clock}
          label="Lead Time"
          valor={leadTimeData.total > 0 ? `${leadTimeData.media}d` : "—"}
          sub={
            leadTimeData.total > 0
              ? `mediana ${leadTimeData.mediana}d · ${leadTimeData.total} cards`
              : "sem dados"
          }
          cor="var(--tf-accent-yellow)"
        />
        <StatCard
          icone={Timer}
          label="Min / Max"
          valor={
            leadTimeData.total > 0
              ? `${leadTimeData.min}d / ${leadTimeData.max}d`
              : "—"
          }
          sub="lead time range"
          cor="var(--tf-text-secondary)"
        />
        <StatCard
          icone={Layers}
          label="Total sprints"
          valor={`${sprints.length}`}
          sub={`${sprintsConcl.length} concluídas`}
          cor="var(--tf-merged)"
        />
        <StatCard
          icone={CheckCircle2}
          label="Backlog"
          valor={`${backlogPuro.length}`}
          sub="tarefas sem sprint"
          cor="var(--tf-warning)"
        />
      </div>

      {/* ── Burndown (sprint ativa) ── */}
      {sprintAtiva && ativaCards.length > 0 && (
        <BurndownChart sprint={sprintAtiva} cards={ativaCards} />
      )}

      {/* ── Throughput Semanal + Cycle Time por Sprint ── */}
      {(throughputData.length >= 2 || cycleTimePerSprint.length >= 2) && (
        <div
          className={`grid gap-4 ${
            throughputData.length >= 2 && cycleTimePerSprint.length >= 2
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* Throughput Semanal */}
          {throughputData.length >= 2 && (
            <div
              className="p-4"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar
                  size={12}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-success)" }}
                />
                <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                  Throughput semanal
                </h3>
              </div>
              <LineChart dados={throughputData} />
              <p
                className="text-[0.6875rem] mt-2"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                Cards concluídos por semana (últimas {throughputData.length} semanas)
              </p>
            </div>
          )}

          {/* Cycle Time por Sprint */}
          {cycleTimePerSprint.length >= 2 && (
            <div
              className="p-4"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Timer
                  size={12}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-text-secondary)" }}
                />
                <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                  Cycle time médio por sprint
                </h3>
              </div>
              <LineChart dados={cycleTimePerSprint} />
              <p
                className="text-[0.6875rem] mt-2"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                Média de dias entre criação e conclusão
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Linha: Velocity Trend + Distribuição por Status ── */}
      {(velocityTrend.length >= 2 || statusData.length > 0) && (
        <div
          className={`grid gap-4 ${
            velocityTrend.length >= 2 && statusData.length > 0
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* Velocity Trend */}
          {velocityTrend.length >= 2 && (
            <div
              className="p-4"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp
                  size={12}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-accent)" }}
                />
                <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                  Velocity trend
                </h3>
              </div>
              <LineChart dados={velocityTrend} />
            </div>
          )}

          {/* Distribuição por Status (donut) */}
          {statusData.length > 0 && (
            <div
              className="p-4"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Layers
                  size={12}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-accent)" }}
                />
                <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                  Distribuição por status
                </h3>
              </div>
              <div className="flex justify-center py-2">
                <DonutChart segmentos={statusData} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Velocity por Sprint (barras) ── */}
      <div
        className="rounded-[14px] border p-5"
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3
            size={12}
            strokeWidth={1.75}
            style={{ color: "var(--tf-accent)" }}
          />
          <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
            Velocity por sprint
          </h3>
        </div>
        <div className="space-y-2.5">
          {velocityData.map((v, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="text-[0.6875rem] w-28 truncate text-right"
                style={{
                  color: "var(--tf-text-secondary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "-0.005em",
                }}
              >
                {v.nome}
              </span>
              <div
                className="flex-1 h-6 overflow-hidden relative"
                style={{
                  background: "var(--tf-bg-secondary)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 opacity-20"
                  style={{
                    width: `${Math.max((v.totalPontos / maxVelocity) * 100, 4)}%`,
                    background: v.status === "ativa" ? "var(--tf-accent)" : "var(--tf-success)",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 flex items-center px-2 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      (v.pontosConcluidos / maxVelocity) * 100,
                      v.pontosConcluidos > 0 ? 4 : 0
                    )}%`,
                    background: v.status === "ativa" ? "var(--tf-accent)" : "var(--tf-success)",
                  }}
                >
                  {v.pontosConcluidos > 0 && (
                    <span
                      className="text-[0.625rem] font-medium text-white whitespace-nowrap"
                      style={{
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {v.pontosConcluidos} pts
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-[0.625rem] w-20 text-right"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                {v.cardsConcluidos}/{v.totalCards} cards
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Linha: Cards por Membro + Sprint Completion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Cards por Membro */}
        {membroData.length > 0 && (
          <div
            className="p-4"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Users
                size={12}
                strokeWidth={1.75}
                style={{ color: "var(--tf-accent)" }}
              />
              <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                Carga por membro
              </h3>
              {sprintAtiva && (
                <span
                  className="text-[0.6875rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  · {sprintAtiva.nome}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {membroData.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-5 h-5 flex items-center justify-center text-[0.5625rem] font-semibold text-white shrink-0"
                      style={{
                        background: m.cor,
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {m.nome
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className="text-[0.8125rem] font-medium flex-1"
                      style={{
                        color: "var(--tf-text)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {m.nome}
                    </span>
                    <span
                      className="text-[0.625rem]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {m.concluidos}/{m.cards} cards · {m.pontos} pts
                    </span>
                  </div>
                  <div className="flex ml-7" style={{ borderRadius: "var(--tf-radius-xs)", overflow: "hidden" }}>
                    {m.concluidos > 0 && (
                      <div
                        className="h-[3px] transition-all duration-500"
                        style={{
                          width: `${(m.concluidos / maxMembroCards) * 100}%`,
                          background: "var(--tf-success)",
                          minWidth: 4,
                        }}
                      />
                    )}
                    {m.cards - m.concluidos > 0 && (
                      <div
                        className="h-[3px] transition-all duration-500"
                        style={{
                          width: `${
                            ((m.cards - m.concluidos) / maxMembroCards) * 100
                          }%`,
                          background: "var(--tf-accent)",
                          opacity: 0.4,
                          minWidth: 4,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div
                className="flex items-center gap-4 pt-3 border-t"
                style={{ borderColor: "var(--tf-border)" }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2"
                    style={{
                      background: "var(--tf-success)",
                      borderRadius: "1px",
                    }}
                  />
                  <span
                    className="text-[0.625rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Concluído
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2"
                    style={{
                      background: "var(--tf-accent)",
                      opacity: 0.4,
                      borderRadius: "1px",
                    }}
                  />
                  <span
                    className="text-[0.625rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Pendente
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sprint Completion Rate */}
        {completionData.length > 0 && (
          <div
            className={`p-4 ${membroData.length === 0 ? "lg:col-span-2" : ""}`}
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target
                size={12}
                strokeWidth={1.75}
                style={{ color: "var(--tf-accent)" }}
              />
              <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
                Taxa de conclusão por sprint
              </h3>
            </div>
            <div className="space-y-3">
              {completionData.map((d, i) => {
                const cor =
                  d.valor >= 80
                    ? "var(--tf-success)"
                    : d.valor >= 50
                      ? "var(--tf-accent-yellow)"
                      : "var(--tf-danger)";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[0.75rem] font-medium"
                        style={{
                          color: "var(--tf-text-secondary)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {d.label}
                      </span>
                      <span
                        className="text-[0.75rem] font-medium"
                        style={{
                          color: cor,
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        {d.valor}%
                      </span>
                    </div>
                    <div
                      className="h-[3px] overflow-hidden"
                      style={{ background: "var(--tf-border)", borderRadius: "1px" }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${d.valor}%`, background: cor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Distribuição por Etiqueta ── */}
      {etiquetaStats.length > 0 && (
        <div
          className="p-4"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          <h3 className="label-mono mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            Distribuição por etiqueta
          </h3>
          <div className="space-y-2">
            {etiquetaStats.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center h-[18px] px-1.5 text-[0.5625rem] font-medium text-white w-20 truncate"
                  style={{
                    background: e.cor,
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {e.nome}
                </span>
                <div
                  className="flex-1 h-[18px] overflow-hidden"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(e.count / maxEtCount) * 100}%`,
                      background: e.cor,
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span
                  className="text-[0.625rem] w-24 text-right"
                  style={{
                    color: "var(--tf-text-secondary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {e.count} cards · {e.pontos} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
