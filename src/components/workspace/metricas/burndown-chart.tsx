"use client";

import { Flame, TrendingUp } from "lucide-react";
import { CartaoBacklog } from "@/hooks/use-backlog";
import { Quadro } from "@/types";
import { diasEntreCeil as diasEntre } from "@/lib/datas";

interface BurndownChartProps {
  sprint: Quadro;
  cards: CartaoBacklog[];
}

export function BurndownChart({ sprint, cards }: BurndownChartProps) {
  if (!sprint.data_inicio || !sprint.data_fim) return null;

  const inicio = new Date(sprint.data_inicio);
  const fim = new Date(sprint.data_fim);
  const hoje = new Date();
  const totalDias = diasEntre(inicio, fim);
  const diasPassados = Math.max(0, Math.min(diasEntre(inicio, hoje), totalDias));

  const totalPontos = cards.reduce((acc, c) => acc + (c.peso || 0), 0);
  const pontosConcluidos = cards
    .filter((c) => c.concluido)
    .reduce((acc, c) => acc + (c.peso || 0), 0);
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
  const yFromPontos = (pontos: number) =>
    padding.top + ((totalPontos - pontos) / totalPontos) * h;

  // Linha ideal: totalPontos no dia 0 -> 0 no dia totalDias
  const idealPath = `M ${xFromDia(0)} ${yFromPontos(totalPontos)} L ${xFromDia(
    totalDias
  )} ${yFromPontos(0)}`;

  // Ponto atual (real)
  const realStart = { x: xFromDia(0), y: yFromPontos(totalPontos) };
  const realAtual = {
    x: xFromDia(diasPassados),
    y: yFromPontos(pontosRestantes),
  };
  const realPath = `M ${realStart.x} ${realStart.y} L ${realAtual.x} ${realAtual.y}`;

  // Velocity atual (pts concluidos por dia)
  const velocity = diasPassados > 0 ? pontosConcluidos / diasPassados : 0;

  // Trend line: extende a linha real ate o fim do sprint usando a velocity
  // Quantos pts ainda completados ate dia totalDias?
  const diasRestantes = totalDias - diasPassados;
  const pontosTrendFinal = Math.max(
    0,
    pontosRestantes - velocity * diasRestantes
  );
  const trendPath =
    velocity > 0
      ? `M ${realAtual.x} ${realAtual.y} L ${xFromDia(totalDias)} ${yFromPontos(
          pontosTrendFinal
        )}`
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
  const idealHoje = Math.max(
    0,
    totalPontos - (diasPassados / totalDias) * totalPontos
  );
  const delta = Math.round(idealHoje - pontosRestantes); // positivo = adiantado
  const status = delta >= 0 ? "adiantado" : "atrasado";
  const statusCor = status === "adiantado" ? "var(--tf-success)" : "var(--tf-danger)";
  const trendCor =
    pontosTrendFinal === 0 || (projecaoData && projecaoData <= fim)
      ? "var(--tf-success)"
      : "var(--tf-danger)";

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
  const formatarData = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--tf-surface)",
        borderColor: "var(--tf-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
          Burndown — {sprint.nome}
        </h3>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold"
          style={{ background: `${statusCor}20`, color: statusCor }}
        >
          {status === "adiantado" ? <TrendingUp size={12} /> : <Flame size={12} />}
          {delta >= 0 ? `+${delta}` : delta} pts {status}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        style={{ maxHeight: altura }}
      >
        {/* Grid */}
        {gridY.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={largura - padding.right}
              y2={g.y}
              stroke="var(--tf-border)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={g.y + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--tf-text-tertiary)"
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {diasLabels.map((d, i) => (
          <text
            key={i}
            x={d.x}
            y={padding.top + h + 20}
            textAnchor="middle"
            fontSize={10}
            fill="var(--tf-text-tertiary)"
          >
            {d.label}
          </text>
        ))}

        {/* Linha ideal (tracejada) */}
        <path
          d={idealPath}
          fill="none"
          stroke="var(--tf-text-tertiary)"
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.5}
        />

        {/* Trend line (projecao baseada na velocity) */}
        {trendPath && (
          <path
            d={trendPath}
            fill="none"
            stroke={trendCor}
            strokeWidth={2}
            strokeDasharray="4,4"
            opacity={0.6}
            strokeLinecap="round"
          />
        )}

        {/* Linha real (do dia 0 ate hoje) */}
        <path
          d={realPath}
          fill="none"
          stroke={statusCor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Ponto ideal de hoje (marker pequeno) */}
        <circle
          cx={idealHojePoint.x}
          cy={idealHojePoint.y}
          r={3}
          fill="var(--tf-text-tertiary)"
          opacity={0.6}
        />

        {/* Ponto atual */}
        <circle
          cx={realAtual.x}
          cy={realAtual.y}
          r={5}
          fill="var(--tf-surface)"
          stroke={statusCor}
          strokeWidth={2.5}
        />

        {/* Hoje indicator */}
        <line
          x1={realAtual.x}
          y1={padding.top}
          x2={realAtual.x}
          y2={padding.top + h}
          stroke={statusCor}
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.4}
        />
        <text
          x={realAtual.x}
          y={padding.top - 8}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill={statusCor}
        >
          HOJE
        </text>

        {/* Legenda */}
        <g transform={`translate(${largura - padding.right - 150}, ${padding.top + 6})`}>
          <line
            x1={0}
            y1={0}
            x2={18}
            y2={0}
            stroke="var(--tf-text-tertiary)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={0.5}
          />
          <text x={22} y={3} fontSize={9} fill="var(--tf-text-tertiary)">
            Ideal
          </text>
          <line x1={50} y1={0} x2={68} y2={0} stroke={statusCor} strokeWidth={2.5} />
          <text x={72} y={3} fontSize={9} fill="var(--tf-text-tertiary)">
            Real
          </text>
          {trendPath && (
            <>
              <line
                x1={100}
                y1={0}
                x2={118}
                y2={0}
                stroke={trendCor}
                strokeWidth={2}
                strokeDasharray="3,3"
                opacity={0.6}
              />
              <text x={122} y={3} fontSize={9} fill="var(--tf-text-tertiary)">
                Trend
              </text>
            </>
          )}
        </g>
      </svg>

      {/* Stats expandidos */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-3 pt-3 border-t"
        style={{ borderColor: "var(--tf-border)" }}
      >
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Total
          </span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
            {totalPontos} pts
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Concluídos
          </span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-success)" }}>
            {pontosConcluidos} pts
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Restantes
          </span>
          <p className="text-sm font-bold" style={{ color: statusCor }}>
            {pontosRestantes} pts
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Dias
          </span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
            {diasPassados}/{totalDias}
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Velocity
          </span>
          <p className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
            {velocity.toFixed(1)} pts/dia
          </p>
        </div>
        <div>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Projeção
          </span>
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
