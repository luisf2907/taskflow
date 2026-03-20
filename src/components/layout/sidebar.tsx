"use client";

import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Quadro } from "@/types";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  Grid3X3,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

interface SidebarProps {
  quadros: Quadro[];
  onNovoQuadro: () => void;
  aberta: boolean;
  onToggle: () => void;
}

export function Sidebar({ quadros, onNovoQuadro, aberta, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { workspaces } = useWorkspaces();
  const [wsAbertos, setWsAbertos] = useState<Set<string>>(new Set());

  const quadrosPorWs = useMemo(() => {
    const mapa: Record<string, typeof quadros> = {};
    for (const ws of workspaces) {
      mapa[ws.id] = quadros.filter((q) => q.workspace_id === ws.id);
    }
    return mapa;
  }, [quadros, workspaces]);

  const quadrosAvulsos = useMemo(
    () => quadros.filter((q) => !q.workspace_id),
    [quadros]
  );

  function toggleWs(id: string) {
    setWsAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function QuadroLink({ quadro }: { quadro: Quadro }) {
    const ativo = pathname === `/quadro/${quadro.id}`;
    return (
      <Link
        href={`/quadro/${quadro.id}`}
        className={cn(
          "flex items-center gap-2.5 px-2 py-[6px] rounded-lg text-[13px] transition-smooth",
          ativo ? "font-medium" : ""
        )}
        style={{
          background: ativo ? "var(--tf-accent-light)" : "transparent",
          color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
        }}
        onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = "var(--tf-surface-hover)"; }}
        onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = ativo ? "var(--tf-accent-light)" : "transparent"; }}
      >
        <div
          className="w-5 h-4 rounded-[3px] shrink-0"
          style={{ background: quadro.cor }}
        />
        <span className="truncate">{quadro.nome}</span>
      </Link>
    );
  }

  return (
    <>
      <aside
        className={cn(
          "border-r flex flex-col shrink-0 overflow-hidden overflow-y-auto",
          aberta ? "sidebar-expanded" : "sidebar-collapsed"
        )}
        style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}
      >
        <div className="p-3 flex-1 min-w-[260px]">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
              Navegação
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={onNovoQuadro} className="p-1 rounded-md transition-smooth" style={{ color: "var(--tf-text-tertiary)" }} title="Novo quadro">
                <Plus size={15} />
              </button>
              <button onClick={onToggle} className="p-1 rounded-md transition-smooth" style={{ color: "var(--tf-text-tertiary)" }} title="Recolher">
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>

          <nav className="space-y-3">
            {/* Workspaces */}
            {workspaces.map((ws) => {
              const wsQuadros = quadrosPorWs[ws.id] || [];
              const aberto = wsAbertos.has(ws.id);
              // Auto-abrir se tem quadro ativo dentro
              const temAtivo = wsQuadros.some((q) => pathname === `/quadro/${q.id}`);

              return (
                <div key={ws.id}>
                  <button
                    onClick={() => toggleWs(ws.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-smooth text-left"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: ws.cor }}>
                      <Folder size={11} className="text-white" />
                    </div>
                    <span className="text-[13px] font-semibold truncate flex-1" style={{ color: "var(--tf-text)" }}>
                      {ws.nome}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      {wsQuadros.length}
                    </span>
                    {(aberto || temAtivo) ? (
                      <ChevronDown size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                    ) : (
                      <ChevronRight size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                    )}
                  </button>

                  {(aberto || temAtivo) && wsQuadros.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {wsQuadros.map((q) => <QuadroLink key={q.id} quadro={q} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quadros avulsos */}
            {quadrosAvulsos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Grid3X3 size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                    Quadros
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {quadrosAvulsos.map((q) => <QuadroLink key={q.id} quadro={q} />)}
                </div>
              </div>
            )}

            {quadros.length === 0 && workspaces.length === 0 && (
              <p className="text-[12px] px-2 py-3" style={{ color: "var(--tf-text-tertiary)" }}>
                Nenhum quadro ainda
              </p>
            )}
          </nav>
        </div>
      </aside>

      {!aberta && (
        <button
          onClick={onToggle}
          className="fixed left-2 bottom-4 z-30 p-2 rounded-full border shadow-md transition-smooth hover:scale-110"
          style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
          title="Expandir sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </>
  );
}
