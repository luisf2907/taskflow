"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Mic,
} from "lucide-react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import type { Reuniao, ReuniaoStatus } from "@/types";

import { NovaReuniaoModal } from "./_components/nova-reuniao-modal";

const POLL_INTERVAL_MS = 3_000;

export default function ReunioesPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;
  const router = useRouter();

  const { perfil, carregando: authLoading } = useAuth();
  const { quadros } = useQuadros();
  const { workspaces } = useWorkspaces();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  const [reunioes, setReunioes] = useState<Reuniao[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const isEnrolled = Boolean(perfil?.voice_enrolled_at);

  // Load reunioes
  const loadReunioes = async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase
      .from("reunioes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false });
    if (error) {
      toast.error(`Erro ao carregar reunioes: ${error.message}`);
      return;
    }
    setReunioes((data || []) as Reuniao[]);
  };

  useEffect(() => {
    if (!workspaceId) return;
    void loadReunioes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Poll enquanto tiver reunioes em processamento
  useEffect(() => {
    if (!reunioes) return;
    const hasInFlight = reunioes.some(
      (r) => r.status === "pending" || r.status === "processing",
    );
    if (!hasInFlight) return;

    const timer = setInterval(() => {
      void loadReunioes();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reunioes]);

  async function handleDelete(reuniao: Reuniao) {
    if (!window.confirm(`Apagar a reuniao "${reuniao.titulo}"?`)) return;
    const { error } = await supabase
      .from("reunioes")
      .delete()
      .eq("id", reuniao.id);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
      return;
    }
    // tbm tenta apagar o audio do storage (best-effort)
    if (reuniao.audio_path) {
      await supabase.storage.from("reunioes-audio").remove([reuniao.audio_path]);
    }
    toast.success("Reuniao removida");
    void loadReunioes();
  }

  if (authLoading || !workspaceId) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: "var(--tf-bg)" }}
      >
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--tf-accent)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: "var(--tf-bg)" }}
    >
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto rounded-[32px] mb-4 no-scrollbar"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
            {/* Breadcrumb + title */}
            <div>
              <button
                onClick={() => router.push(`/workspace/${workspaceId}`)}
                className="flex items-center gap-1.5 text-[12px] font-semibold mb-3 transition-opacity hover:opacity-70"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                <ArrowLeft size={12} />
                {workspace?.nome ?? "Workspace"}
              </button>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl font-black tracking-tight flex items-center gap-2.5"
                    style={{ color: "var(--tf-text)" }}
                  >
                    <AudioLines size={22} style={{ color: "var(--tf-accent)" }} />
                    Reunioes
                  </h1>
                  <p
                    className="text-[13px] mt-1"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Grave ou suba o audio de uma reuniao. O TaskFlow
                    transcreve e identifica quem falou automaticamente.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2 flex-shrink-0 transition-all duration-150 hover:opacity-90"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Plus size={14} />
                  Nova reuniao
                </button>
              </div>
            </div>

            {/* Aviso se o usuario nao cadastrou a voz */}
            {!isEnrolled && (
              <div
                className="flex items-start gap-3 p-4 rounded-[14px]"
                style={{
                  background: "var(--tf-warning-bg, rgba(251, 191, 36, 0.08))",
                  border: "1px solid color-mix(in srgb, #f59e0b 15%, transparent)",
                }}
              >
                <Mic
                  size={16}
                  style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }}
                />
                <div className="flex-1">
                  <p
                    className="text-[13px] font-bold"
                    style={{ color: "#f59e0b" }}
                  >
                    Cadastre sua voz
                  </p>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Sem cadastrar a voz no seu perfil, a transcricao nao vai
                    identificar voce automaticamente.{" "}
                    <button
                      onClick={() => router.push("/settings")}
                      className="font-bold underline transition-opacity hover:opacity-70"
                      style={{ color: "var(--tf-accent)" }}
                    >
                      Ir para configuracoes
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Lista */}
            {reunioes === null ? (
              <div className="flex items-center justify-center py-16">
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: "var(--tf-accent)" }}
                />
              </div>
            ) : reunioes.length === 0 ? (
              <div
                className="rounded-[20px] p-12 text-center"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div
                  className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--tf-surface)" }}
                >
                  <AudioLines
                    size={24}
                    style={{ color: "var(--tf-text-tertiary)" }}
                  />
                </div>
                <p
                  className="text-[15px] font-bold mb-1"
                  style={{ color: "var(--tf-text)" }}
                >
                  Nenhuma reuniao ainda
                </p>
                <p
                  className="text-[12px] mb-5"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Suba um audio ou grave uma reuniao para gerar transcricoes
                  automaticas.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Plus size={14} />
                  Nova reuniao
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {reunioes.map((r) => (
                  <ReuniaoCard
                    key={r.id}
                    reuniao={r}
                    onOpen={() =>
                      router.push(`/workspace/${workspaceId}/reunioes/${r.id}`)
                    }
                    onDelete={() => handleDelete(r)}
                  />
                ))}
              </div>
            )}

            <div className="h-8" />
          </div>
        </main>
      </div>

      {modalOpen && (
        <NovaReuniaoModal
          workspaceId={workspaceId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void loadReunioes();
          }}
        />
      )}
    </div>
  );
}

// ─── ReuniaoCard ───
interface ReuniaoCardProps {
  reuniao: Reuniao;
  onOpen: () => void;
  onDelete: () => void;
}

function ReuniaoCard({ reuniao, onOpen, onDelete }: ReuniaoCardProps) {
  const statusInfo = getStatusInfo(reuniao.status);
  const createdAt = new Date(reuniao.criado_em).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const duration = reuniao.duracao_seg
    ? formatDuration(reuniao.duracao_seg)
    : null;

  return (
    <div
      className="group rounded-[14px] p-4 flex items-center gap-4 transition-all duration-150"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
      }}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left flex items-center gap-4"
      >
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: statusInfo.bg }}
        >
          {statusInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold truncate"
            style={{ color: "var(--tf-text)" }}
          >
            {reuniao.titulo}
          </p>
          <div
            className="flex items-center gap-2 mt-0.5 text-[11px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <span>{createdAt}</span>
            {duration && (
              <>
                <span>&middot;</span>
                <span>{duration}</span>
              </>
            )}
            <span>&middot;</span>
            <span style={{ color: statusInfo.color, fontWeight: 600 }}>
              {statusInfo.label}
            </span>
          </div>
          {reuniao.status === "error" && reuniao.erro_mensagem && (
            <p
              className="text-[11px] mt-1 truncate"
              style={{ color: "var(--tf-danger)" }}
              title={reuniao.erro_mensagem}
            >
              {reuniao.erro_mensagem}
            </p>
          )}
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 rounded-[8px] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 hover:!opacity-100"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Apagar reuniao"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── helpers ───
function getStatusInfo(status: ReuniaoStatus): {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactElement;
} {
  switch (status) {
    case "done":
      return {
        label: "Pronto",
        color: "var(--tf-success)",
        bg: "var(--tf-success-bg)",
        icon: <CheckCircle2 size={18} style={{ color: "var(--tf-success)" }} />,
      };
    case "processing":
      return {
        label: "Processando",
        color: "var(--tf-accent)",
        bg: "var(--tf-accent-light)",
        icon: (
          <Loader2
            size={18}
            className="animate-spin"
            style={{ color: "var(--tf-accent)" }}
          />
        ),
      };
    case "pending":
      return {
        label: "Pendente",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.1)",
        icon: <Clock size={18} style={{ color: "#f59e0b" }} />,
      };
    case "error":
      return {
        label: "Erro",
        color: "var(--tf-danger)",
        bg: "var(--tf-danger-bg)",
        icon: <AlertCircle size={18} style={{ color: "var(--tf-danger)" }} />,
      };
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
