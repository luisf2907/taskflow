"use client";

import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Kanban, Lock, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setPronto(true);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setPronto(true);
        }
      });

      const timeout = setTimeout(() => {
        setPronto(true);
      }, 3000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.auth.updateUser({ password: senha });

    setSalvando(false);

    if (error) {
      setErro(
        error.message === "New password should be different from the old password."
          ? "A nova senha deve ser diferente da anterior."
          : "Erro ao atualizar senha. Tente novamente."
      );
      return;
    }

    setSucesso(true);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 hero-grid"
      style={{ background: "var(--tf-bg)" }}
    >
      <div
        className="relative w-full max-w-[400px] px-7 py-8"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-lg)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div
            className="w-9 h-9 flex items-center justify-center"
            style={{
              background: "var(--tf-accent)",
              borderRadius: "var(--tf-radius-sm)",
            }}
          >
            <Kanban size={17} className="text-white" strokeWidth={1.75} />
          </div>
          <span
            className="text-[1.375rem] font-semibold"
            style={{ color: "var(--tf-text)", letterSpacing: "-0.02em" }}
          >
            Taskflow
          </span>
        </div>

        {!pronto ? (
          <div className="text-center py-8">
            <Loader2
              size={20}
              className="animate-spin mx-auto mb-3"
              style={{ color: "var(--tf-accent)" }}
            />
            <p
              className="text-[0.75rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              Verificando link…
            </p>
          </div>
        ) : sucesso ? (
          <div className="text-center py-2">
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
              style={{
                background: "var(--tf-success-bg)",
                border: "1px solid var(--tf-success)",
                borderRadius: "var(--tf-radius-sm)",
                color: "var(--tf-success)",
              }}
            >
              <Check size={22} strokeWidth={2.25} />
            </div>
            <p
              className="label-mono mb-1"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Tudo certo
            </p>
            <h1
              className="text-[1.125rem] font-semibold mb-2"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.015em" }}
            >
              Senha atualizada
            </h1>
            <p
              className="text-[0.8125rem] mb-5"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Sua senha foi alterada com sucesso.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-5 text-[0.8125rem] font-medium text-white no-underline transition-colors hover:brightness-110"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
            >
              Ir para o dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div
                className="w-10 h-10 flex items-center justify-center mx-auto mb-3"
                style={{
                  background: "var(--tf-accent-light)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-sm)",
                  color: "var(--tf-accent)",
                }}
              >
                <Lock size={18} strokeWidth={1.75} />
              </div>
              <p
                className="label-mono mb-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Redefinir senha
              </p>
              <h1
                className="text-[1.125rem] font-semibold mb-1"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.015em",
                }}
              >
                Nova senha
              </h1>
              <p
                className="text-[0.8125rem]"
                style={{
                  color: "var(--tf-text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                Digite sua nova senha abaixo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  className="label-mono mb-1.5 block"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="auth-input w-full h-10 px-3 pr-10 text-[0.8125rem] outline-none"
                    style={{
                      color: "var(--tf-text)",
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "-0.005em",
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors hover:text-[var(--tf-text)]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                    aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? (
                      <EyeOff size={14} strokeWidth={1.75} />
                    ) : (
                      <Eye size={14} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="label-mono mb-1.5 block"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Confirmar senha
                </label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  className="auth-input w-full h-10 px-3 text-[0.8125rem] outline-none"
                  style={{
                    color: "var(--tf-text)",
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "-0.005em",
                  }}
                />
              </div>

              {erro && (
                <div
                  className="text-[0.75rem] px-3 py-2 font-medium"
                  style={{
                    background: "var(--tf-danger-bg)",
                    color: "var(--tf-danger)",
                    border: "1px solid var(--tf-danger)",
                    borderLeft: "3px solid var(--tf-danger)",
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={salvando || !senha || !confirmar}
                className="w-full h-10 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40"
                style={{
                  background: "var(--tf-accent)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "-0.005em",
                }}
              >
                {salvando ? "Salvando…" : "Atualizar senha"}
              </button>
            </form>

            <style jsx>{`
              .auth-input {
                background: var(--tf-bg-secondary);
                border: 1px solid var(--tf-border);
                transition: border-color 0.15s ease, background 0.15s ease;
              }
              .auth-input:focus {
                border-color: var(--tf-accent);
                background: var(--tf-surface);
              }
              .auth-input::placeholder {
                color: var(--tf-text-tertiary);
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
