"use client";

import { cn } from "@/lib/utils";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { Quadro } from "@/types";
import {
  Folder,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  Mic,
  BookOpen,
  Plus,
  SidebarClose,
  SidebarOpen,
  Kanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceSwitcher } from "./workspace-switcher";

// ─── NAV LINK ──────────────────────────────────────────
// Linear-style: hover → border-left 2px laranja + bg sutil.
// Active → border-left laranja full + bg-tint laranja 8%.
interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  aberta: boolean;
  tooltip?: string;
}

function NavLink({ href, icon: Icon, label, active, aberta, tooltip }: NavLinkProps) {
  return (
    <Link
      href={href}
      data-active={active}
      title={!aberta ? (tooltip || label) : undefined}
      className={cn(
        "sidebar-item relative flex items-center group outline-none",
        aberta
          ? "gap-2.5 pl-3 pr-2 h-8 rounded-[var(--tf-radius-sm)] text-[0.8125rem]"
          : "justify-center w-8 h-8 mx-auto rounded-[var(--tf-radius-sm)]"
      )}
      style={{
        background: active ? "var(--tf-accent-light)" : "transparent",
        color: active ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {/* Border-left accent indicator */}
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full transition-all"
        style={{
          background: active ? "var(--tf-accent)" : "transparent",
        }}
      />
      <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
      {aberta && <span className="sidebar-fade truncate">{label}</span>}
    </Link>
  );
}

// ─── QUADRO LINK ──────────────────────────────────────
function QuadroLink({
  quadro,
  aberta,
  pathname,
}: {
  quadro: Quadro;
  aberta: boolean;
  pathname: string;
}) {
  const ativo = pathname === `/quadro/${quadro.id}`;
  return (
    <Link
      href={`/quadro/${quadro.id}`}
      data-active={ativo && aberta}
      title={!aberta ? quadro.nome : undefined}
      className={cn(
        "sidebar-item relative flex items-center group outline-none",
        aberta
          ? "gap-2.5 pl-3 pr-2 h-8 rounded-[var(--tf-radius-sm)] text-[0.8125rem]"
          : "justify-center w-8 h-8 mx-auto rounded-[var(--tf-radius-sm)]"
      )}
      style={{
        background: ativo ? "var(--tf-accent-light)" : "transparent",
        color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
        fontWeight: ativo ? 500 : 400,
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full transition-all"
        style={{ background: ativo ? "var(--tf-accent)" : "transparent" }}
      />
      {/* Cor do quadro como dot — sem box colorido cheio */}
      <span
        className="w-2 h-2 shrink-0 rounded-full"
        style={{ background: quadro.cor }}
      />
      {aberta && <span className="sidebar-fade truncate flex-1">{quadro.nome}</span>}
    </Link>
  );
}

// ─── SECTION HEADER ───────────────────────────────────
function SectionHeader({ aberta, children }: { aberta: boolean; children: React.ReactNode }) {
  if (!aberta) return null;
  return (
    <div
      className="sidebar-fade label-mono flex items-center gap-2 px-3 mb-1 mt-1"
      style={{ color: "var(--tf-text-tertiary)" }}
    >
      {children}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────
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

  const quadrosAtivos = quadros.filter((q) => q.workspace_id === activeWorkspaceId);
  const quadrosAvulsos = quadros.filter((q) => !q.workspace_id);

  const hubActive =
    pathname === `/workspace/${activeWorkspaceId}` && !pathname.includes("/repos");
  const reposActive = pathname === `/workspace/${activeWorkspaceId}/repos`;
  const wikiActive = pathname.startsWith(`/workspace/${activeWorkspaceId}/wiki`);
  const meetsActive = pathname.startsWith(`/workspace/${activeWorkspaceId}/reunioes`);

  return (
    <>
      {/* Mobile overlay */}
      {aberta && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={onToggle}
        />
      )}
      <aside
        className={cn(
          "sidebar-ease flex flex-col shrink-0 overflow-y-auto overflow-x-hidden mt-3.5 mb-3 mx-0 lg:ml-3 rounded-[var(--tf-radius-xl)] z-40",
          aberta
            ? "w-[232px] fixed lg:relative inset-y-0 left-0 lg:inset-auto m-3 lg:mt-3.5 lg:mb-3 lg:ml-3"
            : "w-[52px] hidden lg:flex relative"
        )}
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          scrollbarWidth: "none",
        }}
      >
        <div className={cn("py-2.5 flex-1 flex flex-col sidebar-item", !aberta && "items-center")}>
          {/* Logo + Toggle */}
          <div
            className={cn(
              "flex items-center mb-3",
              aberta ? "justify-between px-3" : "justify-center flex-col gap-3"
            )}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
              title={!aberta ? "Home" : undefined}
            >
              <div
                className="w-7 h-7 rounded-[var(--tf-radius-sm)] flex items-center justify-center shrink-0"
                style={{ background: "var(--tf-accent)" }}
              >
                <Kanban size={15} className="text-white" strokeWidth={2.5} />
              </div>
              {aberta && (
                <span
                  className="sidebar-fade text-[0.9375rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
                >
                  Taskflow
                </span>
              )}
            </Link>

            <button
              onClick={onToggle}
              className="p-1 rounded-[var(--tf-radius-xs)] sidebar-item hover:bg-[var(--tf-surface-hover)] transition-colors"
              style={{ color: "var(--tf-text-tertiary)" }}
              aria-label={aberta ? "Recolher barra lateral" : "Expandir barra lateral"}
              title={aberta ? "Recolher" : "Expandir"}
            >
              {aberta ? (
                <SidebarClose size={15} strokeWidth={1.75} />
              ) : (
                <SidebarOpen size={15} strokeWidth={1.75} />
              )}
            </button>
          </div>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher
            aberta={aberta}
            onNovoWorkspace={() => {
              if (window.location.pathname === "/dashboard") {
                window.dispatchEvent(new Event("open-workspace-modal"));
              } else {
                window.location.href = "/dashboard?new-workspace=1";
              }
            }}
          />

          {/* Navegação Contextual */}
          {activeWorkspaceId && (
            <div className="flex flex-col mt-3">
              <SectionHeader aberta={aberta}>Workspace</SectionHeader>

              <nav
                className={cn(
                  aberta ? "flex flex-col gap-0.5 px-2" : "flex flex-col items-center gap-1"
                )}
              >
                <NavLink
                  href={`/workspace/${activeWorkspaceId}`}
                  icon={LayoutDashboard}
                  label="Hub"
                  active={hubActive}
                  aberta={aberta}
                  tooltip="Hub do Workspace"
                />
                <NavLink
                  href={`/workspace/${activeWorkspaceId}/repos`}
                  icon={GitBranch}
                  label="Repositórios"
                  active={reposActive}
                  aberta={aberta}
                />
                <NavLink
                  href={`/workspace/${activeWorkspaceId}/wiki`}
                  icon={BookOpen}
                  label="Wiki"
                  active={wikiActive}
                  aberta={aberta}
                />
                <NavLink
                  href={`/workspace/${activeWorkspaceId}/reunioes`}
                  icon={Mic}
                  label="Reuniões"
                  active={meetsActive}
                  aberta={aberta}
                />
              </nav>

              {/* Sprints */}
              <div className={cn("mt-4", aberta ? "" : "flex flex-col items-center")}>
                <div
                  className={cn(
                    "flex items-center mb-1",
                    aberta ? "px-3 justify-between" : "justify-center"
                  )}
                >
                  <SectionHeader aberta={aberta}>
                    <span className="flex-1">Sprints</span>
                  </SectionHeader>
                  <button
                    onClick={onNovoQuadro}
                    aria-label="Criar novo quadro"
                    title="Novo quadro"
                    className={cn(
                      "rounded-[var(--tf-radius-xs)] sidebar-item transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]",
                      aberta ? "p-1" : "p-1 mt-2"
                    )}
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div
                  className={cn(
                    aberta ? "flex flex-col gap-0.5 px-2" : "flex flex-col items-center gap-1 mt-1"
                  )}
                >
                  {quadrosAtivos.length > 0 ? (
                    quadrosAtivos.map((q) => (
                      <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />
                    ))
                  ) : (
                    aberta && (
                      <div
                        className="mx-1 px-2.5 py-2 text-[0.75rem] text-center border border-dashed"
                        style={{
                          color: "var(--tf-text-tertiary)",
                          borderColor: "var(--tf-border)",
                          borderRadius: "var(--tf-radius-sm)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        Nenhuma sprint
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {!activeWorkspaceId && aberta && (
            <div className="flex-1 px-4 flex flex-col items-center justify-center text-center pb-10">
              <Folder size={24} style={{ color: "var(--tf-border)", marginBottom: "10px" }} />
              <p
                className="text-[0.8125rem] font-medium"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                Selecione um Workspace
              </p>
              <p
                className="text-[0.6875rem] mt-1 mb-2"
                style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
              >
                para ver projetos, reuniões e repos
              </p>
            </div>
          )}

          {/* Quadros Avulsos */}
          {quadrosAvulsos.length > 0 && (
            <div
              className={cn(
                "mt-auto flex flex-col pt-3",
                aberta ? "" : "items-center",
                "border-t"
              )}
              style={{ borderColor: "var(--tf-border)" }}
            >
              <SectionHeader aberta={aberta}>
                <Grid3X3 size={11} /> <span className="flex-1">Quadros soltos</span>
              </SectionHeader>
              {!aberta && (
                <div title="Quadros Avulsos" className="mb-2">
                  <Grid3X3 size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                </div>
              )}
              <div
                className={cn(
                  aberta ? "flex flex-col gap-0.5 px-2" : "flex flex-col items-center gap-1"
                )}
              >
                {quadrosAvulsos.map((q) => (
                  <QuadroLink key={q.id} quadro={q} aberta={aberta} pathname={pathname} />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
