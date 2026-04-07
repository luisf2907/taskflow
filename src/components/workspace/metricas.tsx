"use client";

import { CartaoBacklog } from "@/hooks/use-backlog";
import { Etiqueta, Membro, Quadro } from "@/types";
import { BarChart3, Flame, Target, TrendingUp, Users, Layers, CheckCircle2, Clock, Timer, Download, Calendar } from "lucide-react";
import { useMemo, useCallback } from "react";
import { diasEntreCeil as diasEntre } from "@/lib/datas";

interface MetricasProps {
  sprints: Quadro[];
  cartoesDaSprint: (quadroId: string) => CartaoBacklog[];
  backlogPuro: CartaoBacklog[];
  etiquetas: Etiqueta[];
  membros: Membro[];
}

// ─── Stat Card ───
function StatCard({ label, valor, sub, icone: Icon, cor }: { label: string; valor: string; sub: string; icone: React.ElementType; cor?: string }) {
  return (
    <div className="rounded-[14px] border p-4" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: cor ? `${cor}20` : "var(--tf-accent-light)" }}>
          <Icon size={14} style={{ color: cor || "var(--tf-accent)" }} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--tf-text)" }}>{valor}</p>
      <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>{sub}</p>
    </div>
  );
}

// ─── SVG Line Chart ───
function LineChart({ dados, largura = 500, altura = 200 }: { dados: { label: string; valor: number }[]; largura?: number; altura?: number }) {
  if (dados.length < 2) return null;

  const maxValor = Math.max(...dados.map((d) => d.valor), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const w = largura - padding.left - padding.right;
  const h = altura - padding.top - padding.bottom;

  const pontos = dados.map((d, i) => ({
    x: padding.left + (i / (dados.length - 1)) * w,
    y: padding.top + h - (d.valor / maxValor) * h,
    ...d,
  }));

  const linePath = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pontos[pontos.length - 1].x} ${padding.top + h} L ${pontos[0].x} ${padding.top + h} Z`;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + h - pct * h,
    label: Math.round(maxValor * pct).toString(),
  }));

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" style={{ maxHeight: altura }}>
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padding.left} y1={g.y} x2={largura - padding.right} y2={g.y} stroke="var(--tf-border)" strokeWidth={1} strokeDasharray="4,4" />
          <text x={padding.left - 8} y={g.y + 4} textAnchor="end" fontSize={10} fill="var(--tf-text-tertiary)">{g.label}</text>
        </g>
      ))}

      {/* Area gradient */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tf-accent)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--tf-accent)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--tf-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="var(--tf-surface)" stroke="var(--tf-accent)" strokeWidth={2.5} />
          <text x={p.x} y={padding.top + h + 20} textAnchor="middle" fontSize={10} fill="var(--tf-text-tertiary)">
            {p.label.length > 8 ? p.label.slice(0, 8) + "..." : p.label}
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--tf-text-secondary)">
            {p.valor}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── SVG Donut Chart ───
function DonutChart({ segmentos, tamanho = 160 }: { segmentos: { label: string; valor: number; cor: string }[]; tamanho?: number }) {
  const total = segmentos.reduce((acc, s) => acc + s.valor, 0);
  if (total === 0) return null;

  const r = (tamanho - 20) / 2;
  const centro = tamanho / 2;
  const espessura = 28;
  const rInterno = r - espessura;
  const circunferencia = 2 * Math.PI * ((r + rInterno) / 2);

  let offset = 0;
  const arcos = segmentos.filter((s) => s.valor > 0).map((s) => {
    const pct = s.valor / total;
    const comprimento = pct * circunferencia;
    const arco = { ...s, pct, comprimento, offset };
    offset += comprimento;
    return arco;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        {arcos.map((arco, i) => (
          <circle
            key={i}
            cx={centro}
            cy={centro}
            r={(r + rInterno) / 2}
            fill="none"
            stroke={arco.cor}
            strokeWidth={espessura}
            strokeDasharray={`${arco.comprimento} ${circunferencia - arco.comprimento}`}
            strokeDashoffset={-arco.offset}
            transform={`rotate(-90 ${centro} ${centro})`}
            strokeLinecap="round"
          />
        ))}
        <text x={centro} y={centro - 6} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--tf-text)">{total}</text>
        <text x={centro} y={centro + 12} textAnchor="middle" fontSize={10} fill="var(--tf-text-tertiary)">cards</text>
      </svg>
      <div className="space-y-1.5">
        {arcos.map((arco, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: arco.cor }} />
            <span className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>{arco.label}</span>
            <span className="text-[12px] font-bold ml-auto" style={{ color: "var(--tf-text)" }}>{arco.valor}</span>
            <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>({Math.round(arco.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Burndown Chart (SVG) ───
function BurndownChart({ sprint, cards }: { sprint: Quadro; cards: CartaoBacklog[] }) {
  if (!sprint.data_inicio || !sprint.data_fim) return null;

  const inicio = new Date(sprint.data_inicio);
  const fim = new Date(sprint.data_fim);
  const hoje = new Date();
  const totalDias = diasEntre(inicio, fim);
  const diasPassados = Math.max(0, Math.min(diasEntre(inicio, hoje), totalDias));

  const totalPontos = cards.reduce((acc, c) => acc + (c.peso || 0), 0);
  const pontosConcluidos = cards.filter((c) => c.concluido).reduce((acc, c) => acc + (c.peso || 0), 0);
  const pontosRestantes = totalPontos - pontosConcluidos;

  if (totalPontos === 0 || totalDias <= 0) return null;

  // Layout
  const largura = 500;
  const altura = 220;
  const padding = { top: 24, right: 20, bottom: 40, left: 50 };
  const w = largura - padding.left - padding.right;
  const h = altura - padding.top - padding.bottom;

  // Conversores dia/pontos -> coordenadas SVG
  const xFromDia = (dia: number) => padding.left + (dia / totalDias) * w;
  const yFromPontos = (pontos: number) => padding.top + ((totalPontos - pontos) / totalPontos) * h;

  // Linha ideal: totalPontos no dia 0 -> 0 no dia totalDias
  const idealPath = `M ${xFromDia(0)} ${yFromPontos(totalPontos)} L ${xFromDia(totalDias)} ${yFromPontos(0)}`;

  // Ponto atual (real)
  const realStart = { x: xFromDia(0), y: yFromPontos(totalPontos) };
  const realAtual = { x: xFromDia(diasPassados), y: yFromPontos(pontosRestantes) };
  const realPath = `M ${realStart.x} ${realStart.y} L ${realAtual.x} ${realAtual.y}`;

  // Velocity atual (pts concluidos por dia)
  const velocity = diasPassados > 0 ? pontosConcluidos / diasPassados : 0;

  // Trend line: extende a linha real ate o fim do sprint usando a velocity
  // Quantos pts ainda completados ate dia totalDias?
  const diasRestantes = totalDias - diasPassados;
  const pontosTrendFinal = Math.max(0, pontosRestantes - velocity * diasRestantes);
  const trendPath = velocity > 0
    ? `M ${realAtual.x} ${realAtual.y} L ${xFromDia(totalDias)} ${yFromPontos(pontosTrendFinal)}`
    : null;

  // Projecao de termino: quando vai zerar (em dias a partir de hoje)
  let projecaoData: Date | null = null;
  let deltaDias = 0;
  if (velocity > 0 && pontosRestantes > 0) {
    const diasAteZerar = pontosRestantes / velocity;
    projecaoData = new Date(hoje.getTime() + diasAteZerar * 24 * 60 * 60 * 1000);
    deltaDias = Math.round(diasEntre(fim, projecaoData));
  } else if (pontosRestantes === 0) {
    projecaoData = hoje;
    deltaDias = -Math.round(diasEntre(hoje, fim));
  }

  // Ideal de hoje + delta
  const idealHoje = Math.max(0, totalPontos - (diasPassados / totalDias) * totalPontos);
  const delta = Math.round(idealHoje - pontosRestantes); // positivo = adiantado
  const status = delta >= 0 ? "adiantado" : "atrasado";
  const statusCor = status === "adiantado" ? "#4BCE97" : "#F87171";
  const trendCor = pontosTrendFinal === 0 || (projecaoData && projecaoData <= fim) ? "#4BCE97" : "#F87171";

  // Grid Y
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + pct * h,
    label: Math.round(totalPontos * (1 - pct)).toString(),
  }));

  // Dias no eixo X
  const diasLabels = [];
  const step = Math.max(1, Math.floor(totalDias / 6));
  for (let i = 0; i <= totalDias; i += step) {
    diasLabels.push({ x: xFromDia(i), label: `D${i}` });
  }

  // Ponto ideal de hoje (marker)
  const idealHojePoint = { x: xFromDia(diasPassados), y: yFromPontos(idealHoje) };

  // Formatar data de projecao
  const formatarData = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>Burndown — {sprint.nome}</h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold" style={{ background: `${statusCor}20`, color: statusCor }}>
          {status === "adiantado" ? <TrendingUp size={12} /> : <Flame size={12} />}
          {delta >= 0 ? `+${delta}` : delta} pts {status}
        </div>
      </div>

      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" style={{ maxHeight: altura }}>
        {/* Grid */}
        {gridY.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={largura - padding.right} y2={g.y} stroke="var(--tf-border)" strokeWidth={1} strokeDasharray="4,4" />
            <text x={padding.left - 8} y={g.y + 4} textAnchor="end" fontSize={10} fill="var(--tf-text-tertiary)">{g.label}</text>
          </g>
        ))}

        {/* X axis labels */}
        {diasLabels.map((d, i) => (
          <text key={i} x={d.x} y={padding.top + h + 20} textAnchor="middle" fontSize={10} fill="var(--tf-text-tertiary)">{d.label}</text>
        ))}

        {/* Linha ideal (tracejada) */}
        <path d={idealPath} fill="none" stroke="var(--tf-text-tertiary)" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.5} />

        {/* Trend line (projecao baseada na velocity) */}
        {trendPath && (
          <path d={trendPath} fill="none" stroke={trendCor} strokeWidth={2} strokeDasharray="4,4" opacity={0.6} strokeLinecap="round" />
        )}

        {/* Linha real (do dia 0 ate hoje) */}
        <path d={realPath} fill="none" stroke={statusCor} strokeWidth={2.5} strokeLinecap="round" />

        {/* Ponto ideal de hoje (marker pequeno) */}
        <circle cx={idealHojePoint.x} cy={idealHojePoint.y} r={3} fill="var(--tf-text-tertiary)" opacity={0.6} />

        {/* Ponto atual */}
        <circle cx={realAtual.x} cy={realAtual.y} r={5} fill="var(--tf-surface)" stroke={statusCor} strokeWidth={2.5} />

        {/* Hoje indicator */}
        <line x1={realAtual.x} y1={padding.top} x2={realAtual.x} y2={padding.top + h} stroke={statusCor} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        <text x={realAtual.x} y={padding.top - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={statusCor}>HOJE</text>

        {/* Legenda */}
        <g transform={`translate(${largura - padding.right - 150}, ${padding.top + 6})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke="var(--tf-text-tertiary)" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
          <text x={22} y={3} fontSize={9} fill="var(--tf-text-tertiary)">Ideal</text>
          <line x1={50} y1={0} x2={68} y2={0} stroke={statusCor} strokeWidth={2.5} />
          <text x={72} y={3} fontSize={9} fill="var(--tf-text-tertiary)">Real</text>
          {trendPath && (
            <>
              <line x1={100} y1={0} x2={118} y2={0} stroke={trendCor} strokeWidth={2} strokeDasharray="3,3" opacity={0.6} />
              <text x={122} y={3} fontSize={9} fill="var(--tf-text-tertiary)">Trend</text>
            </>
          )}
        </g>
      </svg>

      {/* Stats expandidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--tf-border)" }}>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Total</span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>{totalPontos} pts</p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Concluídos</span>
          <p className="text-sm font-bold" style={{ color: "#4BCE97" }}>{pontosConcluidos} pts</p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Restantes</span>
          <p className="text-sm font-bold" style={{ color: statusCor }}>{pontosRestantes} pts</p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Dias</span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>{diasPassados}/{totalDias}</p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Velocity</span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>{velocity.toFixed(1)} pts/dia</p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Projeção</span>
          <p className="text-sm font-bold" style={{ color: trendCor }}>
            {projecaoData ? formatarData(projecaoData) : "—"}
            {projecaoData && deltaDias !== 0 && (
              <span className="text-[10px] font-medium ml-1">
                ({deltaDias > 0 ? `+${deltaDias}` : deltaDias}d)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───
export function MetricasWorkspace({ sprints, cartoesDaSprint, backlogPuro, etiquetas, membros }: MetricasProps) {
  const sprintsConcl = useMemo(() => sprints.filter((s) => s.status_sprint === "concluida"), [sprints]);
  const sprintAtiva = useMemo(() => sprints.find((s) => s.status_sprint === "ativa"), [sprints]);
  const sprintsParaMetricas = useMemo(() => [...sprintsConcl, ...(sprintAtiva ? [sprintAtiva] : [])], [sprintsConcl, sprintAtiva]);

  // ── Velocity por sprint ──
  const velocityData = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      const totalPontos = cards.reduce((acc, c) => acc + (c.peso || 0), 0);
      const concluidos = cards.filter((c) => c.concluido);
      const pontosConcluidos = concluidos.reduce((acc, c) => acc + (c.peso || 0), 0);
      return { nome: s.nome, pontosConcluidos, totalPontos, status: s.status_sprint, totalCards: cards.length, cardsConcluidos: concluidos.length };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Sprint ativa stats ──
  const ativaCards = useMemo(() => sprintAtiva ? cartoesDaSprint(sprintAtiva.id) : [], [sprintAtiva, cartoesDaSprint]);
  const ativaPontosTotal = ativaCards.reduce((acc, c) => acc + (c.peso || 0), 0);
  const ativaConcluidos = ativaCards.filter((c) => c.concluido);
  const ativaPontosConcluidos = ativaConcluidos.reduce((acc, c) => acc + (c.peso || 0), 0);
  const ativaProgresso = ativaCards.length > 0 ? Math.round((ativaConcluidos.length / ativaCards.length) * 100) : 0;

  // ── Velocity média ──
  const velocityMedia = useMemo(() => {
    const velocidades = sprintsConcl.map((s) => {
      const cards = cartoesDaSprint(s.id);
      return cards.filter((c) => c.concluido).reduce((acc, c) => acc + (c.peso || 0), 0);
    });
    return velocidades.length > 0 ? Math.round(velocidades.reduce((a, b) => a + b, 0) / velocidades.length) : 0;
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
    const cores = ["#60A5FA", "#FBBF24", "#A78BFA", "#4BCE97", "#F87171", "#FB923C"];
    return Object.entries(porColuna).map(([label, valor], i) => ({ label, valor, cor: cores[i % cores.length] }));
  }, [sprintAtiva, cartoesDaSprint]);

  // ── Cards por membro (sprint ativa) ──
  const membroData = useMemo(() => {
    const todosCards = sprintAtiva ? cartoesDaSprint(sprintAtiva.id) : [];
    const porMembro: Record<string, { nome: string; cor: string; cards: number; pontos: number; concluidos: number }> = {};
    for (const card of todosCards) {
      for (const mId of card.membro_ids || []) {
        const m = membros.find((mb) => mb.id === mId);
        if (m) {
          if (!porMembro[mId]) porMembro[mId] = { nome: m.nome, cor: m.cor_avatar, cards: 0, pontos: 0, concluidos: 0 };
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
    const porEtiqueta: Record<string, { nome: string; cor: string; count: number; pontos: number }> = {};
    for (const card of todosCards) {
      for (const eId of card.etiqueta_ids || []) {
        const et = etiquetas.find((e) => e.id === eId);
        if (et) {
          if (!porEtiqueta[eId]) porEtiqueta[eId] = { nome: et.nome, cor: et.cor, count: 0, pontos: 0 };
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
      return { label: s.nome, valor: total > 0 ? Math.round((concluidos / total) * 100) : 0 };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Velocity trend (line chart) ──
  const velocityTrend = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      return { label: s.nome, valor: cards.filter((c) => c.concluido).reduce((acc, c) => acc + (c.peso || 0), 0) };
    });
  }, [sprintsParaMetricas, cartoesDaSprint]);

  // ── Lead Time (criado → concluído) ──
  const leadTimeData = useMemo(() => {
    const todosCards = sprints.flatMap((s) => cartoesDaSprint(s.id));
    const concluidos = todosCards.filter((c) => c.concluido && c.data_conclusao && c.criado_em);
    if (concluidos.length === 0) return { media: 0, mediana: 0, min: 0, max: 0, total: 0 };

    const tempos = concluidos.map((c) => {
      const dias = diasEntre(new Date(c.criado_em), new Date(c.data_conclusao!));
      return Math.max(dias, 0);
    }).sort((a, b) => a - b);

    const soma = tempos.reduce((a, b) => a + b, 0);
    const media = Math.round((soma / tempos.length) * 10) / 10;
    const mediana = tempos.length % 2 === 0
      ? (tempos[tempos.length / 2 - 1] + tempos[tempos.length / 2]) / 2
      : tempos[Math.floor(tempos.length / 2)];

    return { media, mediana: Math.round(mediana * 10) / 10, min: tempos[0], max: tempos[tempos.length - 1], total: tempos.length };
  }, [sprints, cartoesDaSprint]);

  // ── Cycle Time por Sprint ──
  const cycleTimePerSprint = useMemo(() => {
    return sprintsParaMetricas.map((s) => {
      const cards = cartoesDaSprint(s.id);
      const concluidos = cards.filter((c) => c.concluido && c.data_conclusao && c.criado_em);
      if (concluidos.length === 0) return { label: s.nome, valor: 0 };

      const tempos = concluidos.map((c) => Math.max(diasEntre(new Date(c.criado_em), new Date(c.data_conclusao!)), 0));
      const media = Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10;
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
        const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
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

    const header = ["Título", "Sprint", "Coluna", "Peso (pts)", "Status", "Criado em", "Concluído em", "Lead Time (dias)", "Etiquetas", "Membros"];
    const rows = todos.map((c) => {
      const leadTime = c.concluido && c.data_conclusao && c.criado_em
        ? Math.max(diasEntre(new Date(c.criado_em), new Date(c.data_conclusao)), 0)
        : "";
      const etqs = (c.etiqueta_ids || []).map((id) => etiquetas.find((e) => e.id === id)?.nome || "").filter(Boolean).join("; ");
      const membs = (c.membro_ids || []).map((id) => membros.find((m) => m.id === id)?.nome || "").filter(Boolean).join("; ");
      return [
        `"${(c.titulo || "").replace(/"/g, '""')}"`,
        `"${c.sprint_nome}"`,
        `"${c.coluna_nome || "Backlog"}"`,
        c.peso || 0,
        c.concluido ? "Concluído" : "Pendente",
        c.criado_em ? new Date(c.criado_em).toLocaleDateString("pt-BR") : "",
        c.data_conclusao ? new Date(c.data_conclusao).toLocaleDateString("pt-BR") : "",
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
      <div className="text-center py-16">
        <BarChart3 size={32} className="mx-auto mb-3" style={{ color: "var(--tf-text-tertiary)" }} />
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--tf-text)" }}>Sem dados ainda</h3>
        <p className="text-sm" style={{ color: "var(--tf-text-tertiary)" }}>Conclua ou ative sprints para ver métricas</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* ── Header com Export ── */}
      <div className="flex items-center justify-end">
        <button
          onClick={exportarCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px] border"
          style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)", background: "var(--tf-surface)", transition: "all 0.15s ease" }}
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icone={TrendingUp} label="Velocity média" valor={`${velocityMedia} pts`} sub={`${sprintsConcl.length} sprints concluídas`} cor="#60A5FA" />
        <StatCard icone={Target} label="Sprint ativa" valor={sprintAtiva?.nome || "—"} sub={`${ativaPontosConcluidos}/${ativaPontosTotal} pts · ${ativaProgresso}%`} cor="#4BCE97" />
        <StatCard icone={Clock} label="Lead Time" valor={leadTimeData.total > 0 ? `${leadTimeData.media}d` : "—"} sub={leadTimeData.total > 0 ? `mediana ${leadTimeData.mediana}d · ${leadTimeData.total} cards` : "sem dados"} cor="#F59E0B" />
        <StatCard icone={Timer} label="Min / Max" valor={leadTimeData.total > 0 ? `${leadTimeData.min}d / ${leadTimeData.max}d` : "—"} sub="lead time range" cor="#EC4899" />
        <StatCard icone={Layers} label="Total sprints" valor={`${sprints.length}`} sub={`${sprintsConcl.length} concluídas`} cor="#A78BFA" />
        <StatCard icone={CheckCircle2} label="Backlog" valor={`${backlogPuro.length}`} sub="tarefas sem sprint" cor="#FB923C" />
      </div>

      {/* ── Burndown (sprint ativa) ── */}
      {sprintAtiva && ativaCards.length > 0 && (
        <BurndownChart sprint={sprintAtiva} cards={ativaCards} />
      )}

      {/* ── Throughput Semanal + Cycle Time por Sprint ── */}
      {(throughputData.length >= 2 || cycleTimePerSprint.length >= 2) && (
        <div className={`grid gap-4 ${throughputData.length >= 2 && cycleTimePerSprint.length >= 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Throughput Semanal */}
          {throughputData.length >= 2 && (
            <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
                <Calendar size={14} className="inline mr-1.5" style={{ color: "#4BCE97" }} />
                Throughput Semanal
              </h3>
              <LineChart dados={throughputData} />
              <p className="text-[11px] mt-2" style={{ color: "var(--tf-text-tertiary)" }}>
                Cards concluídos por semana (últimas {throughputData.length} semanas)
              </p>
            </div>
          )}

          {/* Cycle Time por Sprint */}
          {cycleTimePerSprint.length >= 2 && (
            <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
                <Timer size={14} className="inline mr-1.5" style={{ color: "#EC4899" }} />
                Cycle Time Médio por Sprint
              </h3>
              <LineChart dados={cycleTimePerSprint} />
              <p className="text-[11px] mt-2" style={{ color: "var(--tf-text-tertiary)" }}>
                Média de dias entre criação e conclusão
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Linha: Velocity Trend + Distribuição por Status ── */}
      {(velocityTrend.length >= 2 || statusData.length > 0) && (
        <div className={`grid gap-4 ${velocityTrend.length >= 2 && statusData.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Velocity Trend */}
          {velocityTrend.length >= 2 && (
            <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
                <TrendingUp size={14} className="inline mr-1.5" style={{ color: "var(--tf-accent)" }} />
                Velocity Trend
              </h3>
              <LineChart dados={velocityTrend} />
            </div>
          )}

          {/* Distribuição por Status (donut) */}
          {statusData.length > 0 && (
            <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
                <Layers size={14} className="inline mr-1.5" style={{ color: "var(--tf-accent)" }} />
                Distribuição por Status
              </h3>
              <div className="flex justify-center py-2">
                <DonutChart segmentos={statusData} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Velocity por Sprint (barras) ── */}
      <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
          <BarChart3 size={14} className="inline mr-1.5" style={{ color: "var(--tf-accent)" }} />
          Velocity por Sprint
        </h3>
        <div className="space-y-2.5">
          {velocityData.map((v, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[12px] font-medium w-28 truncate text-right" style={{ color: "var(--tf-text-secondary)" }}>{v.nome}</span>
              <div className="flex-1 h-7 rounded-[8px] overflow-hidden relative" style={{ background: "var(--tf-bg-secondary)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-[8px] opacity-20"
                  style={{ width: `${Math.max((v.totalPontos / maxVelocity) * 100, 4)}%`, background: v.status === "ativa" ? "var(--tf-accent)" : "#4BCE97" }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-[8px] flex items-center px-2 transition-all duration-700"
                  style={{ width: `${Math.max((v.pontosConcluidos / maxVelocity) * 100, v.pontosConcluidos > 0 ? 4 : 0)}%`, background: v.status === "ativa" ? "var(--tf-accent)" : "#4BCE97" }}
                >
                  {v.pontosConcluidos > 0 && <span className="text-[11px] font-bold text-white whitespace-nowrap">{v.pontosConcluidos} pts</span>}
                </div>
              </div>
              <span className="text-[11px] w-20 text-right" style={{ color: "var(--tf-text-tertiary)" }}>{v.cardsConcluidos}/{v.totalCards} cards</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Linha: Cards por Membro + Sprint Completion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Cards por Membro */}
        {membroData.length > 0 && (
          <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
              <Users size={14} className="inline mr-1.5" style={{ color: "var(--tf-accent)" }} />
              Carga por Membro {sprintAtiva ? `— ${sprintAtiva.nome}` : ""}
            </h3>
            <div className="space-y-3">
              {membroData.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: m.cor }}>
                      {m.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium flex-1" style={{ color: "var(--tf-text)" }}>{m.nome}</span>
                    <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{m.concluidos}/{m.cards} cards · {m.pontos} pts</span>
                  </div>
                  <div className="flex gap-0.5 ml-8">
                    {m.concluidos > 0 && (
                      <div className={`h-4 transition-all duration-500 ${m.concluidos === m.cards ? "rounded-full" : "rounded-l-full"}`} style={{ width: `${(m.concluidos / maxMembroCards) * 100}%`, background: "#4BCE97", minWidth: 4 }} />
                    )}
                    {m.cards - m.concluidos > 0 && (
                      <div className={`h-4 transition-all duration-500 ${m.concluidos === 0 ? "rounded-full" : "rounded-r-full"}`} style={{ width: `${((m.cards - m.concluidos) / maxMembroCards) * 100}%`, background: "var(--tf-accent)", opacity: 0.4, minWidth: 4 }} />
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: "var(--tf-border)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: "#4BCE97" }} />
                  <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Concluído</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: "var(--tf-accent)", opacity: 0.4 }} />
                  <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Pendente</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sprint Completion Rate */}
        {completionData.length > 0 && (
          <div className={`rounded-[14px] border p-5 ${membroData.length === 0 ? "lg:col-span-2" : ""}`} style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>
              <Target size={14} className="inline mr-1.5" style={{ color: "var(--tf-accent)" }} />
              Taxa de Conclusão por Sprint
            </h3>
            <div className="space-y-3">
              {completionData.map((d, i) => {
                const cor = d.valor >= 80 ? "#4BCE97" : d.valor >= 50 ? "#FBBF24" : "#F87171";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium" style={{ color: "var(--tf-text-secondary)" }}>{d.label}</span>
                      <span className="text-[12px] font-bold" style={{ color: cor }}>{d.valor}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--tf-bg-secondary)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.valor}%`, background: cor }} />
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
        <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--tf-text)" }}>Distribuição por Etiqueta</h3>
          <div className="space-y-2">
            {etiquetaStats.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white w-20 text-center truncate" style={{ background: e.cor }}>{e.nome}</span>
                <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--tf-bg-secondary)" }}>
                  <div className="h-full rounded transition-all duration-500" style={{ width: `${(e.count / maxEtCount) * 100}%`, background: e.cor, opacity: 0.7 }} />
                </div>
                <span className="text-[11px] font-medium w-24 text-right" style={{ color: "var(--tf-text-secondary)" }}>{e.count} cards · {e.pontos}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
