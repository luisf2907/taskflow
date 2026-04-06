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
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Precos | Taskflow",
  description: "Taskflow e gratis durante o beta. Kanban, sprints, GitHub integration, Planning Poker e IA sem custo.",
};

const features = [
  { icon: Kanban, label: "Quadros Kanban ilimitados", desc: "Arrastar e soltar, colunas customizaveis" },
  { icon: Target, label: "Sprints com metas", desc: "Datas, progresso e velocity tracking" },
  { icon: GitBranch, label: "Integracao GitHub", desc: "Branches, PRs, webhooks, auto-status" },
  { icon: Dices, label: "Planning Poker", desc: "Estimativa em equipe, built-in" },
  { icon: Bot, label: "IA (Gemini)", desc: "Gerar e melhorar cards automaticamente" },
  { icon: Zap, label: "Automacoes", desc: "Triggers por evento, acoes automaticas" },
  { icon: BarChart3, label: "Dashboard e metricas", desc: "Burndown, velocity, atividades em tempo real" },
  { icon: Users, label: "Workspaces ilimitados", desc: "Organize equipes e projetos" },
  { icon: Moon, label: "Modo escuro", desc: "Tema claro e escuro" },
];

const comparativo = [
  {
    nome: "Taskflow",
    preco: "Gratis",
    destaque: true,
    planningPoker: true,
    mcp: true,
    github: true,
    ia: true,
    kanban: true,
    sprints: true,
  },
  { nome: "Linear", preco: "$8/user/mo", destaque: false, planningPoker: false, mcp: true, github: true, ia: true, kanban: true, sprints: true },
  { nome: "Plane", preco: "$5/user/mo", destaque: false, planningPoker: false, mcp: false, github: true, ia: true, kanban: true, sprints: true },
  { nome: "Shortcut", preco: "$8.50/user/mo", destaque: false, planningPoker: false, mcp: false, github: true, ia: true, kanban: true, sprints: true },
  { nome: "Jira", preco: "$9/user/mo", destaque: false, planningPoker: false, mcp: false, github: true, ia: false, kanban: true, sprints: true },
  { nome: "GitHub Projects", preco: "Gratis", destaque: false, planningPoker: false, mcp: false, github: true, ia: false, kanban: true, sprints: false },
];

const colunas = [
  { key: "kanban", label: "Kanban" },
  { key: "sprints", label: "Sprints" },
  { key: "github", label: "GitHub" },
  { key: "ia", label: "IA" },
  { key: "planningPoker", label: "Planning Poker" },
  { key: "mcp", label: "MCP (Claude)" },
] as const;

function CheckIcon() {
  return <Check size={16} style={{ color: "var(--tf-success)" }} strokeWidth={3} />;
}

function XIcon() {
  return <X size={16} style={{ color: "var(--tf-text-tertiary)", opacity: 0.4 }} />;
}

export default function PricingPage() {
  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold mb-6"
            style={{ background: "var(--tf-accent)", color: "#FFFFFF" }}
          >
            <Sparkles size={14} />
            Gratis durante o beta
          </div>

          <h1
            className="text-[32px] md:text-[48px] font-black tracking-tight leading-tight mb-4"
            style={{ color: "var(--tf-text)" }}
          >
            Tudo incluso.
            <br />
            <span style={{ color: "var(--tf-accent)" }}>Zero custo.</span>
          </h1>

          <p
            className="text-[16px] md:text-[18px] max-w-xl mx-auto"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Durante o beta, todas as funcionalidades do Taskflow sao gratuitas.
            Sem limites artificiais, sem cartao de credito.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 p-5 rounded-[16px] border"
              style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border-subtle)" }}
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: "var(--tf-accent-light)" }}
              >
                <f.icon size={20} style={{ color: "var(--tf-accent)" }} />
              </div>
              <div>
                <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>{f.label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparativo */}
        <div className="mb-20">
          <h2
            className="text-[24px] md:text-[32px] font-black tracking-tight text-center mb-3"
            style={{ color: "var(--tf-text)" }}
          >
            Como nos comparamos
          </h2>
          <p
            className="text-[14px] text-center mb-10"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Funcionalidades que voce pagaria em outros lugares, aqui sao gratis.
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 font-bold" style={{ color: "var(--tf-text)" }}>Ferramenta</th>
                  <th className="text-left px-4 py-3 font-bold" style={{ color: "var(--tf-text)" }}>Preco</th>
                  {colunas.map((c) => (
                    <th key={c.key} className="text-center px-3 py-3 font-bold" style={{ color: "var(--tf-text)" }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparativo.map((row) => (
                  <tr
                    key={row.nome}
                    className="border-t"
                    style={{
                      background: row.destaque ? "var(--tf-accent-light)" : "transparent",
                      borderColor: "var(--tf-border-subtle)",
                    }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: row.destaque ? "var(--tf-accent)" : "var(--tf-text)" }}>
                      {row.nome}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: row.destaque ? "var(--tf-accent)" : "var(--tf-text-secondary)" }}>
                      {row.preco}
                    </td>
                    {colunas.map((c) => (
                      <td key={c.key} className="text-center px-3 py-3">
                        {row[c.key] ? <CheckIcon /> : <XIcon />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {comparativo.map((row) => (
              <div
                key={row.nome}
                className="rounded-[16px] p-4 border"
                style={{
                  background: row.destaque ? "var(--tf-accent-light)" : "var(--tf-surface)",
                  borderColor: row.destaque ? "var(--tf-accent)" : "var(--tf-border-subtle)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-bold" style={{ color: row.destaque ? "var(--tf-accent)" : "var(--tf-text)" }}>
                    {row.nome}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: row.destaque ? "var(--tf-accent)" : "var(--tf-text-secondary)" }}>
                    {row.preco}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {colunas.map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
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
          className="rounded-[24px] p-8 md:p-12 text-center mb-16"
          style={{ background: "var(--tf-bg-secondary)" }}
        >
          <h3
            className="text-[20px] font-bold tracking-tight mb-2"
            style={{ color: "var(--tf-text)" }}
          >
            Planos pagos em breve
          </h3>
          <p
            className="text-[14px] max-w-lg mx-auto"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Estamos preparando planos com funcionalidades avancadas para times maiores.
            Quem entrar durante o beta tera beneficios exclusivos quando os planos
            forem lancados.
          </p>
        </div>

        {/* CTA */}
        <div
          className="rounded-[32px] p-10 md:p-16 text-center"
          style={{ background: "linear-gradient(135deg, var(--tf-accent), #00A89D)" }}
        >
          <h2 className="text-[24px] md:text-[32px] font-black tracking-tight text-white mb-3">
            Comece a usar agora
          </h2>
          <p className="text-[14px] text-white/80 max-w-md mx-auto mb-6">
            Crie sua conta em segundos. Sem cartao de credito, sem periodo de teste.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[20px] text-[15px] font-bold no-underline transition-all hover:-translate-y-0.5"
            style={{ background: "#FFFFFF", color: "var(--tf-accent)" }}
          >
            Comece Gratis <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
