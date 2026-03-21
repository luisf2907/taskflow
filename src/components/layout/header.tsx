"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTema } from "@/hooks/use-tema";
import { Kanban, LogOut, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { tema, alternar } = useTema();
  const { user, perfil, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const avatar = perfil?.avatar_url;
  const nome = perfil?.nome ?? user?.email?.split("@")[0] ?? "";
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="h-12 flex items-center justify-between px-4 shrink-0 border-b"
      style={{
        background: "var(--tf-header)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 group">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--tf-accent)" }}
        >
          <Kanban size={15} className="text-white" />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "var(--tf-header-text)" }}
        >
          Taskflow
        </span>
      </Link>

      <div className="flex items-center gap-1.5">
        <button
          onClick={alternar}
          className="p-2 rounded-lg transition-smooth"
          style={{ color: "var(--tf-text-tertiary)" }}
          title={tema === "claro" ? "Modo escuro" : "Modo claro"}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {tema === "claro" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg transition-smooth"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={nome}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: "var(--tf-accent)",
                    color: "white",
                  }}
                >
                  {iniciais || <User size={12} />}
                </div>
              )}
            </button>

            {menuAberto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuAberto(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-xl p-1.5 z-50"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    boxShadow: "var(--tf-shadow-lg)",
                  }}
                >
                  <div
                    className="px-3 py-2 mb-1 rounded-lg"
                    style={{ background: "var(--tf-bg)" }}
                  >
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--tf-text)" }}
                    >
                      {nome}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      {user.email}
                    </p>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-smooth"
                    style={{ color: "var(--tf-text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--tf-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <User size={13} />
                    Configurações
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-smooth"
                    style={{ color: "var(--tf-danger)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--tf-danger-bg)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <LogOut size={13} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
