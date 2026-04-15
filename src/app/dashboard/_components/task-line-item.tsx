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
      className="w-full flex items-center gap-2.5 p-2.5 transition-colors group text-left"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border)")
      }
    >
      <div
        className="w-8 h-8 flex items-center justify-center shrink-0"
        style={{
          background: concluida ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
          color: concluida ? "var(--tf-success)" : "var(--tf-text-tertiary)",
          border: `1px solid ${concluida ? "var(--tf-success)" : "var(--tf-border)"}`,
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        {concluida ? (
          <CheckCircle2 size={14} strokeWidth={1.75} />
        ) : (
          <Target size={14} strokeWidth={1.75} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[0.8125rem] font-medium truncate transition-colors group-hover:text-[var(--tf-accent)]"
          style={{
            color: concluida ? "var(--tf-text-tertiary)" : "var(--tf-text)",
            textDecoration: concluida ? "line-through" : "none",
            letterSpacing: "-0.005em",
          }}
        >
          {task.titulo}
        </p>
        <p
          className="text-[0.625rem] truncate mt-0.5"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          {new Date(task.atualizado_em).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </button>
  );
}
