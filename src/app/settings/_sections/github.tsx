"use client";

import { useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Github,
  Key,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Perfil } from "@/types";

interface GithubSectionProps {
  temGithub: boolean;
  perfil: Perfil | null;
  refresh: () => void;
  refreshGithub: () => void;
}

export function GithubSection({
  temGithub,
  perfil,
  refresh,
  refreshGithub,
}: GithubSectionProps) {
  const [conectandoGithub, setConectandoGithub] = useState(false);
  const [mostrarPat, setMostrarPat] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [patVisivel, setPatVisivel] = useState(false);
  const [salvandoPat, setSalvandoPat] = useState(false);
  const [removendoPat, setRemovendoPat] = useState(false);

  async function salvarPat() {
    if (!patInput.trim()) return;
    setSalvandoPat(true);
    try {
      const res = await fetch("/api/github-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: patInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar token");
        return;
      }
      toast.success(`Conectado como @${data.githubUser}`);
      if (data.warning) {
        toast.info(data.warning);
      }
      setPatInput("");
      setMostrarPat(false);
      refreshGithub();
      refresh();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSalvandoPat(false);
    }
  }

  async function removerToken() {
    setRemovendoPat(true);
    try {
      const res = await fetch("/api/github-token", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erro ao remover token");
        return;
      }
      toast.success("Token removido");
      refreshGithub();
      refresh();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setRemovendoPat(false);
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

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Github size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          GitHub
        </h2>
      </div>

      <div
        className="rounded-[var(--tf-radius-md)] p-6"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {temGithub ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--tf-success-bg)" }}
              >
                <Check size={16} style={{ color: "var(--tf-success)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--tf-text)" }}
                >
                  Conta conectada
                </p>
                {perfil?.github_username && (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    @{perfil.github_username}
                  </p>
                )}
              </div>
              <button
                onClick={removerToken}
                disabled={removendoPat}
                title="Desconectar GitHub"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tf-radius-xs)] text-[11px] font-semibold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
                style={{
                  color: "var(--tf-danger)",
                  background: "var(--tf-danger-bg)",
                }}
              >
                {removendoPat ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Conecte sua conta GitHub para criar PRs, navegar repositórios e
              fazer merge diretamente pelo Taskflow.
            </p>

            {/* OAuth button */}
            <button
              onClick={conectarGithub}
              disabled={conectandoGithub}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-[var(--tf-radius-md)] text-[13px] font-semibold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
              style={{
                background: "var(--tf-surface)",
                color: "var(--tf-text)",
                border: "1px solid var(--tf-border)",
              }}
            >
              {conectandoGithub ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Github size={14} />
              )}
              Conectar com GitHub
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-px"
                style={{ background: "var(--tf-border)" }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                ou
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "var(--tf-border)" }}
              />
            </div>

            {/* PAT toggle */}
            {!mostrarPat ? (
              <button
                onClick={() => setMostrarPat(true)}
                className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-[var(--tf-radius-md)] text-[13px] font-semibold transition-all duration-150 hover:opacity-80"
                style={{
                  color: "var(--tf-text-secondary)",
                  border: "1px dashed var(--tf-border)",
                }}
              >
                <Key size={14} />
                Usar Personal Access Token
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={patVisivel ? "text" : "password"}
                    value={patInput}
                    onChange={(e) => setPatInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    maxLength={200}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-4 py-2.5 pr-10 rounded-[var(--tf-radius-md)] text-[13px] font-mono outline-none transition-all"
                    style={{
                      background: "var(--tf-surface)",
                      color: "var(--tf-text)",
                      border: "1px solid var(--tf-border)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPatVisivel(!patVisivel)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {patVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Gere em{" "}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Taskflow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: "var(--tf-accent)" }}
                  >
                    GitHub Settings → Tokens
                  </a>{" "}
                  com permissão <strong>repo</strong>. Seu token é salvo de
                  forma segura e nunca exposto.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={salvarPat}
                    disabled={salvandoPat || !patInput.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--tf-radius-md)] text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    {salvandoPat ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Key size={14} />
                    )}
                    Conectar
                  </button>
                  <button
                    onClick={() => {
                      setMostrarPat(false);
                      setPatInput("");
                    }}
                    className="px-4 py-2.5 rounded-[var(--tf-radius-md)] text-[13px] font-semibold transition-all duration-150 hover:opacity-80"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      border: "1px solid var(--tf-border)",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
