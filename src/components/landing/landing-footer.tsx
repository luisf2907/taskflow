"use client";

import Link from "next/link";
import { Kanban } from "lucide-react";

const linkColumns = [
  {
    heading: "Produto",
    links: [
      { label: "Funcionalidades", href: "#features" },
      { label: "Como Funciona", href: "#how-it-works" },
    ],
  },
  {
    heading: "Conta",
    links: [
      { label: "Login", href: "/login" },
      { label: "Cadastre-se", href: "/login" },
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
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
        {/* Top section */}
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Kanban size={24} style={{ color: "var(--tf-accent)" }} />
              <span
                className="text-[18px] font-black tracking-tight"
                style={{ color: "var(--tf-text)" }}
              >
                Taskflow
              </span>
            </div>
            <p
              className="text-[14px] mt-3"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Gestão de tarefas para times que entregam.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            {linkColumns.map((col) => (
              <div key={col.heading}>
                <h4
                  className="text-[13px] font-bold uppercase tracking-wide mb-3"
                  style={{ color: "var(--tf-text)" }}
                >
                  {col.heading}
                </h4>
                <ul className="list-none p-0 m-0 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="text-[14px] no-underline transition-colors"
                          style={{ color: "var(--tf-text-secondary)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--tf-text)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--tf-text-secondary)")
                          }
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[14px] no-underline transition-colors"
                          style={{ color: "var(--tf-text-secondary)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--tf-text)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--tf-text-secondary)")
                          }
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 pt-6"
          style={{ borderTop: "1px solid var(--tf-border)" }}
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            &copy; 2025 Taskflow. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
