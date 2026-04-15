"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Kanban, Loader2, Check, AlertCircle, Users } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface WorkspaceInfo {
  id: string;
  nome: string;
  cor: string;
}

export default function ConvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aceitando, setAceitando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setLogado(!!user);

      const res = await fetch(`/api/invites/${code}`);
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error || "Link inválido");
        setCarregando(false);
        return;
      }
      const data = await res.json();
      setWorkspace(data.workspace);
      setCarregando(false);
    }
    init();
  }, [code]);

  async function handleAceitar() {
    setAceitando(true);
    setErro(null);

    const res = await fetch(`/api/invites/${code}`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/login?next=/convite/${code}`);
        return;
      }
      setErro(data.error || "Erro ao aceitar convite");
      setAceitando(false);
      return;
    }

    setSucesso(true);
    setTimeout(() => {
      router.push(`/workspace/${data.workspace_id}`);
    }, 1500);
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

        {carregando ? (
          <div className="text-center py-6">
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
              Verificando convite…
            </p>
          </div>
        ) : erro && !workspace ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
              style={{
                background: "var(--tf-danger-bg)",
                border: "1px solid var(--tf-danger)",
                borderRadius: "var(--tf-radius-sm)",
                color: "var(--tf-danger)",
              }}
            >
              <AlertCircle size={22} strokeWidth={1.75} />
            </div>
            <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
              Convite inválido
            </p>
            <h2
              className="text-[1.0625rem] font-semibold mb-2"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
            >
              {erro}
            </h2>
            <p
              className="text-[0.8125rem] mb-5"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              O link pode ter expirado ou sido revogado.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center h-9 px-4 text-[0.6875rem] font-medium no-underline transition-colors"
              style={{
                color: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Ir para o login
            </Link>
          </div>
        ) : sucesso ? (
          <div className="text-center py-4">
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
            <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
              Pronto
            </p>
            <h2
              className="text-[1.125rem] font-semibold mb-2"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.015em" }}
            >
              Bem-vindo!
            </h2>
            <p
              className="text-[0.8125rem]"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Entrou no workspace{" "}
              <span
                style={{
                  color: "var(--tf-text)",
                  fontFamily: "var(--tf-font-mono)",
                  fontWeight: 500,
                }}
              >
                {workspace?.nome}
              </span>
              . Redirecionando…
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div
              className="w-14 h-14 flex items-center justify-center mx-auto mb-4"
              style={{
                background: workspace?.cor || "var(--tf-accent)",
                borderRadius: "var(--tf-radius-sm)",
              }}
            >
              <Users size={24} className="text-white" strokeWidth={1.75} />
            </div>
            <p className="label-mono mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
              Convite recebido
            </p>
            <h2
              className="text-[1.125rem] font-semibold mb-1"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.015em" }}
            >
              Você foi convidado
            </h2>
            <p
              className="text-[0.8125rem] mb-5"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              para o workspace{" "}
              <span
                style={{
                  color: "var(--tf-text)",
                  fontFamily: "var(--tf-font-mono)",
                  fontWeight: 500,
                }}
              >
                {workspace?.nome}
              </span>
            </p>

            {erro && (
              <div
                className="text-[0.75rem] px-3 py-2 mb-3 font-medium"
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

            {logado ? (
              <button
                onClick={handleAceitar}
                disabled={aceitando}
                className="w-full h-10 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "var(--tf-accent)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "-0.005em",
                }}
              >
                {aceitando ? "Entrando…" : "Aceitar convite"}
              </button>
            ) : (
              <div className="space-y-2.5">
                <p
                  className="text-[0.6875rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Faça login ou crie uma conta para aceitar o convite.
                </p>
                <Link
                  href={`/login?next=/convite/${code}`}
                  className="flex items-center justify-center w-full h-10 text-[0.8125rem] font-medium text-white text-center no-underline transition-colors hover:brightness-110"
                  style={{
                    background: "var(--tf-accent)",
                    border: "1px solid var(--tf-accent)",
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  Entrar / Criar conta
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
