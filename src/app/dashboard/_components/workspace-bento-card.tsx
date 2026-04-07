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

  // Fake progress based on id length just to make it visually pleasing for the demo,
  // replacing this with real metrics when carts are queried per workspace.
  const fakeProgress =
    (Array.from(ws.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      60) +
    20;

  return (
    <div
      className="group relative rounded-[32px] overflow-hidden p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 min-h-[220px]"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-48 h-48 opacity-[0.08] blur-3xl rounded-full pointer-events-none transition-transform group-hover:scale-110 duration-700"
        style={{ background: ws.cor }}
      />

      <div className="flex justify-between items-start relative z-10">
        <div
          className="w-14 h-14 rounded-[20px] flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
          style={{ background: ws.cor }}
          onClick={() => router.push(`/workspace/${ws.id}`)}
        >
          <Folder size={26} className="text-white" />
        </div>

        <Dropdown
          trigger={
            <button
              className="p-2 rounded-[14px] transition-colors hover:bg-black/5"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <MoreVertical size={18} />
            </button>
          }
        >
          <DropdownItem onClick={() => onEditar(ws)}>
            <Pencil size={14} /> Editar
          </DropdownItem>
          <DropdownItem perigo onClick={() => onExcluir(ws.id)}>
            <Trash2 size={14} /> Excluir
          </DropdownItem>
        </Dropdown>
      </div>

      <div
        className="relative z-10 mt-6 cursor-pointer"
        onClick={() => router.push(`/workspace/${ws.id}`)}
      >
        <h2
          className="text-[22px] font-black tracking-tight mb-2"
          style={{ color: "var(--tf-text)" }}
        >
          {ws.nome}
        </h2>
        {ws.descricao && (
          <p
            className="text-[13px] line-clamp-2 mb-4 font-medium leading-relaxed"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            {ws.descricao}
          </p>
        )}

        {/* Barra de Progresso visual (Item 1) */}
        <div className="mt-4 mb-2">
          <div
            className="flex justify-between text-[11px] font-black tracking-wide uppercase mb-2"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <span>Saúde do Pojeto</span>
            <span style={{ color: ws.cor }}>{fakeProgress}%</span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${fakeProgress}%`, background: ws.cor }}
            />
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between mt-5 pt-5 border-t relative z-10"
        style={{ borderColor: "var(--tf-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold"
            style={{
              background: "var(--tf-bg-secondary)",
              color: "var(--tf-text)",
            }}
          >
            {qtdQuadros} {qtdQuadros === 1 ? "Sprint" : "Sprints"}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNovaSprint(ws.id);
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
          style={{ background: "var(--tf-accent)", color: "white" }}
          title="Nova Sprint neste Workspace"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
