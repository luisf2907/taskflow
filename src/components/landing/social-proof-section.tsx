"use client";

import { GitBranch, GitMerge, GitPullRequest } from "lucide-react";

const integrations = [
  {
    name: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    desc: "PRs, branches e commits",
    connected: true,
  },
  {
    name: "GitLab",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
      </svg>
    ),
    desc: "Merge requests e pipelines",
    connected: false,
  },
  {
    name: "Bitbucket",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
      </svg>
    ),
    desc: "Pull requests e repos",
    connected: false,
  },
];

export function SocialProofSection() {
  return (
    <section
      className="py-16 md:py-20"
      style={{ background: "var(--tf-surface)" }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Section header */}
        <div className="flex flex-col gap-3 mb-10">
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
              Integrações
            </p>
          </div>
          <h2
            className="text-[1.75rem] md:text-[2.25rem] font-semibold max-w-xl"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            Conecte com qualquer plataforma Git.
          </h2>
          <p
            className="text-[0.9375rem] max-w-lg"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Vincule repositórios, acompanhe PRs e branches direto nas suas
            tarefas. Sem trocar de aba.
          </p>
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex items-center gap-3 p-3.5 transition-colors"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-border)")
              }
            >
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{
                  background: "var(--tf-surface)",
                  color: int.connected ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
                  border: `1px solid ${int.connected ? "var(--tf-accent)" : "var(--tf-border)"}`,
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                {int.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[0.8125rem] font-medium"
                    style={{
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {int.name}
                  </span>
                  <span
                    className="inline-flex items-center h-[16px] px-1.5 text-[0.5625rem] font-medium"
                    style={{
                      background: int.connected ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
                      color: int.connected
                        ? "var(--tf-accent-text)"
                        : "var(--tf-text-tertiary)",
                      border: `1px solid ${int.connected ? "var(--tf-accent)" : "var(--tf-border)"}`,
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {int.connected ? "Disponível" : "Em breve"}
                  </span>
                </div>
                <p
                  className="text-[0.6875rem] mt-0.5"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {int.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Git features row */}
        <div
          className="flex flex-wrap justify-center gap-3 mt-10 pt-8"
          style={{ borderTop: "1px solid var(--tf-border)" }}
        >
          {[
            { icon: GitBranch, label: "Branch tracking" },
            { icon: GitPullRequest, label: "PR linking" },
            { icon: GitMerge, label: "Auto-merge status" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 h-8 px-3"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              <Icon
                size={12}
                strokeWidth={1.75}
                style={{ color: "var(--tf-accent)" }}
              />
              <span
                className="text-[0.75rem] font-medium"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.005em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
