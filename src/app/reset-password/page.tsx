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

  // Detectar token de recovery no hash fragment ou esperar sessao existente
  useEffect(() => {
    async function init() {
      // Supabase client detecta automaticamente o hash fragment (#access_token=...&type=recovery)
      // e estabelece a sessao. Precisamos apenas esperar isso acontecer.
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setPronto(true);
        return;
      }

      // Escutar evento de auth state change (caso o token esteja no hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setPronto(true);
        }
      });

      // Timeout: se depois de 3s nao tiver sessao, mostrar erro
      const timeout = setTimeout(() => {
        setPronto(true); // Mostra o form de qualquer forma, vai dar erro ao salvar se nao tiver sessao
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
      setErro("As senhas nao coincidem.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.auth.updateUser({ password: senha });

    setSalvando(false);

    if (error) {
      setErro(error.message === "New password should be different from the old password."
        ? "A nova senha deve ser diferente da anterior."
        : "Erro ao atualizar senha. Tente novamente.");
      return;
    }

    setSucesso(true);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--tf-bg)" }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--tf-accent)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "var(--tf-accent-yellow)" }}
        />
      </div>

      <div
        className="relative w-full max-w-md rounded-[32px] px-8 py-10"
        style={{ background: "var(--tf-surface)", boxShadow: "var(--tf-shadow-lg)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center"
            style={{ background: "var(--tf-accent)" }}
          >
            <Kanban size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-[20px] font-black tracking-tight"
            style={{ color: "var(--tf-text)" }}
          >
            Taskflow
          </span>
        </div>

        {!pronto ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--tf-accent)" }} />
            <p className="text-[14px]" style={{ color: "var(--tf-text-secondary)" }}>
              Verificando link...
            </p>
          </div>
        ) : sucesso ? (
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--tf-success-bg)" }}
            >
              <Check size={32} style={{ color: "var(--tf-success)" }} strokeWidth={3} />
            </div>
            <h1
              className="text-[20px] font-black tracking-tight mb-2"
              style={{ color: "var(--tf-text)" }}
            >
              Senha atualizada!
            </h1>
            <p
              className="text-[14px] mb-6"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Sua senha foi alterada com sucesso.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-[14px] text-[14px] font-bold text-white no-underline transition-all hover:-translate-y-0.5"
              style={{ background: "var(--tf-accent)" }}
            >
              Ir para o Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--tf-accent-light)" }}
              >
                <Lock size={22} style={{ color: "var(--tf-accent)" }} />
              </div>
              <h1
                className="text-[20px] font-black tracking-tight mb-1"
                style={{ color: "var(--tf-text)" }}
              >
                Nova senha
              </h1>
              <p
                className="text-[13px]"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                Digite sua nova senha abaixo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="text-[12px] font-bold mb-1.5 block"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="w-full px-4 py-3 pr-10 rounded-[14px] text-[14px] outline-none transition-all"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      border: "2px solid transparent",
                      color: "var(--tf-text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="text-[12px] font-bold mb-1.5 block"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Confirmar senha
                </label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-4 py-3 rounded-[14px] text-[14px] outline-none transition-all"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "2px solid transparent",
                    color: "var(--tf-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              {erro && (
                <div
                  className="text-[13px] px-4 py-3 rounded-[14px]"
                  style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={salvando || !senha || !confirmar}
                className="w-full py-3.5 rounded-[14px] text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ background: "var(--tf-accent)" }}
              >
                {salvando ? "Salvando..." : "Atualizar senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
