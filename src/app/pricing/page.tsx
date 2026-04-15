import LandingHeader from "@/components/landing/landing-header";
import LandingFooter from "@/components/landing/landing-footer";
import Link from "next/link";
import {
  Kanban,
  Target,
  GitBranch,
  Dices,
  Bot,
  Zap,
  BarChart3,
  Users,
  Moon,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Preços | Taskflow",
  description:
    "Taskflow é grátis durante o beta. Kanban, sprints, GitHub integration, Planning Poker e IA sem custo.",
};

const features = [
  {
    icon: Kanban,
    label: "Quadros kanban ilimitados",
    desc: "Drag-and-drop, colunas customizáveis",
  },
  { icon: Target, label: "Sprints com metas", desc: "Datas, progresso e velocity" },
  {
    icon: GitBranch,
    label: "Integração GitHub",
    desc: "Branches, PRs, webhooks, auto-status",
  },
  { icon: Dices, label: "Planning Poker", desc: "Estimativa em equipe, built-in" },
  { icon: Bot, label: "IA (Gemini)", desc: "Gerar e melhorar cards" },
  { icon: Zap, label: "Automações", desc: "Triggers por evento, ações automáticas" },
  {
    icon: BarChart3,
    label: "Dashboard e métricas",
    desc: "Burndown, velocity, atividades em tempo real",
  },
  { icon: Users, label: "Workspaces ilimitados", desc: "Organize equipes e projetos" },
  { icon: Moon, label: "Modo escuro", desc: "Tema claro e escuro" },
];

const comparativo = [
  {
    nome: "Taskflow",
    preco: "Grátis",
    destaque: true,
    planningPoker: true,
    mcp: true,
    github: true,
    ia: true,
    kanban: true,
    sprints: true,
  },
  {
    nome: "Linear",
    preco: "$8/user/mo",
    destaque: false,
    planningPoker: false,
    mcp: true,
    github: true,
    ia: true,
    kanban: true,
    sprints: true,
  },
  {
    nome: "Plane",
    preco: "$5/user/mo",
    destaque: false,
    planningPoker: false,
    mcp: false,
    github: true,
    ia: true,
    kanban: true,
    sprints: true,
  },
  {
    nome: "Shortcut",
    preco: "$8.50/user/mo",
    destaque: false,
    planningPoker: false,
    mcp: false,
    github: true,
    ia: true,
    kanban: true,
    sprints: true,
  },
  {
    nome: "Jira",
    preco: "$9/user/mo",
    destaque: false,
    planningPoker: false,
    mcp: false,
    github: true,
    ia: false,
    kanban: true,
    sprints: true,
  },
  {
    nome: "GitHub Projects",
    preco: "Grátis",
    destaque: false,
    planningPoker: false,
    mcp: false,
    github: true,
    ia: false,
    kanban: true,
    sprints: false,
  },
];

const colunas = [
  { key: "kanban", label: "Kanban" },
  { key: "sprints", label: "Sprints" },
  { key: "github", label: "GitHub" },
  { key: "ia", label: "IA" },
  { key: "planningPoker", label: "Poker" },
  { key: "mcp", label: "MCP" },
] as const;

function CheckIcon() {
  return (
    <Check size={13} strokeWidth={2.25} style={{ color: "var(--tf-success)" }} />
  );
}

function XIcon() {
  return (
    <X
      size={13}
      strokeWidth={1.75}
      style={{ color: "var(--tf-border-strong)" }}
      aria-hidden="true"
    />
  );
}

export default function PricingPage() {
  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-20">
        {/* Hero */}
        <div className="flex flex-col gap-3 mb-12 max-w-2xl">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5"
              style={{ background: "var(--tf-accent)", borderRadius: "1px" }}
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
              Preços · Beta
            </p>
          </div>

          <h1
            className="text-[2.25rem] md:text-[3rem] font-semibold leading-[1.05]"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.03em",
            }}
          >
            Tudo incluso.{" "}
            <span style={{ color: "var(--tf-accent)" }}>Zero custo.</span>
          </h1>

          <p
            className="text-[0.9375rem] md:text-[1rem] max-w-lg"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Durante o beta, todas as funcionalidades do Taskflow são gratuitas.
            Sem limites artificiais, sem cartão de crédito.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-16">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 p-3.5 transition-colors"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div
                className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{
                  background: "transparent",
                  border: "1px solid var(--tf-accent)",
                  color: "var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                <f.icon size={14} strokeWidth={1.75} />
              </div>
              <div>
                <p
                  className="text-[0.8125rem] font-medium"
                  style={{
                    color: "var(--tf-text)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {f.label}
                </p>
                <p
                  className="text-[0.6875rem] mt-0.5"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparativo */}
        <div className="mb-16">
          <div className="flex flex-col gap-3 mb-8">
            <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
              Comparativo
            </p>
            <h2
              className="text-[1.75rem] md:text-[2rem] font-semibold"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
              }}
            >
              Como nos comparamos.
            </h2>
            <p
              className="text-[0.875rem]"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Funcionalidades que você pagaria em outros lugares, aqui são grátis.
            </p>
          </div>

          {/* Desktop table */}
          <div
            className="hidden md:block overflow-hidden"
            style={{
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
              background: "var(--tf-surface)",
            }}
          >
            <table
              className="text-[0.75rem] table-fixed w-full"
              style={{ borderCollapse: "separate", borderSpacing: 0 }}
            >
              <thead>
                <tr style={{ background: "var(--tf-bg-secondary)" }}>
                  <th
                    className="text-left px-3 h-9 font-medium text-[0.625rem] uppercase w-[140px]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.08em",
                      borderBottom: "1px solid var(--tf-border)",
                    }}
                  >
                    Ferramenta
                  </th>
                  <th
                    className="text-left px-3 h-9 font-medium text-[0.625rem] uppercase w-[110px]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.08em",
                      borderBottom: "1px solid var(--tf-border)",
                    }}
                  >
                    Preço
                  </th>
                  {colunas.map((c) => (
                    <th
                      key={c.key}
                      className="text-center px-3 h-9 font-medium text-[0.625rem] uppercase"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid var(--tf-border)",
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparativo.map((row, i) => (
                  <tr
                    key={row.nome}
                    style={{
                      background: row.destaque
                        ? "var(--tf-accent-light)"
                        : "transparent",
                      borderTop:
                        i > 0 ? "1px solid var(--tf-border-subtle)" : "none",
                    }}
                  >
                    <td
                      className="px-3 h-10 font-medium text-[0.8125rem]"
                      style={{
                        color: row.destaque
                          ? "var(--tf-accent-text)"
                          : "var(--tf-text)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {row.nome}
                    </td>
                    <td
                      className="px-3 h-10 text-[0.75rem]"
                      style={{
                        color: row.destaque
                          ? "var(--tf-accent)"
                          : "var(--tf-text-secondary)",
                        fontFamily: "var(--tf-font-mono)",
                        fontWeight: row.destaque ? 500 : 400,
                      }}
                    >
                      {row.preco}
                    </td>
                    {colunas.map((c) => (
                      <td key={c.key} className="px-3 h-10">
                        <div className="flex items-center justify-center">
                          {row[c.key] ? <CheckIcon /> : <XIcon />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {comparativo.map((row) => (
              <div
                key={row.nome}
                className="p-3.5"
                style={{
                  background: row.destaque
                    ? "var(--tf-accent-light)"
                    : "var(--tf-surface)",
                  border: `1px solid ${row.destaque ? "var(--tf-accent)" : "var(--tf-border)"}`,
                  borderRadius: "var(--tf-radius-md)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[0.875rem] font-semibold"
                    style={{
                      color: row.destaque
                        ? "var(--tf-accent-text)"
                        : "var(--tf-text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {row.nome}
                  </span>
                  <span
                    className="text-[0.75rem]"
                    style={{
                      color: row.destaque
                        ? "var(--tf-accent)"
                        : "var(--tf-text-secondary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {row.preco}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {colunas.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center gap-1.5 text-[0.75rem]"
                      style={{
                        color: "var(--tf-text-secondary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {row[c.key] ? <CheckIcon /> : <XIcon />}
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Future plans teaser */}
        <div
          className="p-6 md:p-8 mb-12 flex items-start gap-4"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "1px dashed var(--tf-border-strong)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              color: "var(--tf-accent)",
            }}
          >
            <Zap size={15} strokeWidth={1.75} />
          </div>
          <div>
            <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
              Em breve
            </p>
            <h3
              className="text-[1rem] font-semibold mb-1.5"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.01em",
              }}
            >
              Planos pagos em desenvolvimento
            </h3>
            <p
              className="text-[0.8125rem]"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Estamos preparando planos com funcionalidades avançadas para times
              maiores. Quem entrar durante o beta terá benefícios exclusivos
              quando os planos forem lançados.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="relative overflow-hidden p-10 md:p-12 text-center"
          style={{
            background: "var(--tf-accent)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          {/* Grid overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage:
                "radial-gradient(ellipse at center, black 50%, transparent 95%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 50%, transparent 95%)",
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-3">
            <p
              className="text-[0.6875rem] font-medium"
              style={{
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Comece agora
            </p>
            <h2
              className="text-[1.75rem] md:text-[2.25rem] font-semibold text-white max-w-xl"
              style={{
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              Crie sua conta em segundos.
            </h2>
            <p
              className="text-[0.875rem] max-w-md"
              style={{
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "-0.005em",
              }}
            >
              Sem cartão de crédito, sem período de teste.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 h-11 px-5 text-[0.875rem] font-medium no-underline mt-2 transition-colors hover:opacity-95"
              style={{
                background: "#FFFFFF",
                color: "var(--tf-accent)",
                border: "1px solid #FFFFFF",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
            >
              Começar grátis
              <ArrowRight size={14} strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
