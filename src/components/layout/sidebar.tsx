"use client";

import { cn } from "@/lib/utils";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { Quadro } from "@/types";
import {
  Kanban,
  Folder,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  Mic,
  Plus,
  SidebarClose,
  SidebarOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceSwitcher } from "./workspace-switcher";

function QuadroLink({ quadro, aberta, pathname }: { quadro: Quadro; aberta: boolean; pathname: string }) {
  const ativo = pathname === `/quadro/${quadro.id}`;
  return (
    <Link
      href={`/quadro/${quadro.id}`}
      data-active={ativo && aberta}
      className={cn(
        "sidebar-item sidebar-link flex items-center group relative",
        aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px]" : "justify-center w-[44px] h-[44px] rounded-[14px] mx-auto",
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
          aberta ? "w-5 h-5 rounded-[6px]" : "w-7 h-7 rounded-[8px]",
          ativo && !aberta && "ring-2 ring-[var(--tf-accent)] ring-offset-2 ring-offset-[var(--tf-surface)]"
        )}
        style={{ background: quadro.cor }}
      >
        <Kanban size={aberta ? 10 : 14} className="text-white/90" strokeWidth={2.5} />
      </div>
      {aberta && <span className="sidebar-fade truncate flex-1">{quadro.nome}</span>}
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
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();

  // Sincroniza o contexto caso o usuario acesse via URL direta do quadro
  useEffect(() => {
    if (pathname.startsWith("/quadro/")) {
      const parts = pathname.split("/");
      const qId = parts[2];
      if (qId) {
        const boardMatch = quadros.find((q) => q.id === qId);
        if (boardMatch && boardMatch.workspace_id && boardMatch.workspace_id !== activeWorkspaceId) {
          setActiveWorkspaceId(boardMatch.workspace_id);
        }
      }
    }
  }, [pathname, quadros, activeWorkspaceId, setActiveWorkspaceId]);

  // Filtra os quadros do workspace atual
  const quadrosAtivos = quadros.filter((q) => q.workspace_id === activeWorkspaceId);
  const quadrosAvulsos = quadros.filter((q) => !q.workspace_id);

  return (
    <>
      {/* Mobile overlay */}
      {aberta && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={cn(
          "sidebar-ease flex flex-col shrink-0 overflow-y-auto overflow-x-hidden mt-3.5 mb-3 mx-0 lg:ml-3 rounded-[32px] z-40",
          aberta ? "w-[260px] fixed lg:relative inset-y-0 left-0 lg:inset-auto m-3 lg:mt-3.5 lg:mb-3 lg:ml-3" : "w-[68px] hidden lg:flex relative"
        )}
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          scrollbarWidth: "none",
        }}
      >
        <div className={cn("py-3 flex-1 flex flex-col sidebar-item", !aberta && "items-center")}>
          {/* Logo e Botão Togle */}
          <div className={cn("flex items-center mb-4 mt-1", aberta ? "justify-between px-4" : "justify-center flex-col gap-4")}>
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
                  style={{ color: "var(--tf-text)", opacity: 1 }}
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

          <WorkspaceSwitcher aberta={aberta} onNovoWorkspace={() => {
            if (window.location.pathname === "/dashboard") {
              window.dispatchEvent(new Event("open-workspace-modal"));
            } else {
              window.location.href = "/dashboard?new-workspace=1";
            }
          }} />

          {/* Navegação Contextual (Apenas visível se tiver workspace selecionado) */}
          {activeWorkspaceId && (
            <div className="flex flex-col mt-4">
              <div className={cn("flex items-center mb-1", aberta ? "px-4" : "justify-center")}>
                {aberta && (
                  <span className="sidebar-fade text-[11px] font-bold uppercase tracking-widest text-[var(--tf-text-tertiary)] opacity-100 flex-1">
                    Contexto
                  </span>
                )}
              </div>
              
              <nav className={cn(aberta ? "space-y-0.5 px-3" : "flex flex-col items-center gap-2")}>
                <Link
                  href={`/workspace/${activeWorkspaceId}`}
                  data-active={pathname === `/workspace/${activeWorkspaceId}` && !pathname.includes("/repos")}
                  className={cn(
                    "sidebar-item sidebar-link flex items-center group relative",
                    aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px] font-medium" : "justify-center rounded-[14px] w-[44px] h-[44px]"
                  )}
                  style={{
                    background: pathname === `/workspace/${activeWorkspaceId}` && !pathname.includes("/repos") && aberta ? "var(--tf-accent-light)" : "transparent",
                    color: pathname === `/workspace/${activeWorkspaceId}` && !pathname.includes("/repos") ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                  }}
                  title={!aberta ? "Hub do Workspace" : undefined}
                >
                  <LayoutDashboard size={16} strokeWidth={pathname === `/workspace/${activeWorkspaceId}` && !pathname.includes("/repos") ? 2.5 : 2} />
                  {aberta && <span className="sidebar-fade opacity-100">Hub do Workspace</span>}
                </Link>

                <Link
                  href={`/workspace/${activeWorkspaceId}/repos`}
                  data-active={pathname === `/workspace/${activeWorkspaceId}/repos`}
                  className={cn(
                    "sidebar-item sidebar-link flex items-center group relative",
                    aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px] font-medium" : "justify-center rounded-[14px] w-[44px] h-[44px]"
                  )}
                  style={{
                    background: pathname === `/workspace/${activeWorkspaceId}/repos` && aberta ? "var(--tf-accent-light)" : "transparent",
                    color: pathname === `/workspace/${activeWorkspaceId}/repos` ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                  }}
                  title={!aberta ? "Repositórios" : undefined}
                >
                  <GitBranch size={16} strokeWidth={pathname === `/workspace/${activeWorkspaceId}/repos` ? 2.5 : 2} />
                  {aberta && <span className="sidebar-fade opacity-100">Repositórios</span>}
                </Link>

                <Link
                  href={`/workspace/${activeWorkspaceId}/reunioes`}
                  data-active={pathname.startsWith(`/workspace/${activeWorkspaceId}/reunioes`)}
                  className={cn(
                    "sidebar-item sidebar-link flex items-center group relative",
                    aberta ? "gap-3 px-2 py-[6px] rounded-[8px] text-[13px] font-medium" : "justify-center rounded-[14px] w-[44px] h-[44px]"
                  )}
                  style={{
                    background: pathname.startsWith(`/workspace/${activeWorkspaceId}/reunioes`) && aberta ? "var(--tf-accent-light)" : "transparent",
                    color: pathname.startsWith(`/workspace/${activeWorkspaceId}/reunioes`) ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                  }}
                  title={!aberta ? "Reuniões" : undefined}
                >
                  <Mic size={16} strokeWidth={pathname.startsWith(`/workspace/${activeWorkspaceId}/reunioes`) ? 2.5 : 2} />
                  {aberta && <span className="sidebar-fade opacity-100">Reuniões</span>}
                </Link>
              </nav>

              {/* Quadros do Workspace */}
              <div className={cn("mt-4", aberta ? "px-3" : "flex flex-col items-center")}>
                <div className={cn("flex items-center mb-1", aberta ? "justify-between px-1" : "justify-center")}>
                  {aberta && (
                    <span className="sidebar-fade text-[11px] font-bold uppercase tracking-widest text-[var(--tf-text-tertiary)] opacity-100 flex-1">
                      Sprints
                    </span>
                  )}
                  <button onClick={onNovoQuadro} aria-label="Criar novo quadro" className={cn("p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)] sidebar-item", !aberta && "bg-[var(--tf-bg-secondary)]")} style={{ color: "var(--tf-text-tertiary)" }} title="Novo quadro">
                    <Plus size={15} />
                  </button>
                </div>
                <div className={cn(aberta ? "flex flex-col space-y-0.5" : "flex flex-col items-center gap-2 mt-2")}>
                  {quadrosAtivos.length > 0 ? (
                    quadrosAtivos.map((q) => <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />)
                  ) : (
                    aberta && (
                      <div className="px-2 py-3 text-[12px] text-center border border-dashed rounded-[10px]" style={{ color: "var(--tf-text-tertiary)", borderColor: "var(--tf-border)" }}>
                        Nenhuma sprint criada.
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {!activeWorkspaceId && aberta && (
            <div className="flex-1 px-4 flex flex-col items-center justify-center text-center pb-10">
              <Folder size={32} style={{ color: "var(--tf-border)", marginBottom: '12px' }} />
              <p className="text-[13px] font-medium" style={{ color: "var(--tf-text-secondary)" }}>
                Selecione um Workspace
              </p>
              <p className="text-[12px] mt-1 mb-4" style={{ color: "var(--tf-text-tertiary)" }}>
                para ver os projetos, reuniões e repositórios.
              </p>
            </div>
          )}

          {/* Quadros Avulsos */}
          {quadrosAvulsos.length > 0 && (
            <div className={cn("mt-auto flex flex-col pt-4", aberta ? "px-3" : "items-center", "border-t border-[var(--tf-border)]")}>
              <div className={cn("flex items-center", aberta ? "px-1 mb-2" : "justify-center mb-3")}>
                {aberta ? (
                  <span className="sidebar-fade text-[11px] font-bold uppercase tracking-widest text-[var(--tf-text-tertiary)] opacity-100 flex-1 flex items-center gap-2">
                    <Grid3X3 size={12} /> Quadros Soltos
                  </span>
                ) : (
                  <div title="Quadros Avulsos">
                    <Grid3X3 size={15} style={{ color: "var(--tf-text-tertiary)" }} />
                  </div>
                )}
              </div>
              <div className={cn(aberta ? "flex flex-col space-y-0.5" : "flex flex-col items-center gap-2")}>
                {quadrosAvulsos.map((q) => <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />)}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
