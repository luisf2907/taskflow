"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuadros } from "@/hooks/use-quadros";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Check,
  Github,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { user, perfil, temGithub, logout, carregando } = useAuth();
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const [conectandoGithub, setConectandoGithub] = useState(false);

  // Theme
  const [tema, setTema] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTema(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTema(t: "light" | "dark") {
    setTema(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function conectarGithub() {
    setConectandoGithub(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        scopes: "repo",
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      },
    });
    if (error) {
      toast.error(error.message);
      setConectandoGithub(false);
    }
  }

  if (carregando) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--tf-bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ background: "var(--tf-bg)" }}>
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header />

        <main
          className="flex-1 overflow-y-auto rounded-[32px] mb-4 no-scrollbar"
          style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
        >
          <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
            {/* Page title */}
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
                Configurações
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                Gerencie seu perfil, conexões e preferências.
              </p>
            </div>

            {/* ── Profile ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <User size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Perfil
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex items-center gap-5">
                  {perfil?.avatar_url ? (
                    <img
                      src={perfil.avatar_url}
                      alt=""
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}
                    >
                      {(perfil?.nome ?? "?")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold truncate" style={{ color: "var(--tf-text)" }}>
                      {perfil?.nome ?? "Sem nome"}
                    </p>
                    <p className="text-[13px] truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                      {user?.email}
                    </p>
                    {perfil?.github_username && (
                      <p className="text-[13px] mt-0.5 font-medium" style={{ color: "var(--tf-text-secondary)" }}>
                        @{perfil.github_username}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── GitHub ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Github size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  GitHub
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                {temGithub ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "var(--tf-success-bg)" }}
                    >
                      <Check size={16} style={{ color: "var(--tf-success)" }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                        Conta conectada
                      </p>
                      {perfil?.github_username && (
                        <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                          @{perfil.github_username}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
                      Conecte sua conta GitHub para criar PRs, navegar repositórios e fazer merge diretamente pelo Taskflow.
                    </p>
                    <button
                      onClick={conectarGithub}
                      disabled={conectandoGithub}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                      style={{ background: "var(--tf-text)" }}
                    >
                      {conectandoGithub ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Github size={14} />
                      )}
                      Conectar GitHub
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ── Aparência ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Aparência
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex gap-3">
                  {([
                    { id: "light" as const, label: "Claro", icon: Sun },
                    { id: "dark" as const, label: "Escuro", icon: Moon },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => toggleTema(id)}
                      className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150"
                      style={{
                        background: tema === id ? "var(--tf-surface)" : "transparent",
                        color: tema === id ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                        border: tema === id ? "1px solid var(--tf-border)" : "1px solid transparent",
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Segurança ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Segurança
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                      Sair da conta
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                      Encerrar sessão neste dispositivo.
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[12px] font-semibold transition-all duration-150 hover:opacity-80"
                    style={{ color: "var(--tf-danger)", background: "var(--tf-danger-bg)" }}
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              </div>
            </section>

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </main>
      </div>
    </div>
  );
}
