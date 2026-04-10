"use client";

import { useWorkspaces } from "@/hooks/use-workspaces";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Check, ChevronsUpDown, Folder, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface WorkspaceSwitcherProps {
  aberta: boolean;
  onNovoWorkspace?: () => void;
}

export function WorkspaceSwitcher({ aberta, onNovoWorkspace }: WorkspaceSwitcherProps) {
  const { workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();
  const router = useRouter();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const trigger = (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-2 py-1.5 rounded-[12px] cursor-pointer hover:bg-[var(--tf-surface-hover)] transition-colors sidebar-item",
        !aberta && "justify-center p-2 mb-4"
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div
          className={cn(
            "flex items-center justify-center shrink-0 rounded-[8px]",
            aberta ? "w-6 h-6" : "w-8 h-8"
          )}
          style={{ background: activeWorkspace ? activeWorkspace.cor : "var(--tf-border)" }}
        >
          {activeWorkspace ? (
            <Folder size={aberta ? 12 : 16} className="text-white" strokeWidth={aberta ? 2.5 : 2} />
          ) : (
            <span className="text-[10px] font-bold text-white uppercase">W</span>
          )}
        </div>
        {aberta && (
          <div className="flex flex-col truncate sidebar-fade" style={{ opacity: 1 }}>
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--tf-text)" }}>
              {activeWorkspace ? activeWorkspace.nome : "Selecione um Workspace"}
            </span>
            <span className="text-[11px] truncate" style={{ color: "var(--tf-text-tertiary)" }}>
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
      {aberta && <ChevronsUpDown size={14} style={{ color: "var(--tf-text-tertiary)" }} className="shrink-0" />}
    </div>
  );

  return (
    <div className="px-3" title={!aberta ? (activeWorkspace?.nome || "Workspace") : undefined}>
      <Dropdown trigger={trigger} className={cn("w-[240px]", !aberta && "left-full ml-2")}>
        <div className="px-2 py-1.5 mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--tf-text-tertiary)" }}>
          Workspaces
        </div>
        {workspaces.map((ws) => (
          <DropdownItem
            key={ws.id}
            onClick={() => {
              setActiveWorkspaceId(ws.id);
              router.push(`/workspace/${ws.id}`);
            }}
            className="justify-between"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className="w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0"
                style={{ background: ws.cor }}
              >
                <Folder size={10} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="truncate">{ws.nome}</span>
            </div>
            {ws.id === activeWorkspaceId && <Check size={14} style={{ color: "var(--tf-text-secondary)" }} />}
          </DropdownItem>
        ))}

        <div className="h-[1px] my-1.5 mx-2" style={{ background: "var(--tf-border)" }} />
        
        <DropdownItem onClick={onNovoWorkspace} className="gap-2.5">
          <div className="w-5 h-5 rounded-[6px] flex items-center justify-center border border-[var(--tf-border)] shrink-0 bg-[var(--tf-surface)] text-[var(--tf-text-secondary)]">
            <Plus size={12} strokeWidth={2.5} />
          </div>
          Criar Workspace
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
