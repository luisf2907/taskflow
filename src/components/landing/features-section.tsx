"use client";

import {
  Kanban,
  Target,
  GitBranch,
  FolderKanban,
  Activity,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Kanban,
    title: "Quadros Kanban",
    description:
      "Arraste e organize tarefas visualmente com colunas personalizáveis e drag-and-drop intuitivo.",
  },
  {
    icon: Target,
    title: "Sprints & Metas",
    description:
      "Planeje sprints, defina metas e acompanhe o progresso do seu time em tempo real.",
  },
  {
    icon: GitBranch,
    title: "Integração GitHub",
    description:
      "Vincule PRs, branches e commits diretamente às suas tarefas automaticamente.",
  },
  {
    icon: FolderKanban,
    title: "Workspaces",
    description:
      "Organize projetos por time ou cliente com workspaces independentes e flexíveis.",
  },
  {
    icon: Activity,
    title: "Dashboard em Tempo Real",
    description:
      "Métricas de produtividade, burndown charts e visão geral do andamento dos projetos.",
  },
  {
    icon: Moon,
    title: "Modo Escuro",
    description:
      "Interface confortável para longas sessões de trabalho, dia ou noite.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 md:py-28 px-6 md:px-12"
      style={{ backgroundColor: "var(--tf-bg)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center">
          <p
            className="text-[12px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--tf-accent)" }}
          >
            FUNCIONALIDADES
          </p>
          <h2
            className="text-[36px] font-black tracking-tight mt-3"
            style={{ color: "var(--tf-text)" }}
          >
            Tudo que seu time precisa
          </h2>
          <p
            className="text-[16px] max-w-2xl mx-auto mt-4"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Ferramentas pensadas para times de desenvolvimento que querem
            entregar com qualidade.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-[20px] p-7 transition-all duration-200 hover:-translate-y-[2px]"
                style={{
                  backgroundColor: "var(--tf-surface)",
                  border: "1px solid var(--tf-border-subtle)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--tf-border)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--tf-border-subtle)";
                }}
              >
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-5"
                  style={{ backgroundColor: "var(--tf-accent-light)" }}
                >
                  <Icon
                    size={22}
                    style={{ color: "var(--tf-accent-text)" }}
                  />
                </div>
                <h3
                  className="text-[17px] font-bold mb-2"
                  style={{ color: "var(--tf-text)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
