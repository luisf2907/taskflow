"use client";

import { useRouter } from "next/navigation";
import { Folder, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import type { Workspace } from "@/types";

interface WorkspaceBentoCardProps {
  ws: Workspace;
  qtdQuadros: number;
  onEditar: (ws: Workspace) => void;
  onExcluir: (wsId: string) => void;
  onNovaSprint: (wsId: string) => void;
}

export function WorkspaceBentoCard({
  ws,
  qtdQuadros,
  onEditar,
  onExcluir,
  onNovaSprint,
}: WorkspaceBentoCardProps) {
  const router = useRouter();

  const fakeProgress =
    (Array.from(ws.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      60) +
    20;

  return (
    <div
      className="group relative overflow-hidden p-4 flex flex-col justify-between transition-colors min-h-[200px]"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border)")
      }
    >
      <div className="flex justify-between items-start relative z-10">
        <div
          className="w-10 h-10 flex items-center justify-center cursor-pointer transition-colors"
          style={{
            background: ws.cor,
            borderRadius: "var(--tf-radius-sm)",
          }}
          onClick={() => router.push(`/workspace/${ws.id}`)}
        >
          <Folder size={18} className="text-white" strokeWidth={1.75} />
        </div>

        <Dropdown
          trigger={
            <button
              className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
              style={{
                color: "var(--tf-text-tertiary)",
                borderRadius: "var(--tf-radius-xs)",
              }}
              aria-label="Opções"
            >
              <MoreVertical size={14} strokeWidth={1.75} />
            </button>
          }
        >
          <DropdownItem onClick={() => onEditar(ws)}>
            <Pencil size={12} strokeWidth={1.75} /> Editar
          </DropdownItem>
          <DropdownItem perigo onClick={() => onExcluir(ws.id)}>
            <Trash2 size={12} strokeWidth={1.75} /> Excluir
          </DropdownItem>
        </Dropdown>
      </div>

      <div
        className="relative z-10 mt-4 cursor-pointer flex-1 flex flex-col"
        onClick={() => router.push(`/workspace/${ws.id}`)}
      >
        <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
          Workspace
        </p>
        <h2
          className="text-[1.125rem] font-semibold mb-2"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.015em",
          }}
        >
          {ws.nome}
        </h2>
        {ws.descricao && (
          <p
            className="text-[0.75rem] line-clamp-2 leading-relaxed"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            {ws.descricao}
          </p>
        )}

        {/* Barra de Progresso */}
        <div className="mt-auto pt-4">
          <div
            className="flex justify-between text-[0.625rem] font-medium mb-1.5"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span>Saúde do projeto</span>
            <span style={{ color: ws.cor }}>{fakeProgress}%</span>
          </div>
          <div
            className="w-full h-[3px] overflow-hidden"
            style={{
              background: "var(--tf-border)",
              borderRadius: "1px",
            }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${fakeProgress}%`, background: ws.cor }}
            />
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between mt-4 pt-3 border-t relative z-10"
        style={{ borderColor: "var(--tf-border)" }}
      >
        <span
          className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
          style={{
            background: "var(--tf-bg-secondary)",
            color: "var(--tf-text-secondary)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {qtdQuadros} {qtdQuadros === 1 ? "Sprint" : "Sprints"}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNovaSprint(ws.id);
          }}
          className="w-7 h-7 flex items-center justify-center transition-colors hover:brightness-110 cursor-pointer"
          style={{
            background: "var(--tf-accent)",
            color: "white",
            borderRadius: "var(--tf-radius-xs)",
          }}
          title="Nova sprint neste workspace"
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
