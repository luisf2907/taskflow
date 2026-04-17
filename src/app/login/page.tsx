"use client";

import { supabase } from "@/lib/supabase/client";
import {
  Github,
  Kanban,
  Loader2,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { features } from "@/lib/features";

function humanizarErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (m.includes("user already registered"))
    return "Esse email já está cadastrado. Tente fazer login.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de fazer login.";
  if (m.includes("password") && m.includes("at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde um momento.";
  if (m.includes("email rate limit"))
    return "Muitos emails enviados. Aguarde antes de tentar novamente.";
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
  const successParam = searchParams.get("success");

  const [modo, setModo] = useState<
    "login" | "cadastro" | "recuperar" | "email-enviado"
  >("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(errorParam || "");
  const [sucesso, setSucesso] = useState(successParam || "");
  const [carregando, setCarregando] = useState(false);
  const [emailConfirmacao, setEmailConfirmacao] = useState("");

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

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setErro("Esse email já está cadastrado. Tente fazer login.");
          setCarregando(false);
          return;
        }

        setEmailConfirmacao(email);
        setModo("email-enviado");
        setCarregando(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
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
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
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
    setErro("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailConfirmacao,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(humanizarErro(msg));
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
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden hero-grid"
      style={{ background: "var(--tf-bg)" }}
    >
      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
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
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Taskflow
          </span>
        </div>

        {/* Card */}
        <div
          className="overflow-hidden"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-lg)",
          }}
        >
          {modo === "email-enviado" ? (
            <div className="px-7 py-8 text-center space-y-4">
              <div
                className="w-12 h-12 flex items-center justify-center mx-auto"
                style={{
                  background: "var(--tf-accent-light)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-sm)",
                  color: "var(--tf-accent)",
                }}
              >
                <Mail size={22} strokeWidth={1.5} />
              </div>
              <div>
                <p
                  className="label-mono mb-1"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Email enviado
                </p>
                <h2
                  className="text-[1.125rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
                >
                  Verifique sua caixa de entrada
                </h2>
                <p
                  className="text-[0.8125rem] mt-2 leading-relaxed"
                  style={{
                    color: "var(--tf-text-secondary)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  Enviamos um link para{" "}
                  <span
                    style={{
                      color: "var(--tf-text)",
                      fontFamily: "var(--tf-font-mono)",
                      fontWeight: 500,
                    }}
                  >
                    {emailConfirmacao}
                  </span>
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleReenviarEmail}
                  disabled={carregando}
                  className="w-full h-10 text-[0.8125rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] disabled:opacity-50"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    color: "var(--tf-text)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {carregando ? (
                    <Loader2 size={13} className="animate-spin mx-auto" />
                  ) : (
                    "Reenviar email"
                  )}
                </button>
                <button
                  onClick={voltarParaLogin}
                  className="w-full h-9 text-[0.6875rem] font-medium transition-colors hover:text-[var(--tf-text)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  ← Usar outro email
                </button>
              </div>
            </div>
          ) : modo === "recuperar" ? (
            <>
              <div className="px-7 pt-6 pb-2">
                <button
                  onClick={voltarParaLogin}
                  className="inline-flex items-center gap-1 text-[0.6875rem] font-medium mb-4 transition-colors hover:text-[var(--tf-accent)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <ArrowLeft size={11} strokeWidth={1.75} />
                  Voltar ao login
                </button>
                <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
                  Recuperar acesso
                </p>
                <h1
                  className="text-[1.25rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.015em" }}
                >
                  Redefinir senha
                </h1>
                <p
                  className="text-[0.8125rem] mt-1.5"
                  style={{ color: "var(--tf-text-secondary)", letterSpacing: "-0.005em" }}
                >
                  Enviaremos um link pro seu email.
                </p>
              </div>

              <div className="px-7 pb-7 pt-4 space-y-3">
                <form onSubmit={handleRecuperarSenha} className="space-y-2.5">
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="auth-input w-full h-10 px-3 text-[0.8125rem] outline-none"
                    style={{
                      color: "var(--tf-text)",
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "-0.005em",
                    }}
                  />

                  {sucesso && <SucessoBox mensagem={sucesso} />}
                  {erro && <ErroBox mensagem={erro} />}

                  <button
                    type="submit"
                    disabled={carregando}
                    className="w-full flex items-center justify-center gap-1.5 h-10 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: "var(--tf-accent)",
                      border: "1px solid var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    {carregando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <KeyRound size={13} strokeWidth={1.75} />
                        Enviar link
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="px-7 pt-6 pb-2">
                <p
                  className="label-mono mb-1"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {modo === "login" ? "Acessar conta" : "Nova conta"}
                </p>
                <h1
                  className="text-[1.25rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.015em" }}
                >
                  {modo === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
                </h1>
                <p
                  className="text-[0.8125rem] mt-1.5"
                  style={{
                    color: "var(--tf-text-secondary)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {modo === "login"
                    ? "Entre para continuar de onde parou."
                    : "Comece a organizar seus projetos."}
                </p>
              </div>

              <div className="px-7 pb-7 pt-4 space-y-4">
                {/* GitHub OAuth — so mostra se AUTH_MODE=standard (cloud) */}
                {features.signupEnabled && (
                  <>
                    <button
                      onClick={handleGithubLogin}
                      disabled={carregando}
                      className="w-full flex items-center justify-center gap-2 h-10 text-[0.8125rem] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{
                        background: "var(--tf-text)",
                        color: "var(--tf-surface)",
                        border: "1px solid var(--tf-text)",
                        borderRadius: "var(--tf-radius-xs)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      <Github size={15} strokeWidth={1.75} />
                      Continuar com GitHub
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-px"
                        style={{ background: "var(--tf-border)" }}
                      />
                      <span
                        className="label-mono"
                        style={{ color: "var(--tf-text-tertiary)" }}
                      >
                        ou
                      </span>
                      <div
                        className="flex-1 h-px"
                        style={{ background: "var(--tf-border)" }}
                      />
                    </div>
                  </>
                )}

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="space-y-2.5">
                  {modo === "cadastro" && (
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="auth-input w-full h-10 px-3 text-[0.8125rem] outline-none"
                      style={{
                        color: "var(--tf-text)",
                        borderRadius: "var(--tf-radius-xs)",
                        letterSpacing: "-0.005em",
                      }}
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input w-full h-10 px-3 text-[0.8125rem] outline-none"
                    style={{
                      color: "var(--tf-text)",
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "-0.005em",
                    }}
                  />
                  <div>
                    <input
                      type="password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      minLength={6}
                      className="auth-input w-full h-10 px-3 text-[0.8125rem] outline-none"
                      style={{
                        color: "var(--tf-text)",
                        borderRadius: "var(--tf-radius-xs)",
                        letterSpacing: "-0.005em",
                      }}
                    />
                    {modo === "login" && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModo("recuperar");
                            setErro("");
                          }}
                          className="text-[0.6875rem] font-medium transition-colors hover:brightness-110"
                          style={{
                            color: "var(--tf-accent)",
                            fontFamily: "var(--tf-font-mono)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}
                  </div>

                  {sucesso && <SucessoBox mensagem={sucesso} />}
                  {erro && <ErroBox mensagem={erro} />}

                  <button
                    type="submit"
                    disabled={carregando}
                    className="w-full flex items-center justify-center gap-1.5 h-10 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: "var(--tf-accent)",
                      border: "1px solid var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    {carregando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : modo === "login" ? (
                      <>
                        Entrar
                        <ArrowRight size={13} strokeWidth={1.75} />
                      </>
                    ) : (
                      <>
                        Criar conta
                        <ArrowRight size={13} strokeWidth={1.75} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Toggle mode — so mostra se signup habilitado (AUTH_MODE=standard) */}
        {features.signupEnabled && modo !== "email-enviado" && modo !== "recuperar" && (
          <p
            className="text-[0.8125rem] text-center mt-5"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            {modo === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => {
                setModo(modo === "login" ? "cadastro" : "login");
                setErro("");
              }}
              className="font-medium transition-colors hover:brightness-110"
              style={{
                color: "var(--tf-accent)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {modo === "login" ? "Cadastre-se" : "Fazer login"}
            </button>
          </p>
        )}
      </div>

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
    </div>
  );
}

function SucessoBox({ mensagem }: { mensagem: string }) {
  return (
    <div
      className="text-[0.75rem] px-3 py-2 font-medium"
      style={{
        background: "var(--tf-success-bg)",
        color: "var(--tf-success)",
        border: "1px solid var(--tf-success)",
        borderLeft: "3px solid var(--tf-success)",
        borderRadius: "var(--tf-radius-xs)",
        letterSpacing: "-0.005em",
      }}
    >
      {mensagem}
    </div>
  );
}

function ErroBox({ mensagem }: { mensagem: string }) {
  return (
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
      {mensagem}
    </div>
  );
}
