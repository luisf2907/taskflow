"use client";

import { useWorkspaces } from "@/hooks/use-workspaces";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface WorkspaceSwitcherProps {
  aberta: boolean;
  onNovoWorkspace?: () => void;
}

// Quadradinho colorido com a inicial do workspace (estilo Linear).
function WorkspaceInitial({
  workspace,
  size = 24,
}: {
  workspace: { nome: string; cor: string } | null;
  size?: number;
}) {
  const initial = workspace ? workspace.nome.trim().slice(0, 1).toUpperCase() : "?";
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: workspace ? workspace.cor : "var(--tf-bg-secondary)",
        color: workspace ? "#FFFFFF" : "var(--tf-text-tertiary)",
        border: workspace ? "none" : "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        fontSize: size <= 18 ? "0.625rem" : "0.6875rem",
        letterSpacing: "0.02em",
        fontWeight: 600,
      }}
    >
      {initial}
    </div>
  );
}

export function WorkspaceSwitcher({ aberta, onNovoWorkspace }: WorkspaceSwitcherProps) {
  const { workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();
  const router = useRouter();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const trigger = (
    <div
      className={cn(
        "flex items-center gap-2 cursor-pointer transition-colors sidebar-item",
        "hover:bg-[var(--tf-surface-hover)]",
        aberta
          ? "justify-between px-2 py-1.5 rounded-[var(--tf-radius-sm)]"
          : "justify-center w-8 h-8 mx-auto rounded-[var(--tf-radius-sm)]"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <WorkspaceInitial workspace={activeWorkspace ?? null} size={24} />
        {aberta && (
          <div className="flex flex-col truncate sidebar-fade" style={{ opacity: 1 }}>
            <span
              className="text-[0.8125rem] font-medium truncate leading-tight"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
            >
              {activeWorkspace ? activeWorkspace.nome : "Selecione Workspace"}
            </span>
            <span
              className="text-[0.625rem] truncate leading-tight mt-0.5"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
              }}
            >
              {workspaces.length} {workspaces.length === 1 ? "WORKSPACE" : "WORKSPACES"}
            </span>
          </div>
        )}
      </div>
      {aberta && (
        <ChevronsUpDown
          size={12}
          style={{ color: "var(--tf-text-tertiary)" }}
          className="shrink-0"
          strokeWidth={1.75}
        />
      )}
    </div>
  );

  // Dropdown SEMPRE abre pra direita da sidebar (left-full ml-2), independente
  // de estar expandida ou colapsada. Isso evita qualquer clipping do container
  // da sidebar e fica visualmente elegante (Linear-style).
  return (
    <div
      className={aberta ? "px-2" : "w-full"}
      title={!aberta ? activeWorkspace?.nome || "Workspace" : undefined}
    >
      <Dropdown
        trigger={trigger}
        className={cn(
          // Expandida: largura cabe exatamente no container px-2 da sidebar
          // (232px aside - 2*8 padding = 216px), evitando qualquer overflow.
          // Colapsada: abre pro lado direito fora da sidebar.
          aberta
            ? "!w-[216px] !min-w-0"
            : "!w-[240px] !right-auto !left-full !ml-2"
        )}
      >
        <div
          className="label-mono px-3 py-2"
          style={{
            color: "var(--tf-text-tertiary)",
            borderBottom: "1px solid var(--tf-border)",
          }}
        >
          Workspaces
        </div>

        <div className="max-h-[320px] overflow-y-auto py-1" style={{ scrollbarWidth: "thin" }}>
          {workspaces.length === 0 ? (
            <div
              className="px-3 py-6 text-center text-[0.75rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              Nenhum workspace ainda
            </div>
          ) : (
            workspaces.map((ws, i) => {
              const ativo = ws.id === activeWorkspaceId;
              return (
                <DropdownItem
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    router.push(`/workspace/${ws.id}`);
                  }}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                    <WorkspaceInitial workspace={ws} size={18} />
                    <span
                      className="truncate"
                      style={{
                        color: ativo ? "var(--tf-accent-text)" : "var(--tf-text)",
                        fontWeight: ativo ? 500 : 400,
                      }}
                    >
                      {ws.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ativo && (
                      <Check
                        size={12}
                        strokeWidth={2.25}
                        style={{ color: "var(--tf-accent)" }}
                      />
                    )}
                    {i < 9 && (
                      <kbd
                        className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 text-[0.625rem]"
                        style={{
                          color: "var(--tf-text-tertiary)",
                          background: "var(--tf-bg-secondary)",
                          border: "1px solid var(--tf-border)",
                          borderRadius: "var(--tf-radius-xs)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        {i + 1}
                      </kbd>
                    )}
                  </div>
                </DropdownItem>
              );
            })
          )}
        </div>

        <div
          className="border-t pt-1"
          style={{ borderColor: "var(--tf-border)" }}
        >
          <DropdownItem onClick={onNovoWorkspace}>
            <Plus size={13} strokeWidth={2} style={{ color: "var(--tf-accent)" }} />
            <span style={{ color: "var(--tf-text)" }}>Criar Workspace</span>
          </DropdownItem>
        </div>
      </Dropdown>
    </div>
  );
}
