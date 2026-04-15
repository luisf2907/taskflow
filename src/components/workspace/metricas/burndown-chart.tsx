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
      className="p-4"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
            Burndown
          </span>
          <span
            className="text-[0.8125rem] font-medium"
            style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
          >
            {sprint.nome}
          </span>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-2 h-[22px] text-[0.625rem] font-medium"
          style={{
            background: `color-mix(in srgb, ${statusCor} 12%, transparent)`,
            color: statusCor,
            border: `1px solid ${statusCor}`,
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {status === "adiantado" ? (
            <TrendingUp size={11} strokeWidth={1.75} />
          ) : (
            <Flame size={11} strokeWidth={1.75} />
          )}
          {delta >= 0 ? `+${delta}` : delta} pts {status}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        style={{ maxHeight: altura }}
        fontFamily="var(--tf-font-mono)"
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
              strokeDasharray="2,3"
            />
            <text
              x={padding.left - 8}
              y={g.y + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--tf-text-tertiary)"
              style={{ letterSpacing: "0.04em" }}
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
            y={padding.top + h + 18}
            textAnchor="middle"
            fontSize={9}
            fill="var(--tf-text-tertiary)"
            style={{ letterSpacing: "0.04em" }}
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

        {/* Ponto ideal de hoje — quadrado */}
        <rect
          x={idealHojePoint.x - 2.5}
          y={idealHojePoint.y - 2.5}
          width={5}
          height={5}
          fill="var(--tf-text-tertiary)"
          opacity={0.5}
        />

        {/* Ponto atual — quadrado */}
        <rect
          x={realAtual.x - 4}
          y={realAtual.y - 4}
          width={8}
          height={8}
          fill="var(--tf-surface)"
          stroke={statusCor}
          strokeWidth={1.5}
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
          y={padding.top - 6}
          textAnchor="middle"
          fontSize={9}
          fontWeight={600}
          fill={statusCor}
          style={{ letterSpacing: "0.1em" }}
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
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t"
        style={{ borderColor: "var(--tf-border)" }}
      >
        <Stat label="Total" valor={`${totalPontos} pts`} />
        <Stat label="Concluídos" valor={`${pontosConcluidos} pts`} cor="var(--tf-success)" />
        <Stat label="Restantes" valor={`${pontosRestantes} pts`} cor={statusCor} />
        <Stat label="Dias" valor={`${diasPassados}/${totalDias}`} />
        <Stat label="Velocity" valor={`${velocity.toFixed(1)} pts/d`} />
        <Stat
          label="Projeção"
          valor={projecaoData ? formatarData(projecaoData) : "—"}
          cor={trendCor}
          sub={
            projecaoData && deltaDias !== 0
              ? `(${deltaDias > 0 ? `+${deltaDias}` : deltaDias}d)`
              : undefined
          }
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  valor,
  sub,
  cor,
}: {
  label: string;
  valor: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <div>
      <span
        className="label-mono block mb-0.5"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        {label}
      </span>
      <p
        className="text-[0.8125rem] font-medium"
        style={{
          color: cor || "var(--tf-text)",
          fontFamily: "var(--tf-font-mono)",
          letterSpacing: "-0.005em",
        }}
      >
        {valor}
        {sub && (
          <span
            className="text-[0.625rem] ml-1"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
