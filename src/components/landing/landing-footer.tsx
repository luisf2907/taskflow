"use client";

import Link from "next/link";
import { Kanban } from "lucide-react";

const linkColumns = [
  {
    heading: "Produto",
    links: [
      { label: "Funcionalidades", href: "/#features" },
      { label: "Como funciona", href: "/#how-it-works" },
      { label: "Preços", href: "/pricing" },
      { label: "Central de ajuda", href: "/help" },
    ],
  },
  {
    heading: "Conta",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Cadastre-se", href: "/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Termos de uso", href: "/termos" },
      { label: "Privacidade", href: "/privacidade" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "var(--tf-bg-secondary)",
        borderTop: "1px solid var(--tf-border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        {/* Top section */}
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 flex items-center justify-center"
                style={{
                  background: "var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                <Kanban size={14} className="text-white" strokeWidth={1.75} />
              </div>
              <span
                className="text-[0.9375rem] font-semibold"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.015em",
                }}
              >
                Taskflow
              </span>
            </div>
            <p
              className="text-[0.8125rem] mt-3"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Gestão de tarefas para times que entregam.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-10 md:gap-14">
            {linkColumns.map((col) => (
              <div key={col.heading}>
                <h4
                  className="label-mono mb-3"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {col.heading}
                </h4>
                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                  {col.links.map((link) => {
                    const linkClass =
                      "text-[0.8125rem] no-underline transition-colors";
                    const linkStyle = {
                      color: "var(--tf-text-secondary)",
                      letterSpacing: "-0.005em",
                    };
                    const onEnter = (
                      e: React.MouseEvent<HTMLAnchorElement>
                    ) => (e.currentTarget.style.color = "var(--tf-accent)");
                    const onLeave = (
                      e: React.MouseEvent<HTMLAnchorElement>
                    ) =>
                      (e.currentTarget.style.color =
                        "var(--tf-text-secondary)");
                    return (
                      <li key={link.label}>
                        {link.href.startsWith("#") ? (
                          <a
                            href={link.href}
                            className={linkClass}
                            style={linkStyle}
                            onMouseEnter={onEnter}
                            onMouseLeave={onLeave}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className={linkClass}
                            style={linkStyle}
                            onMouseEnter={onEnter}
                            onMouseLeave={onLeave}
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-5 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--tf-border)" }}
        >
          <p
            className="text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            © 2025 Taskflow · Todos os direitos reservados
          </p>
          <span
            className="text-[0.625rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            v1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
