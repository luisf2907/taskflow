"use client";

import { supabase } from "@/lib/supabase/client";
import { Github, Kanban, Loader2, Mail, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(errorParam ? "Falha na autenticação. Tente novamente." : "");
  const [carregando, setCarregando] = useState(false);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      if (modo === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { full_name: nome } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  }

  async function handleGithubLogin() {
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErro(error.message);
      setCarregando(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-[14px] text-[14px] outline-none transition-all duration-150";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--tf-bg)" }}
    >
      {/* Background decoration */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "var(--tf-accent)" }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl pointer-events-none"
        style={{ background: "var(--tf-accent-yellow)" }}
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="w-11 h-11 rounded-[14px] flex items-center justify-center"
            style={{ background: "var(--tf-accent)" }}
          >
            <Kanban size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--tf-text)" }}
          >
            Taskflow
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-[32px] overflow-hidden"
          style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
              {modo === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
              {modo === "login"
                ? "Entre para continuar de onde parou."
                : "Comece a organizar seus projetos."}
            </p>
          </div>

          <div className="px-8 pb-8 pt-4 space-y-5">
            {/* GitHub OAuth */}
            <button
              onClick={handleGithubLogin}
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-[14px] text-[14px] font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--tf-text)", color: "var(--tf-surface)" }}
            >
              <Github size={18} />
              Continuar com GitHub
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: "var(--tf-border)" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                ou
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--tf-border)" }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {modo === "cadastro" && (
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className={inputClass}
                  style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />

              {erro && (
                <div
                  className="text-[12px] px-4 py-2.5 rounded-[8px] font-medium"
                  style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[14px] text-[14px] font-semibold text-white transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: "var(--tf-accent)" }}
              >
                {carregando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : modo === "login" ? (
                  <>
                    Entrar
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    Criar conta
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Toggle mode */}
        <p className="text-[13px] text-center mt-6" style={{ color: "var(--tf-text-secondary)" }}>
          {modo === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setErro(""); }}
            className="font-semibold transition-all duration-150 hover:underline underline-offset-2"
            style={{ color: "var(--tf-accent)" }}
          >
            {modo === "login" ? "Cadastre-se" : "Fazer login"}
          </button>
        </p>
      </div>
    </div>
  );
}
