"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Github, Kanban, Loader2, Mail, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Mapear erros do Supabase para mensagens amigáveis
function humanizarErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (m.includes("user already registered")) return "Esse email já está cadastrado. Tente fazer login.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de fazer login.";
  if (m.includes("password") && m.includes("at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um momento.";
  if (m.includes("email rate limit")) return "Muitos emails enviados. Aguarde antes de tentar novamente.";
  return "Algo deu errado. Tente novamente.";
}

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

  const [modo, setModo] = useState<"login" | "cadastro" | "recuperar" | "email-enviado">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(errorParam ? "Falha na autenticação. Tente novamente." : "");
  const [carregando, setCarregando] = useState(false);
  const [emailConfirmacao, setEmailConfirmacao] = useState(""); // email para mostrar no card

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      if (modo === "cadastro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { full_name: nome },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // Se identities está vazio, o email já existe (Supabase retorna sucesso mas sem identity)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setErro("Esse email já está cadastrado. Tente fazer login.");
          setCarregando(false);
          return;
        }

        // Mostrar tela de confirmação de email
        setEmailConfirmacao(email);
        setModo("email-enviado");
        setCarregando(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(humanizarErro(msg));
    } finally {
      setCarregando(false);
    }
  }

  async function handleRecuperarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      if (error) throw error;

      setEmailConfirmacao(email);
      setModo("email-enviado");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(humanizarErro(msg));
    } finally {
      setCarregando(false);
    }
  }

  async function handleReenviarEmail() {
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailConfirmacao,
      });
      if (error) throw error;
      toast.success("Email reenviado! Verifique sua caixa de entrada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(humanizarErro(msg));
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
      setErro(humanizarErro(error.message));
      setCarregando(false);
    }
  }

  function voltarParaLogin() {
    setModo("login");
    setErro("");
    setEmailConfirmacao("");
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
          {/* ═══ TELA: EMAIL ENVIADO ═══ */}
          {modo === "email-enviado" ? (
            <div className="px-8 py-10 text-center space-y-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "var(--tf-accent-light)" }}
              >
                <Mail size={28} style={{ color: "var(--tf-accent)" }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
                  Verifique seu email
                </h2>
                <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
                  Enviamos um link de confirmação para{" "}
                  <strong style={{ color: "var(--tf-text)" }}>{emailConfirmacao}</strong>
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleReenviarEmail}
                  disabled={carregando}
                  className="w-full px-4 py-3 rounded-[14px] text-[13px] font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}
                >
                  {carregando ? (
                    <Loader2 size={14} className="animate-spin mx-auto" />
                  ) : (
                    "Reenviar email"
                  )}
                </button>
                <button
                  onClick={voltarParaLogin}
                  className="w-full px-4 py-2.5 text-[13px] font-medium transition-all duration-150"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  ← Usar outro email
                </button>
              </div>
            </div>
          ) : modo === "recuperar" ? (
            /* ═══ TELA: RECUPERAR SENHA ═══ */
            <>
              <div className="px-8 pt-8 pb-2">
                <button
                  onClick={voltarParaLogin}
                  className="flex items-center gap-1.5 text-[12px] font-medium mb-4 transition-all duration-150 hover:opacity-70"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <ArrowLeft size={13} />
                  Voltar ao login
                </button>
                <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
                  Recuperar senha
                </h1>
                <p className="text-[13px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                  Enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <div className="px-8 pb-8 pt-4 space-y-4">
                <form onSubmit={handleRecuperarSenha} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
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
                    ) : (
                      <>
                        <KeyRound size={16} />
                        Enviar link de recuperação
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* ═══ TELA: LOGIN / CADASTRO ═══ */
            <>
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
                  <div>
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
                    {modo === "login" && (
                      <div className="flex justify-end mt-1.5">
                        <button
                          type="button"
                          onClick={() => { setModo("recuperar"); setErro(""); }}
                          className="text-[12px] font-medium transition-all duration-150 hover:underline underline-offset-2"
                          style={{ color: "var(--tf-accent)" }}
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}
                  </div>

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
            </>
          )}
        </div>

        {/* Toggle mode */}
        {modo !== "email-enviado" && modo !== "recuperar" && (
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
        )}
      </div>
    </div>
  );
}
