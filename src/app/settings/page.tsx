"use client";

import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { Github, Loader2, LogOut, Shield, User } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user, perfil, temGithub, logout, carregando } = useAuth();
  const [conectandoGithub, setConectandoGithub] = useState(false);

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
      alert(error.message);
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
    <div className="h-full flex flex-col" style={{ background: "var(--tf-bg)" }}>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto space-y-6">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--tf-text)" }}
          >
            Configurações
          </h1>

          {/* Profile card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <User size={16} style={{ color: "var(--tf-accent)" }} />
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--tf-text)" }}
              >
                Perfil
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {perfil?.avatar_url ? (
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "var(--tf-accent-light)",
                    color: "var(--tf-accent)",
                  }}
                >
                  {(perfil?.nome ?? "?")[0].toUpperCase()}
                </div>
              )}

              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--tf-text)" }}
                >
                  {perfil?.nome ?? "Sem nome"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {user?.email}
                </p>
                {perfil?.github_username && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    @{perfil.github_username}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* GitHub connection */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Github size={16} style={{ color: "var(--tf-accent)" }} />
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--tf-text)" }}
              >
                GitHub
              </h2>
            </div>

            {temGithub ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--tf-success)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Conta GitHub conectada
                  {perfil?.github_username && (
                    <> &mdash; @{perfil.github_username}</>
                  )}
                </span>
              </div>
            ) : (
              <div>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Conecte sua conta GitHub para fazer merge/close de PRs
                  diretamente pelo Taskflow.
                </p>
                <button
                  onClick={conectarGithub}
                  disabled={conectandoGithub}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white transition-smooth"
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

          {/* Security */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield size={16} style={{ color: "var(--tf-accent)" }} />
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--tf-text)" }}
              >
                Segurança
              </h2>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-smooth"
              style={{
                color: "var(--tf-danger)",
                background: "var(--tf-danger-bg)",
              }}
            >
              <LogOut size={14} />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
