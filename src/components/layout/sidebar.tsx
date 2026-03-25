"use client";

import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Quadro } from "@/types";
import {
  Kanban,
  ChevronDown,
  ChevronRight,
  Folder,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  Plus,
  SidebarClose,
  SidebarOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function QuadroLink({ quadro, aberta, pathname }: { quadro: Quadro; aberta: boolean; pathname: string }) {
  const ativo = pathname === `/quadro/${quadro.id}`;
  return (
    <Link
      href={`/quadro/${quadro.id}`}
      data-active={ativo && aberta}
      className={cn(
        "sidebar-item sidebar-link flex items-center group",
        aberta ? "gap-2.5 px-2 py-1.5 rounded-[14px] text-[13px] w-full" : "justify-center w-[44px] h-[44px] rounded-[14px] mx-auto relative",
        ativo ? "font-semibold" : ""
      )}
      style={{
        background: ativo && aberta ? "var(--tf-accent-light)" : "transparent",
        color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
      }}
      title={!aberta ? quadro.nome : undefined}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0 sidebar-item",
          aberta ? "w-5 h-5 rounded-[8px]" : "w-7 h-7 rounded-[8px]",
          ativo && !aberta && "ring-2 ring-[var(--tf-accent)] ring-offset-2 ring-offset-[var(--tf-surface)]"
        )}
        style={{ background: quadro.cor }}
      >
        <Kanban size={aberta ? 10 : 14} className="text-white/90" strokeWidth={2.5} />
      </div>
      {aberta && <span className="sidebar-fade truncate">{quadro.nome}</span>}
    </Link>
  );
}

interface SidebarProps {
  quadros: Quadro[];
  onNovoQuadro: () => void;
  aberta: boolean;
  onToggle: () => void;
}

export function Sidebar({ quadros, onNovoQuadro, aberta, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
      <aside
        className={cn(
          "sidebar-ease flex flex-col shrink-0 overflow-y-auto overflow-x-hidden mt-3.5 mb-3 mx-0 lg:ml-3 rounded-[32px] relative z-40",
          aberta ? "w-[260px]" : "w-[68px]"
        )}
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          scrollbarWidth: "none",
        }}
      >
        <div className={cn("py-3 flex-1 flex flex-col sidebar-item", aberta ? "px-3" : "px-0 items-center")}>
          {/* Logo */}
          <div className={cn("flex items-center mb-4 mt-1", aberta ? "justify-between px-1" : "justify-center flex-col gap-4")}>
            <Link href="/dashboard" className="flex items-center gap-3" title={!aberta ? "Home" : undefined}>
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: "var(--tf-accent)" }}
              >
                <Kanban size={18} className="text-white" strokeWidth={2.5} />
              </div>
              {aberta && (
                <span
                  className="sidebar-fade text-[17px] font-bold tracking-tight"
                  style={{ color: "var(--tf-text)", opacity: aberta ? 1 : 0 }}
                >
                  Taskflow
                </span>
              )}
            </Link>

            <button
              onClick={onToggle}
              className="p-1.5 rounded-[8px] sidebar-item hover:bg-[var(--tf-surface-hover)]"
              style={{ color: "var(--tf-text-tertiary)" }}
              aria-label={aberta ? "Recolher barra lateral" : "Expandir barra lateral"}
              title={aberta ? "Recolher" : "Expandir"}
            >
              {aberta ? <SidebarClose size={16} strokeWidth={1.8} /> : <SidebarOpen size={16} strokeWidth={1.8} />}
            </button>
          </div>

          <div className={cn("flex items-center mb-2 mt-2 sidebar-item", aberta ? "justify-between px-2 py-1.5" : "justify-center")}>
            {aberta && (
              <span className="sidebar-fade text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)", opacity: aberta ? 1 : 0 }}>
                Workspace
              </span>
            )}
            <button onClick={onNovoQuadro} aria-label="Criar novo quadro" className={cn("p-1.5 rounded-[8px] sidebar-item hover:bg-[var(--tf-surface-hover)]", !aberta && "bg-[var(--tf-bg-secondary)] text-[var(--tf-text-secondary)]")} style={aberta ? { color: "var(--tf-text-tertiary)" } : {}} title="Novo quadro">
              <Plus size={15} />
            </button>
          </div>

          <nav className={cn("flex-1", aberta ? "space-y-3" : "space-y-4 w-full flex flex-col items-center mt-2")}>
            {workspaces.map((ws) => {
              const wsQuadros = quadrosPorWs[ws.id] || [];
              const abertoWs = wsAbertos.has(ws.id);
              const temAtivo = wsQuadros.some((q) => pathname === `/quadro/${q.id}`) || pathname.startsWith(`/workspace/${ws.id}`);
              const expanded = (aberta && (abertoWs || temAtivo)) || !aberta;

              return (
                <div key={ws.id} className={cn(!aberta && "w-full flex flex-col items-center gap-2")}>
                  <button
                    onClick={() => { if (aberta) toggleWs(ws.id); else router.push(`/workspace/${ws.id}`); }}
                    aria-expanded={expanded}
                    aria-label={`Workspace ${ws.nome}`}
                    className={cn(
                      "sidebar-item flex items-center text-left group hover-surface",
                      aberta ? "gap-2.5 w-full px-2 py-1.5 rounded-[14px]" : "justify-center rounded-[14px] w-[44px] h-[44px]"
                    )}
                    title={!aberta ? ws.nome : undefined}
                  >
                    <div
                      className={cn("flex items-center justify-center shrink-0 sidebar-item", aberta ? "w-6 h-6 rounded-[8px]" : "w-8 h-8 rounded-[14px]")}
                      style={{ background: ws.cor }}
                    >
                      <Folder size={aberta ? 12 : 16} className="text-white" strokeWidth={aberta ? 2.5 : 2} />
                    </div>
                    {aberta && (
                      <>
                        <span className="sidebar-fade text-[13.5px] font-semibold truncate flex-1" style={{ color: "var(--tf-text)", opacity: aberta ? 1 : 0 }}>
                          {ws.nome}
                        </span>
                        <ChevronDown
                          size={14}
                          className="sidebar-chevron"
                          style={{ color: "var(--tf-text-tertiary)", transform: (abertoWs || temAtivo) ? "rotate(0deg)" : "rotate(-90deg)" }}
                        />
                      </>
                    )}
                  </button>

                  {/* Sub-items */}
                  <div
                    className={cn(
                      "sidebar-sub overflow-hidden",
                      aberta ? "ml-4 space-y-0.5" : "flex flex-col gap-1 w-full"
                    )}
                    style={{
                      maxHeight: expanded ? "600px" : "0px",
                      opacity: expanded ? 1 : 0,
                    }}
                  >
                    {aberta && (abertoWs || temAtivo) && (
                      <>
                        <Link
                          href={`/workspace/${ws.id}`}
                          data-active={pathname === `/workspace/${ws.id}` && !pathname.includes("/repos")}
                          className={cn(
                            "sidebar-item sidebar-link flex items-center group relative",
                            aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px] font-medium" : "justify-center rounded-[14px] w-[44px] h-[44px] mx-auto"
                          )}
                          style={{
                            background: pathname === `/workspace/${ws.id}` && !pathname.includes("/repos") && aberta ? "var(--tf-accent-light)" : "transparent",
                            color: pathname === `/workspace/${ws.id}` && !pathname.includes("/repos") ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                          }}
                          title={!aberta ? "Hub do Workspace" : undefined}
                        >
                          <LayoutDashboard size={15} strokeWidth={pathname === `/workspace/${ws.id}` && !pathname.includes("/repos") ? 2.5 : 2} />
                          <span className="sidebar-fade" style={{ opacity: aberta ? 1 : 0 }}>Hub do Workspace</span>
                        </Link>

                        <Link
                          href={`/workspace/${ws.id}/repos`}
                          data-active={pathname === `/workspace/${ws.id}/repos`}
                          className={cn(
                            "sidebar-item sidebar-link flex items-center group relative",
                            aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px] font-medium" : "justify-center rounded-[14px] w-[44px] h-[44px] mx-auto"
                          )}
                          style={{
                            background: pathname === `/workspace/${ws.id}/repos` && aberta ? "var(--tf-accent-light)" : "transparent",
                            color: pathname === `/workspace/${ws.id}/repos` ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                          }}
                          title={!aberta ? "Repositórios" : undefined}
                        >
                          <GitBranch size={15} strokeWidth={pathname === `/workspace/${ws.id}/repos` ? 2.5 : 2} />
                          <span className="sidebar-fade" style={{ opacity: aberta ? 1 : 0 }}>Repositórios</span>
                        </Link>
                      </>
                    )}

                    {wsQuadros.length > 0 && wsQuadros.map((q) => <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />)}
                  </div>
                </div>
              );
            })}

            {/* Quadros avulsos */}
            {quadrosAvulsos.length > 0 && (
              <div className={cn(!aberta && "w-full flex flex-col items-center gap-1 mt-4 border-t pt-4", !aberta && { borderColor: "var(--tf-border)" })}>
                {aberta && (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Grid3X3 size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                    <span className="sidebar-fade text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)", opacity: aberta ? 1 : 0 }}>
                      Quadros
                    </span>
                  </div>
                )}
                {!aberta && (
                  <div className="mb-2 w-4 h-[2px] rounded-full" style={{ background: "var(--tf-border)" }} />
                )}
                <div className={cn(aberta ? "mt-0.5 space-y-0.5" : "flex flex-col gap-1 w-full")}>
                  {quadrosAvulsos.map((q) => <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />)}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>
  );
}
