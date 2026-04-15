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
  num: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Kanban,
    num: "01",
    title: "Quadros kanban",
    description:
      "Arraste e organize tarefas visualmente com colunas personalizáveis e drag-and-drop intuitivo.",
  },
  {
    icon: Target,
    num: "02",
    title: "Sprints & metas",
    description:
      "Planeje sprints, defina metas e acompanhe o progresso do seu time em tempo real.",
  },
  {
    icon: GitBranch,
    num: "03",
    title: "Integração GitHub",
    description:
      "Vincule PRs, branches e commits diretamente às suas tarefas automaticamente.",
  },
  {
    icon: FolderKanban,
    num: "04",
    title: "Workspaces",
    description:
      "Organize projetos por time ou cliente com workspaces independentes e flexíveis.",
  },
  {
    icon: Activity,
    num: "05",
    title: "Dashboard em tempo real",
    description:
      "Métricas de produtividade, burndown charts e visão geral do andamento dos projetos.",
  },
  {
    icon: Moon,
    num: "06",
    title: "Modo escuro",
    description:
      "Interface confortável para longas sessões de trabalho, dia ou noite.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 md:py-24 px-6 md:px-12"
      style={{ backgroundColor: "var(--tf-bg)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col gap-3 mb-12">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5"
              style={{
                background: "var(--tf-accent)",
                borderRadius: "1px",
              }}
            />
            <p
              className="text-[0.6875rem] font-medium"
              style={{
                color: "var(--tf-accent)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Funcionalidades
            </p>
          </div>
          <h2
            className="text-[2rem] md:text-[2.5rem] font-semibold max-w-xl"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Tudo que seu time precisa pra{" "}
            <span style={{ color: "var(--tf-accent)" }}>entregar.</span>
          </h2>
          <p
            className="text-[0.9375rem] max-w-lg"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Ferramentas pensadas para times de desenvolvimento que querem
            entregar com qualidade.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-5 transition-colors"
                style={{
                  backgroundColor: "var(--tf-surface)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-md)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--tf-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--tf-border)";
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-9 h-9 flex items-center justify-center"
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid var(--tf-accent)",
                      color: "var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[0.6875rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {feature.num} /
                  </span>
                </div>
                <h3
                  className="text-[1.0625rem] font-semibold mb-2"
                  style={{
                    color: "var(--tf-text)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-[0.8125rem] leading-relaxed"
                  style={{
                    color: "var(--tf-text-secondary)",
                    letterSpacing: "-0.005em",
                  }}
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
