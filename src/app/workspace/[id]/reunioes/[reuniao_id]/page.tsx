"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import type { Perfil, Reuniao, ReuniaoFala, ReuniaoStatus } from "@/types";

const POLL_INTERVAL_MS = 3_000;
const AUDIO_SIGNED_TTL_SECONDS = 60 * 60; // 1 hora

export default function ReuniaoDetailPage() {
  const params = useParams<{ id: string; reuniao_id: string }>();
  const workspaceId = params.id;
  const reuniaoId = params.reuniao_id;
  const router = useRouter();

  const { quadros } = useQuadros();
  const { workspaces } = useWorkspaces();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  const [reuniao, setReuniao] = useState<Reuniao | null>(null);
  const [falas, setFalas] = useState<ReuniaoFala[] | null>(null);
  const [perfisPorId, setPerfisPorId] = useState<Record<string, Perfil>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const workspace = workspaces?.find((w) => w.id === workspaceId);

  // Load reuniao + falas
  const load = async () => {
    if (!reuniaoId) return;
    const [{ data: rData, error: rErr }, { data: fData, error: fErr }] =
      await Promise.all([
        supabase.from("reunioes").select("*").eq("id", reuniaoId).maybeSingle(),
        supabase
          .from("reuniao_falas")
          .select("*")
          .eq("reuniao_id", reuniaoId)
          .order("ordem", { ascending: true }),
      ]);
    if (rErr) {
      toast.error(`Erro: ${rErr.message}`);
      return;
    }
    if (!rData) {
      toast.error("Reuniao nao encontrada");
      router.push(`/workspace/${workspaceId}/reunioes`);
      return;
    }
    setReuniao(rData as Reuniao);
    if (fErr) {
      toast.error(`Erro ao carregar falas: ${fErr.message}`);
      setFalas([]);
    } else {
      setFalas((fData || []) as ReuniaoFala[]);
    }

    // Carrega perfis dos usuarios identificados nas falas
    const userIds = new Set<string>();
    (fData || []).forEach((f) => {
      if (f.usuario_id) userIds.add(f.usuario_id);
    });
    if (userIds.size > 0) {
      const { data: perfisData } = await supabase
        .from("perfis")
        .select(
          "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at",
        )
        .in("id", Array.from(userIds));
      if (perfisData) {
        const map: Record<string, Perfil> = {};
        (perfisData as Perfil[]).forEach((p) => {
          map[p.id] = p;
        });
        setPerfisPorId(map);
      }
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniaoId]);

  // Polling enquanto processando
  useEffect(() => {
    if (!reuniao) return;
    if (reuniao.status !== "pending" && reuniao.status !== "processing") return;
    const t = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniao?.status]);

  // Gera signed URL do audio quando a reuniao tiver audio_path
  useEffect(() => {
    if (!reuniao?.audio_path) {
      setAudioUrl(null);
      return;
    }
    (async () => {
      const { data } = await supabase.storage
        .from("reunioes-audio")
        .createSignedUrl(reuniao.audio_path!, AUDIO_SIGNED_TTL_SECONDS);
      if (data?.signedUrl) setAudioUrl(data.signedUrl);
    })();
  }, [reuniao?.audio_path]);

  // Sincroniza currentMs com o player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [audioUrl]);

  function jumpTo(ms: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    void audio.play();
  }

  // Agrupa falas consecutivas do mesmo speaker
  const grouped = useMemo(() => {
    if (!falas) return [];
    const out: Array<{
      speaker_label: string;
      usuario_id: string | null;
      match_confianca: number | null;
      match_tipo: string | null;
      items: ReuniaoFala[];
    }> = [];
    for (const f of falas) {
      const last = out[out.length - 1];
      if (last && last.speaker_label === f.speaker_label) {
        last.items.push(f);
      } else {
        out.push({
          speaker_label: f.speaker_label,
          usuario_id: f.usuario_id,
          match_confianca: f.match_confianca,
          match_tipo: f.match_tipo,
          items: [f],
        });
      }
    }
    return out;
  }, [falas]);

  if (!reuniao) {
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
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
            {/* Breadcrumb */}
            <button
              onClick={() =>
                router.push(`/workspace/${workspaceId}/reunioes`)
              }
              className="flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <ArrowLeft size={12} />
              Reunioes · {workspace?.nome ?? "Workspace"}
            </button>

            {/* Header */}
            <div>
              <h1
                className="text-2xl font-black tracking-tight flex items-center gap-2"
                style={{ color: "var(--tf-text)" }}
              >
                <Mic size={22} style={{ color: "var(--tf-accent)" }} />
                {reuniao.titulo}
              </h1>
              {reuniao.descricao && (
                <p
                  className="text-[13px] mt-1"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {reuniao.descricao}
                </p>
              )}
              <div
                className="flex items-center gap-3 mt-2 text-[11px]"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                <span>
                  {new Date(reuniao.criado_em).toLocaleString("pt-BR")}
                </span>
                {reuniao.duracao_seg !== null && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(reuniao.duracao_seg)}</span>
                  </>
                )}
                <span>·</span>
                <StatusBadge status={reuniao.status} />
              </div>
            </div>

            {/* Status card (processing/error) */}
            {reuniao.status === "pending" && (
              <InfoBox
                icon={<Clock size={16} style={{ color: "#f59e0b" }} />}
                title="Pendente"
                body="Aguardando o worker pegar este job. Geralmente leva alguns segundos."
                color="#f59e0b"
              />
            )}
            {reuniao.status === "processing" && (
              <InfoBox
                icon={
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: "var(--tf-accent)" }}
                  />
                }
                title="Processando"
                body="O worker esta transcrevendo, diarizando e extraindo embeddings. Reunioes longas podem demorar alguns minutos. A pagina atualiza sozinha."
                color="var(--tf-accent)"
              />
            )}
            {reuniao.status === "error" && (
              <InfoBox
                icon={<AlertCircle size={16} style={{ color: "#ef4444" }} />}
                title="Erro no processamento"
                body={reuniao.erro_mensagem ?? "Erro desconhecido"}
                color="#ef4444"
              />
            )}

            {/* Audio player */}
            {audioUrl && (
              <div
                className="rounded-[14px] p-4"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio ref={audioRef} src={audioUrl} controls className="w-full" />
              </div>
            )}

            {/* Transcript */}
            {reuniao.status === "done" && (
              <div className="space-y-4">
                <h2
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Transcricao
                </h2>

                {grouped.length === 0 ? (
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Nenhuma fala detectada.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {grouped.map((g, idx) => (
                      <SpeakerBlock
                        key={idx}
                        group={g}
                        perfil={g.usuario_id ? perfisPorId[g.usuario_id] : undefined}
                        currentMs={currentMs}
                        onJump={jumpTo}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="h-8" />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── helpers / subcomponents ───

interface SpeakerBlockProps {
  group: {
    speaker_label: string;
    usuario_id: string | null;
    match_confianca: number | null;
    match_tipo: string | null;
    items: ReuniaoFala[];
  };
  perfil?: Perfil;
  currentMs: number;
  onJump: (ms: number) => void;
}

function SpeakerBlock({ group, perfil, currentMs, onJump }: SpeakerBlockProps) {
  const displayName = perfil?.nome ?? group.speaker_label;
  const confidenceLabel =
    group.match_tipo === "strong"
      ? null
      : group.match_tipo === "weak"
        ? "match fraco"
        : "nao identificado";
  const initial = (displayName[0] || "?").toUpperCase();

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        {perfil?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold"
            style={{
              background: "var(--tf-accent-light)",
              color: "var(--tf-accent)",
            }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <p
            className="text-[13px] font-bold"
            style={{ color: "var(--tf-text)" }}
          >
            {displayName}
          </p>
          {confidenceLabel && (
            <span
              className="text-[10px] uppercase tracking-wide font-bold"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              {confidenceLabel}
              {group.match_confianca !== null &&
                ` (${(group.match_confianca * 100).toFixed(0)}%)`}
            </span>
          )}
        </div>
        <div className="space-y-1">
          {group.items.map((fala) => {
            const active =
              currentMs >= fala.inicio_ms && currentMs < fala.fim_ms;
            return (
              <button
                key={fala.id}
                onClick={() => onJump(fala.inicio_ms)}
                className="block w-full text-left rounded-[8px] px-2 py-1 transition-colors"
                style={{
                  background: active ? "var(--tf-accent-light)" : "transparent",
                  color: "var(--tf-text-secondary)",
                }}
              >
                <span
                  className="text-[10px] font-mono mr-2"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {formatTime(fala.inicio_ms)}
                </span>
                <span className="text-[13px]">{fala.texto}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReuniaoStatus }) {
  const info = {
    done: { label: "Pronto", color: "#10b981", icon: CheckCircle2 },
    processing: {
      label: "Processando",
      color: "var(--tf-accent)",
      icon: Loader2,
    },
    pending: { label: "Pendente", color: "#f59e0b", icon: Clock },
    error: { label: "Erro", color: "#ef4444", icon: AlertCircle },
  }[status];
  const Icon = info.icon;
  return (
    <span
      className="inline-flex items-center gap-1 font-bold"
      style={{ color: info.color }}
    >
      <Icon
        size={11}
        className={status === "processing" ? "animate-spin" : ""}
      />
      {info.label}
    </span>
  );
}

function InfoBox({
  icon,
  title,
  body,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-[14px]"
      style={{ background: "var(--tf-bg-secondary)" }}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color }}>
          {title}
        </p>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
