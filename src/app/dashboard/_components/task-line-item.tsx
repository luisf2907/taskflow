"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Target } from "lucide-react";
import type { RecentTask } from "@/hooks/use-dashboard-metrics";

interface TaskLineItemProps {
  task: RecentTask;
}

export function TaskLineItem({ task }: TaskLineItemProps) {
  const router = useRouter();
  const concluida =
    task.coluna_nome.toLowerCase().includes("conclu") ||
    task.coluna_nome.toLowerCase().includes("done");

  return (
    <button
      onClick={() => router.push(`/quadro/${task.quadro_id}`)}
      className="w-full flex items-center gap-3 p-3.5 rounded-[20px] transition-all hover:-translate-y-1 group text-left"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-colors"
        style={{
          background: concluida ? "var(--tf-accent-light)" : "var(--tf-bg)",
          color: concluida ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
        }}
      >
        {concluida ? (
          <CheckCircle2 size={18} strokeWidth={2.5} />
        ) : (
          <Target size={18} strokeWidth={2.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-bold truncate tracking-tight transition-colors group-hover:text-amber-500"
          style={{
            color: "var(--tf-text)",
            textDecoration: concluida ? "line-through" : "none",
            opacity: concluida ? 0.6 : 1,
          }}
        >
          {task.titulo}
        </p>
        <p
          className="text-[11px] font-medium truncate mt-0.5"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Ult. mov: {new Date(task.atualizado_em).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </button>
  );
}
