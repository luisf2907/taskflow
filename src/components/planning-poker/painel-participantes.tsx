"use client";

import { Avatar } from "@/components/quadro/avatar";
import { Membro, PokerVoto, PokerStatus } from "@/types";
import { Check, HelpCircle, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

interface PainelParticipantesProps {
  membros: Membro[];
  votos: PokerVoto[];
  status: PokerStatus;
  estatisticas: {
    media: number;
    moda: number;
    consenso: boolean;
    spread: number;
  };
}

function VotoDisplay({ valor }: { valor: string }) {
  if (valor === "cafe") return <Coffee size={14} />;
  if (valor === "?") return <HelpCircle size={14} />;
  return <span className="text-sm font-bold">{valor}</span>;
}

export function PainelParticipantes({ membros, votos, status, estatisticas }: PainelParticipantesProps) {
  const votoPorUser = new Map(votos.map((v) => [v.user_id, v]));
  const revelado = status === "revelado";

  return (
    <div className="space-y-3">
      {/* Header com estatisticas */}
      {revelado && votos.length > 0 && (
        <div
          className="flex items-center justify-center gap-4 py-2 px-4 rounded-[var(--tf-radius-sm)] text-xs font-medium"
          style={{ background: "var(--tf-bg-secondary)" }}
          aria-live="polite"
        >
          <span style={{ color: "var(--tf-text-secondary)" }}>
            Media: <strong style={{ color: "var(--tf-text)" }}>{estatisticas.media}</strong>
          </span>
          <span style={{ color: "var(--tf-text-secondary)" }}>
            Moda: <strong style={{ color: "var(--tf-text)" }}>{estatisticas.moda}</strong>
          </span>
          {estatisticas.consenso && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
              style={{ background: "var(--tf-success)" }}
            >
              Consenso!
            </span>
          )}
          {!estatisticas.consenso && estatisticas.spread > 5 && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: "var(--tf-accent-yellow)", color: "#000" }}
            >
              Discutir
            </span>
          )}
        </div>
      )}

      {/* Lista de participantes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {membros.map((membro) => {
          const voto = votoPorUser.get(membro.user_id ?? "");
          const votou = !!voto;

          return (
            <div
              key={membro.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-[var(--tf-radius-xs)] border transition-all duration-300",
              )}
              style={{
                borderColor: votou ? "var(--tf-accent)" : "var(--tf-border)",
                background: "var(--tf-surface)",
                opacity: votou ? 1 : 0.6,
              }}
            >
              <Avatar membro={membro} tamanho="sm" />
              <span
                className="text-xs font-medium truncate flex-1"
                style={{ color: "var(--tf-text)" }}
              >
                {membro.nome.split(" ")[0]}
              </span>

              {/* Indicador de voto */}
              <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                {votou && revelado ? (
                  <div
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center font-bold animate-in fade-in zoom-in duration-300"
                    style={{
                      background: "var(--tf-accent)",
                      color: "#fff",
                    }}
                  >
                    <VotoDisplay valor={voto.valor} />
                  </div>
                ) : votou ? (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--tf-accent)", color: "#fff" }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded-[4px] border-2 border-dashed"
                    style={{ borderColor: "var(--tf-border)" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
