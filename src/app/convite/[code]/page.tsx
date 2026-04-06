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
      // Verificar se logado
      const { data: { user } } = await supabase.auth.getUser();
      setLogado(!!user);

      // Validar link
      const res = await fetch(`/api/invites/${code}`);
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error || "Link invalido");
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
        // Nao logado — redirecionar para login com next
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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--tf-bg)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--tf-accent)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "var(--tf-accent-yellow)" }} />
      </div>

      <div className="relative w-full max-w-md rounded-[32px] px-8 py-10" style={{ background: "var(--tf-surface)", boxShadow: "var(--tf-shadow-lg)" }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "var(--tf-accent)" }}>
            <Kanban size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[20px] font-black tracking-tight" style={{ color: "var(--tf-text)" }}>Taskflow</span>
        </div>

        {carregando ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--tf-accent)" }} />
            <p className="text-[14px]" style={{ color: "var(--tf-text-secondary)" }}>Verificando convite...</p>
          </div>
        ) : erro && !workspace ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--tf-danger-bg)" }}>
              <AlertCircle size={28} style={{ color: "var(--tf-danger)" }} />
            </div>
            <h2 className="text-[18px] font-bold mb-2" style={{ color: "var(--tf-text)" }}>{erro}</h2>
            <p className="text-[13px] mb-6" style={{ color: "var(--tf-text-secondary)" }}>
              O link pode ter expirado ou sido revogado.
            </p>
            <Link href="/login" className="text-[13px] font-bold no-underline" style={{ color: "var(--tf-accent)" }}>
              Ir para o login
            </Link>
          </div>
        ) : sucesso ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--tf-success-bg)" }}>
              <Check size={28} style={{ color: "var(--tf-success)" }} strokeWidth={3} />
            </div>
            <h2 className="text-[18px] font-bold mb-2" style={{ color: "var(--tf-text)" }}>Bem-vindo!</h2>
            <p className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>
              Voce entrou no workspace <strong>{workspace?.nome}</strong>. Redirecionando...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ background: workspace?.cor || "var(--tf-accent)" }}>
              <Users size={28} className="text-white" />
            </div>
            <h2 className="text-[20px] font-bold mb-1" style={{ color: "var(--tf-text)" }}>
              Voce foi convidado
            </h2>
            <p className="text-[14px] mb-6" style={{ color: "var(--tf-text-secondary)" }}>
              para o workspace <strong style={{ color: "var(--tf-text)" }}>{workspace?.nome}</strong>
            </p>

            {erro && (
              <div className="text-[13px] px-3 py-2 rounded-[10px] mb-4" style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}>
                {erro}
              </div>
            )}

            {logado ? (
              <button
                onClick={handleAceitar}
                disabled={aceitando}
                className="w-full py-3.5 rounded-[14px] text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "var(--tf-accent)" }}
              >
                {aceitando ? "Entrando..." : "Aceitar convite"}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  Faca login ou crie uma conta para aceitar o convite.
                </p>
                <Link
                  href={`/login?next=/convite/${code}`}
                  className="block w-full py-3.5 rounded-[14px] text-[14px] font-bold text-white text-center no-underline transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--tf-accent)" }}
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
