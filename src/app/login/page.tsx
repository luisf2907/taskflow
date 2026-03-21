"use client";

import { supabase } from "@/lib/supabase/client";
import { Github, Kanban, Loader2, Mail } from "lucide-react";
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
          options: {
            data: { full_name: nome },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(message);
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--tf-bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          boxShadow: "var(--tf-shadow-lg)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--tf-accent)" }}
          >
            <Kanban size={18} className="text-white" />
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--tf-text)" }}
          >
            Taskflow
          </span>
        </div>

        <h1
          className="text-lg font-semibold text-center mb-6"
          style={{ color: "var(--tf-text)" }}
        >
          {modo === "login" ? "Entrar na sua conta" : "Criar conta"}
        </h1>

        {/* GitHub OAuth */}
        <button
          onClick={handleGithubLogin}
          disabled={carregando}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-smooth mb-4"
          style={{
            background: "var(--tf-text)",
            color: "var(--tf-bg)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.opacity = "0.9")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.opacity = "1")
          }
        >
          <Github size={17} />
          Continuar com GitHub
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "var(--tf-border)" }} />
          <span className="text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
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
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-smooth"
              style={{
                background: "var(--tf-bg)",
                border: "1px solid var(--tf-border)",
                color: "var(--tf-text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-border)")
              }
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-smooth"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-border)")
            }
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-smooth"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-border)")
            }
          />

          {erro && (
            <p
              className="text-xs px-1"
              style={{ color: "var(--tf-danger)" }}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-smooth"
            style={{ background: "var(--tf-accent)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--tf-accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--tf-accent)")
            }
          >
            {carregando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Mail size={16} />
            )}
            {modo === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {/* Toggle modo */}
        <p
          className="text-xs text-center mt-5"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          {modo === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => {
              setModo(modo === "login" ? "cadastro" : "login");
              setErro("");
            }}
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--tf-accent)" }}
          >
            {modo === "login" ? "Cadastre-se" : "Fazer login"}
          </button>
        </p>
      </div>
    </div>
  );
}
