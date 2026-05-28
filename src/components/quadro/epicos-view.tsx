"use client";

import {
  EpicoComFilhos,
  EpicoFilho,
  useEpicosWorkspace,
} from "@/hooks/use-epicos-workspace";
import type { Membro } from "@/types";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Crosshair,
  Inbox,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./avatar";
import { EpicoMarker } from "./epico-marker";

interface EpicosViewProps {
  workspaceId: string | null;
  membros: Membro[];
}

// Helper: status visual de um quadro/sprint
function badgeSprint(filho: EpicoFilho) {
  if (!filho.quadro_nome) {
    return { label: "Backlog", cor: "var(--tf-text-tertiary)", bg: "var(--tf-bg-secondary)" };
  }
  const status = filho.quadro_status;
  const map = {
    ativa: { cor: "var(--tf-success)", bg: "var(--tf-success-bg)" },
    planejada: { cor: "var(--tf-text-secondary)", bg: "var(--tf-bg-secondary)" },
    concluida: { cor: "var(--tf-text-tertiary)", bg: "var(--tf-bg-secondary)" },
  } as const;
  const c = status ? map[status] : map.planejada;
  return { label: filho.quadro_nome, cor: c.cor, bg: c.bg };
}

// =============================================
// Linha de filho
// =============================================
function FilhoRow({
  filho,
  membros,
  onAbrir,
}: {
  filho: EpicoFilho;
  membros: Membro[];
  onAbrir: () => void;
}) {
  const concluido = !!filho.data_conclusao;
  const sprint = badgeSprint(filho);
  const cardMembros = membros.filter((m) => filho.membro_ids.includes(m.id));

  return (
    <li
      className="group grid items-center gap-2 px-2 py-1.5 transition-colors"
      style={{
        gridTemplateColumns: "12px 1fr auto auto auto",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {concluido ? (
        <CheckCircle2 size={11} strokeWidth={2} style={{ color: "var(--tf-success)" }} />
      ) : (
        <Circle size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
      )}
      <button
        onClick={onAbrir}
        className="text-left text-[0.8125rem] truncate"
        style={{
          color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
          textDecoration: concluido ? "line-through" : "none",
          letterSpacing: "-0.005em",
        }}
      >
        {filho.titulo}
      </button>
      {/* Sprint / Coluna */}
      <span
        className="text-[0.625rem] font-medium px-1.5 h-[17px] inline-flex items-center gap-1 shrink-0"
        style={{
          color: sprint.cor,
          background: sprint.bg,
          borderRadius: "var(--tf-radius-xs)",
          fontFamily: "var(--tf-font-mono)",
        }}
        title={
          filho.coluna_nome
            ? `${sprint.label} · ${filho.coluna_nome}`
            : sprint.label
        }
      >
        {sprint.label}
        {filho.coluna_nome && (
          <span style={{ opacity: 0.6 }}>· {filho.coluna_nome}</span>
        )}
      </span>
      {/* Membros */}
      {cardMembros.length > 0 ? (
        <div className="flex -space-x-0.5 shrink-0">
          {cardMembros.slice(0, 3).map((m) => (
            <div
              key={m.id}
              style={{
                outline: "1.5px solid var(--tf-surface)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              <Avatar membro={m} tamanho="sm" />
            </div>
          ))}
        </div>
      ) : (
        <span />
      )}
      {/* Peso */}
      {filho.peso != null ? (
        <span
          className="text-[0.625rem] font-medium px-1 h-[17px] inline-flex items-center shrink-0"
          style={{
            color: "var(--tf-accent-text)",
            background: "var(--tf-accent-light)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
        >
          {filho.peso}
        </span>
      ) : (
        <span />
      )}
    </li>
  );
}

// =============================================
// Cartão de épico
// =============================================
function EpicoCard({
  epico,
  membros,
  onAbrirCartao,
}: {
  epico: EpicoComFilhos;
  membros: Membro[];
  onAbrirCartao: (cartaoId: string, quadroId?: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const percent =
    epico.total_pts > 0
      ? Math.round((epico.pts_concluidos / epico.total_pts) * 100)
      : epico.total_filhos > 0
        ? Math.round((epico.filhos_concluidos / epico.total_filhos) * 100)
        : 0;

  return (
    <div
      style={{
        background: "var(--tf-surface)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
        overflow: "hidden",
      }}
    >
      {/* Header do épico */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors text-left"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          aria-hidden
          style={{
            color: "var(--tf-text-tertiary)",
            transition: "transform 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ChevronRight size={13} strokeWidth={2} />
        </span>

        <EpicoMarker cor={epico.cor_epico} titulo={epico.titulo} enfase tamanho={14} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onAbrirCartao(epico.id, epico.quadro_id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  onAbrirCartao(epico.id, epico.quadro_id);
                }
              }}
              className="text-[0.875rem] font-semibold truncate hover:underline cursor-pointer"
              style={{
                color: epico.data_conclusao ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                textDecoration: epico.data_conclusao ? "line-through" : "none",
                letterSpacing: "-0.01em",
              }}
            >
              {epico.titulo}
            </span>
            {epico.data_conclusao && (
              <span
                className="text-[0.625rem] font-medium px-1.5 h-[16px] inline-flex items-center"
                style={{
                  color: "var(--tf-success)",
                  background: "var(--tf-success-bg)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "var(--tf-success)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                Concluído
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 mt-1 text-[0.625rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            <span>
              {epico.filhos_concluidos}/{epico.total_filhos} cards
            </span>
            <span>·</span>
            <span>
              {epico.pts_concluidos}/{epico.total_pts} pts
            </span>
            {epico.sprints_distintos > 1 && (
              <>
                <span>·</span>
                <span style={{ color: "var(--tf-accent)" }}>
                  cruza {epico.sprints_distintos} sprints
                </span>
              </>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-[120px]">
          <span
            className="text-[0.6875rem] font-semibold"
            style={{
              color: percent === 100 ? "var(--tf-success)" : "var(--tf-text)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {percent}%
          </span>
          <div
            className="w-full h-[3px] overflow-hidden"
            style={{ background: "var(--tf-border)", borderRadius: "1px" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${percent}%`,
                background:
                  percent === 100 ? "var(--tf-success)" : epico.cor_epico || "var(--tf-accent)",
              }}
            />
          </div>
        </div>
      </button>

      {/* Filhos */}
      {expanded && (
        <div
          className="px-2 pb-2"
          style={{ borderTop: "1px solid var(--tf-border-subtle)" }}
        >
          {epico.filhos.length === 0 ? (
            <p
              className="text-[0.75rem] text-center py-3"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              Nenhum card vinculado a este épico ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 pt-1.5">
              {epico.filhos.map((f) => (
                <FilhoRow
                  key={f.id}
                  filho={f}
                  membros={membros}
                  onAbrir={() => onAbrirCartao(f.id, f.quadro_id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// VIEW PRINCIPAL
// =============================================
export function EpicosView({ workspaceId, membros }: EpicosViewProps) {
  const { epicos, orfaos, carregando } = useEpicosWorkspace(workspaceId);
  const [orfaosExpanded, setOrfaosExpanded] = useState(false);
  const router = useRouter();

  function abrirCartao(cartaoId: string, quadroId?: string | null) {
    if (quadroId) {
      router.push(`/quadro/${quadroId}?card=${cartaoId}`);
    } else if (workspaceId) {
      router.push(`/workspace/${workspaceId}?card=${cartaoId}`);
    }
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p
          className="text-[0.75rem]"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
          }}
        >
          Carregando épicos…
        </p>
      </div>
    );
  }

  if (epicos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
        <Crosshair size={28} strokeWidth={1.5} style={{ color: "var(--tf-border-strong)" }} />
        <div className="text-center">
          <p
            className="text-[0.875rem] font-medium"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Nenhum épico ainda
          </p>
          <p
            className="text-[0.75rem] mt-1"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            Crie um épico abrindo qualquer card e clicando na propriedade ⌖ Épico
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 pb-6">
      <div className="flex flex-col gap-3 max-w-[1100px] mx-auto">
        {/* Header informativo */}
        <div
          className="flex items-center gap-2 text-[0.625rem] py-2"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Crosshair size={11} strokeWidth={1.75} />
          <span>
            {epicos.length} épico{epicos.length > 1 ? "s" : ""} no workspace · cruzando sprints
          </span>
        </div>

        {/* Cada épico */}
        {epicos.map((epico) => (
          <EpicoCard
            key={epico.id}
            epico={epico}
            membros={membros}
            onAbrirCartao={abrirCartao}
          />
        ))}

        {/* Órfãos */}
        {orfaos.length > 0 && (
          <div
            style={{
              background: "var(--tf-surface)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOrfaosExpanded((v) => !v)}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors text-left"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                aria-hidden
                style={{
                  color: "var(--tf-text-tertiary)",
                  transition: "transform 0.15s ease",
                  transform: orfaosExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <ChevronRight size={13} strokeWidth={2} />
              </span>
              <Inbox size={13} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
              <div className="flex-1">
                <span
                  className="text-[0.8125rem] font-medium"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Sem épico
                </span>
                <span
                  className="ml-2 text-[0.625rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {orfaos.length} card{orfaos.length > 1 ? "s" : ""} · {orfaos.reduce((s, c) => s + (c.peso || 0), 0)} pts
                </span>
              </div>
            </button>
            {orfaosExpanded && (
              <div
                className="px-2 pb-2"
                style={{ borderTop: "1px solid var(--tf-border-subtle)" }}
              >
                <ul className="flex flex-col gap-0.5 pt-1.5">
                  {orfaos.map((f) => (
                    <FilhoRow
                      key={f.id}
                      filho={f}
                      membros={membros}
                      onAbrir={() => abrirCartao(f.id, f.quadro_id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
