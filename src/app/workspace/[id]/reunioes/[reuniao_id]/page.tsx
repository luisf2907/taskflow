"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Volume2,
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  CircleDot,
  SquareCheck,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [summarizing, setSummarizing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);

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

    const userIds = new Set<string>();
    (fData || []).forEach((f) => {
      if (f.usuario_id) userIds.add(f.usuario_id);
    });
    if (userIds.size > 0) {
      const { data: perfisData } = await supabase
        .from("perfis")
        .select(
          "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at, theme_preferences",
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

  // Gera signed URL do audio
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

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onMeta = () => setDuration(audio.duration * 1000);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, []);

  function jumpTo(ms: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    void audio.play();
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = seekBarRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = (pct * duration) / 1000;
  }

  async function gerarResumo() {
    if (!reuniaoId || summarizing) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize-reuniao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reuniao_id: reuniaoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao gerar resumo");
        return;
      }
      // Atualizar reuniao local com o resumo
      setReuniao((prev) =>
        prev ? { ...prev, resumo_ia: data.resumo_ia } : prev
      );
      toast.success("Resumo gerado!");
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSummarizing(false);
    }
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

  const progressPct = duration > 0 ? (currentMs / duration) * 100 : 0;

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

        <div
          className="flex-1 rounded-[32px] mb-4 overflow-hidden flex flex-col scroll-clip-lg"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
          }}
        >
        <main id="main-content" className="flex-1 overflow-y-auto">
          {!reuniao ? (
            <div className="flex items-center justify-center h-full">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--tf-accent)" }}
              />
            </div>
          ) : (
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
            {/* Breadcrumb */}
            <button
              onClick={() =>
                router.push(`/workspace/${workspaceId}/reunioes`)
              }
              className="flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <ArrowLeft size={12} />
              Reunioes &middot; {workspace?.nome ?? "Workspace"}
            </button>

            {/* Header */}
            <div>
              <h1
                className="text-2xl font-black tracking-tight flex items-center gap-2.5"
                style={{ color: "var(--tf-text)" }}
              >
                <AudioLines size={22} style={{ color: "var(--tf-accent)" }} />
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
                    <span>&middot;</span>
                    <span>{formatDuration(reuniao.duracao_seg)}</span>
                  </>
                )}
                <span>&middot;</span>
                <StatusBadge status={reuniao.status} />
              </div>
            </div>

            {/* Status card (processing/error) */}
            {reuniao.status === "pending" && (
              <InfoBox
                icon={<Clock size={16} style={{ color: "var(--tf-accent-yellow)" }} />}
                title="Pendente"
                body="Aguardando o worker pegar este job. Geralmente leva alguns segundos."
                color="var(--tf-accent-yellow)"
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
                icon={
                  <AlertCircle
                    size={16}
                    style={{ color: "var(--tf-danger)" }}
                  />
                }
                title="Erro no processamento"
                body={reuniao.erro_mensagem ?? "Erro desconhecido"}
                color="var(--tf-danger)"
              />
            )}

            {/* Custom Audio Player */}
            {audioUrl && (
              <div
                className="rounded-[14px] p-4"
                style={{
                  background: "var(--tf-bg-secondary)",
                  border: "1px solid var(--tf-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Volume2
                    size={13}
                    style={{ color: "var(--tf-text-tertiary)" }}
                  />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Audio da reuniao
                  </span>
                  {reuniao.language && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-[6px] font-semibold uppercase"
                      style={{
                        background: "var(--tf-surface)",
                        color: "var(--tf-text-tertiary)",
                      }}
                    >
                      {reuniao.language}
                    </span>
                  )}
                </div>

                {/* Hidden audio element */}
                <audio ref={audioRef} src={audioUrl} preload="metadata" />

                {/* Player UI */}
                <div
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2.5"
                  style={{ background: "var(--tf-surface)" }}
                >
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 hover:opacity-80"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    {isPlaying ? (
                      <Pause size={14} className="text-white" fill="white" />
                    ) : (
                      <Play
                        size={14}
                        className="text-white ml-0.5"
                        fill="white"
                      />
                    )}
                  </button>

                  {/* Current time */}
                  <span
                    className="text-[11px] font-mono font-semibold min-w-[36px] text-right"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {formatTime(currentMs)}
                  </span>

                  {/* Seek bar */}
                  <div
                    ref={seekBarRef}
                    onClick={handleSeek}
                    className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                    style={{ background: "var(--tf-border)" }}
                  >
                    {/* Progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                      style={{
                        width: `${progressPct}%`,
                        background: "var(--tf-accent)",
                      }}
                    />
                    {/* Thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{
                        left: `calc(${progressPct}% - 6px)`,
                        background: "var(--tf-accent)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>

                  {/* Duration */}
                  <span
                    className="text-[11px] font-mono min-w-[36px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* AI Summary */}
            {reuniao.status === "done" && (
              <ResumoIaCard
                resumo={reuniao.resumo_ia}
                loading={summarizing}
                onGerar={gerarResumo}
              />
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
                  <div
                    className="rounded-[14px] p-8 text-center"
                    style={{ background: "var(--tf-bg-secondary)" }}
                  >
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      Nenhuma fala detectada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {grouped.map((g, idx) => (
                      <SpeakerBlock
                        key={idx}
                        group={g}
                        perfil={
                          g.usuario_id
                            ? perfisPorId[g.usuario_id]
                            : undefined
                        }
                        currentMs={currentMs}
                        isPlaying={isPlaying}
                        onJump={jumpTo}
                        onTogglePlay={togglePlay}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="h-8" />
          </div>
          )}
        </main>
        </div>
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
  isPlaying: boolean;
  onJump: (ms: number) => void;
  onTogglePlay: () => void;
}

function SpeakerBlock({
  group,
  perfil,
  currentMs,
  isPlaying,
  onJump,
  onTogglePlay,
}: SpeakerBlockProps) {
  const displayName = perfil?.nome ?? group.speaker_label;
  const isIdentified = group.match_tipo === "strong";
  const confidenceLabel =
    isIdentified
      ? null
      : group.match_tipo === "weak"
        ? "match fraco"
        : "nao identificado";
  const initial = (displayName[0] || "?").toUpperCase();

  return (
    <div className="flex gap-3.5">
      <div className="flex-shrink-0 pt-0.5">
        {perfil?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.avatar_url}
            alt=""
            className="w-9 h-9 rounded-full"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold"
            style={{
              background: isIdentified
                ? "var(--tf-accent-light)"
                : "var(--tf-bg-secondary)",
              color: isIdentified
                ? "var(--tf-accent)"
                : "var(--tf-text-tertiary)",
            }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <p
            className="text-[13px] font-bold"
            style={{ color: "var(--tf-text)" }}
          >
            {displayName}
          </p>
          {confidenceLabel && (
            <span
              className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-[4px]"
              style={{
                color: "var(--tf-text-tertiary)",
                background: "var(--tf-bg-secondary)",
              }}
            >
              {confidenceLabel}
              {group.match_confianca !== null &&
                ` ${(group.match_confianca * 100).toFixed(0)}%`}
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          {group.items.map((fala) => {
            const active =
              currentMs >= fala.inicio_ms && currentMs < fala.fim_ms;
            return (
              <div
                key={fala.id}
                className="group flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 transition-all duration-200"
                style={{
                  background: active
                    ? "var(--tf-accent-light)"
                    : "transparent",
                }}
              >
                <button
                  onClick={() => {
                    if (active) {
                      onTogglePlay();
                    } else {
                      onJump(fala.inicio_ms);
                    }
                  }}
                  className="flex-1 min-w-0 text-left"
                  style={{
                    color: active
                      ? "var(--tf-accent-text)"
                      : "var(--tf-text-secondary)",
                  }}
                >
                  <span
                    className="text-[10px] font-mono mr-2 inline-block min-w-[32px]"
                    style={{
                      color: active
                        ? "var(--tf-accent)"
                        : "var(--tf-text-tertiary)",
                    }}
                  >
                    {formatTime(fala.inicio_ms)}
                  </span>
                  <span className="text-[13px]">{fala.texto}</span>
                </button>

                {/* Inline play/pause button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (active) {
                      onTogglePlay();
                    } else {
                      onJump(fala.inicio_ms);
                    }
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150"
                  style={{
                    background: active
                      ? "var(--tf-accent)"
                      : "var(--tf-bg-secondary)",
                    opacity: active ? 1 : undefined,
                  }}
                  // Show on hover for inactive, always show for active
                  {...(!active && {
                    style: {
                      background: "var(--tf-bg-secondary)",
                      opacity: 0,
                    },
                    className:
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 group-hover:!opacity-100",
                  })}
                >
                  {active && isPlaying ? (
                    <Pause
                      size={10}
                      style={{
                        color: active ? "white" : "var(--tf-text-tertiary)",
                      }}
                      fill={active ? "white" : "currentColor"}
                    />
                  ) : (
                    <Play
                      size={10}
                      className="ml-px"
                      style={{
                        color: active ? "white" : "var(--tf-text-tertiary)",
                      }}
                      fill={active ? "white" : "currentColor"}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReuniaoStatus }) {
  const info = {
    done: {
      label: "Pronto",
      color: "var(--tf-success)",
      icon: CheckCircle2,
    },
    processing: {
      label: "Processando",
      color: "var(--tf-accent)",
      icon: Loader2,
    },
    pending: { label: "Pendente", color: "var(--tf-accent-yellow)", icon: Clock },
    error: { label: "Erro", color: "var(--tf-danger)", icon: AlertCircle },
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

function ResumoIaCard({
  resumo,
  loading,
  onGerar,
}: {
  resumo: Reuniao["resumo_ia"];
  loading: boolean;
  onGerar: () => void;
}) {
  if (!resumo && !loading) {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={onGerar}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-[12px] text-[13px] font-bold text-white transition-all duration-150 hover:opacity-90"
          style={{ background: "var(--tf-accent)" }}
        >
          <Sparkles size={15} />
          Resumir com IA
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center gap-3 p-5 rounded-[14px]"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
        }}
      >
        <Loader2
          size={16}
          className="animate-spin"
          style={{ color: "var(--tf-accent)" }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          Gerando resumo...
        </span>
      </div>
    );
  }

  if (!resumo) return null;

  return (
    <div
      className="rounded-[14px] p-5 space-y-4"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--tf-accent)" }} />
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Resumo da IA
          </span>
        </div>
        <button
          onClick={onGerar}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-semibold transition-all duration-150 hover:opacity-70"
          style={{
            color: "var(--tf-text-tertiary)",
            background: "var(--tf-surface)",
          }}
          title="Regerar resumo"
        >
          <RefreshCw size={10} />
          Regerar
        </button>
      </div>

      {/* Resumo */}
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "var(--tf-text)" }}
      >
        {resumo.resumo}
      </p>

      {/* Pontos-chave */}
      {resumo.pontos_chave.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Pontos-chave
          </p>
          <ul className="space-y-1">
            {resumo.pontos_chave.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <CircleDot
                  size={10}
                  className="flex-shrink-0 mt-1"
                  style={{ color: "var(--tf-accent)" }}
                />
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {p}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarefas */}
      {resumo.tarefas.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Tarefas identificadas
          </p>
          <ul className="space-y-1">
            {resumo.tarefas.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <SquareCheck
                  size={11}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "var(--tf-success)" }}
                />
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data de geracao */}
      <p
        className="text-[10px]"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        Gerado em{" "}
        {new Date(resumo.gerado_em).toLocaleString("pt-BR")}
      </p>
    </div>
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
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color }}>
          {title}
        </p>
        <p
          className="text-[12px] mt-0.5 leading-relaxed"
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
