"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Mic,
  MicOff,
  Loader2,
  Check,
  FileAudio,
  RotateCcw,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { AudioPlayer } from "@/components/ui/audio-player";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { features } from "@/lib/features";
import { toast } from "@/hooks/use-toast";
import { useRecording } from "@/hooks/use-recording";

interface NovaReuniaoModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}

type Tab = "upload" | "record";
type SubmitPhase = "idle" | "uploading" | "processing";

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["audio/", "video/"];

export function NovaReuniaoModal({
  workspaceId,
  onClose,
  onCreated,
}: NovaReuniaoModalProps) {
  const recording = useRecording();

  const [tab, setTab] = useState<Tab>("upload");
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [dragOver, setDragOver] = useState(false);

  // Áudio vindo de upload de arquivo (separado do gravador, que vive no contexto)
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string>("");
  const [uploadedMime, setUploadedMime] = useState<string>("");
  const uploadedUrlRef = useRef<string | null>(null);

  // Ao desmontar, só limpa URLs de upload. NÃO mexe no gravador (contexto cuida).
  useEffect(() => {
    return () => {
      if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
    };
  }, []);

  // Sincroniza metadata (workspaceId/titulo/descricao) com o contexto quando abre
  useEffect(() => {
    if (!recording.workspaceId || recording.workspaceId !== workspaceId) {
      recording.setMeta(workspaceId, recording.titulo, recording.descricao);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Se já tem uma gravação em curso, força tab="record"
  useEffect(() => {
    if (recording.phase === "recording" || recording.phase === "stopped") {
      setTab("record");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.phase]);

  // Audio "ativo" pra preview e submit — ou é um upload, ou é resultado da gravação
  const audioBlob = uploadedBlob || recording.result?.blob || null;
  const audioUrl = uploadedUrl || recording.result?.url || null;
  const audioName = uploadedBlob
    ? uploadedName
    : recording.result
      ? recording.result.name
      : "";
  const audioMime = uploadedBlob
    ? uploadedMime
    : recording.result
      ? recording.result.mime
      : "";

  const titulo = recording.titulo;
  const descricao = recording.descricao;

  const resetAudio = useCallback(() => {
    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
      uploadedUrlRef.current = null;
    }
    setUploadedBlob(null);
    setUploadedUrl(null);
    setUploadedName("");
    setUploadedMime("");
    // Se o audio ativo era o da gravação, descarta lá também
    if (recording.phase === "stopped") {
      recording.discard();
      recording.setMeta(workspaceId, titulo, descricao);
    }
  }, [recording, workspaceId, titulo, descricao]);

  // ---------- upload file ----------
  function handleFilePick(file: File) {
    if (file.size === 0) {
      toast.error("Arquivo vazio");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Arquivo maior que ${MAX_BYTES / 1024 / 1024} MB`);
      return;
    }
    const mime = file.type || "audio/webm";
    if (!ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      toast.error(`Tipo não suportado: ${mime}`);
      return;
    }
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
    const url = URL.createObjectURL(file);
    uploadedUrlRef.current = url;
    setUploadedBlob(file);
    setUploadedUrl(url);
    setUploadedName(file.name);
    setUploadedMime(mime);
  }

  function onInputFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFilePick(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFilePick(f);
  }

  // ---------- record (delega ao contexto) ----------
  async function handleStartRecording() {
    const ok = await recording.startRecording();
    if (!ok) {
      toast.error("Falha ao acessar microfone");
    }
  }

  async function handleStopRecording() {
    await recording.stopRecording();
  }

  // ---------- submit ----------
  async function handleSubmit() {
    if (!audioBlob) {
      toast.error("Nenhum áudio selecionado");
      return;
    }
    if (!titulo.trim()) {
      toast.error("Título obrigatório");
      return;
    }

    setSubmitPhase("uploading");

    let createData: {
      reuniao?: { id: string };
      upload?: { signed_url: string; token: string };
      error?: string;
    };
    try {
      const res = await fetch("/api/reunioes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          mime_type: audioMime,
        }),
      });
      createData = await res.json();
      if (!res.ok || !createData.reuniao || !createData.upload) {
        throw new Error(createData.error || "Falha ao criar reunião");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
      setSubmitPhase("idle");
      return;
    }

    const reuniaoId = createData.reuniao.id;
    const uploadUrl = createData.upload.signed_url;

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": audioMime || "audio/webm" },
        body: audioBlob,
      });
      if (!uploadRes.ok) {
        throw new Error(
          `Upload falhou: HTTP ${uploadRes.status} ${uploadRes.statusText}`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
      setSubmitPhase("idle");
      try {
        const { supabase } = await import("@/lib/supabase/client");
        await supabase.from("reunioes").delete().eq("id", reuniaoId);
      } catch {}
      return;
    }

    setSubmitPhase("processing");
    try {
      const procRes = await fetch(`/api/reunioes/${reuniaoId}/process`, {
        method: "POST",
      });
      const procData = await procRes.json();
      if (!procRes.ok && procRes.status !== 202) {
        throw new Error(procData.error || "Falha ao iniciar processamento");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao iniciar processamento"
      );
      // Após submit, descarta gravação do contexto
      recording.discard();
      onCreated();
      return;
    }

    toast.success("Reunião enviada! Processando em background…");
    // Descarta gravação do contexto após envio bem-sucedido
    recording.discard();
    onCreated();
  }

  const totalSec = Math.floor(recording.elapsedMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeDisplay = `${minutes}:${secs.toString().padStart(2, "0")}`;
  const isBusy = submitPhase !== "idle";
  const isRecording = recording.phase === "recording";
  const hasAudio = !!audioBlob;

  // Estado visual derivado
  let viewState: "idle" | "recording" | "ready";
  if (isRecording) viewState = "recording";
  else if (hasAudio) viewState = "ready";
  else viewState = "idle";

  return (
    <Modal
      aberto
      onFechar={isBusy ? () => {} : onClose}
      titulo={isRecording ? "Gravando reunião…" : "Nova reunião"}
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* Aviso quando recording + modal aberto */}
        {isRecording && (
          <div
            className="flex items-start gap-2.5 p-3"
            style={{
              background: "var(--tf-danger-bg)",
              border: "1px solid var(--tf-danger)",
              borderLeft: "3px solid var(--tf-danger)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <span
              className="w-2 h-2 pulse-dot mt-1.5 shrink-0"
              style={{
                background: "var(--tf-danger)",
                borderRadius: "1px",
              }}
            />
            <div>
              <p
                className="label-mono mb-0.5"
                style={{ color: "var(--tf-danger)" }}
              >
                Gravação em andamento
              </p>
              <p
                className="text-[0.75rem]"
                style={{
                  color: "var(--tf-text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                Pode fechar essa janela — a gravação continua no fundo e um
                indicador aparece no canto. Volte aqui pra parar e enviar.
              </p>
            </div>
          </div>
        )}

        {/* Título */}
        <div>
          <label
            className="label-mono mb-1.5 block"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Título *
          </label>
          <input
            value={titulo}
            onChange={(e) => recording.setTitulo(e.target.value)}
            placeholder="Ex: Daily 2026-04-09"
            disabled={isBusy}
            className="reuniao-input w-full h-10 px-3 text-[0.8125rem] outline-none disabled:opacity-50"
            style={{
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          />
        </div>

        {/* Descrição */}
        <div>
          <label
            className="label-mono mb-1.5 block"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Descrição (opcional)
          </label>
          <input
            value={descricao}
            onChange={(e) => recording.setDescricao(e.target.value)}
            placeholder="Sprint planning, review, etc"
            disabled={isBusy}
            className="reuniao-input w-full h-10 px-3 text-[0.8125rem] outline-none disabled:opacity-50"
            style={{
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          />
        </div>

        {/* Tabs upload/record — só quando idle. Esconde "Gravar" se
            VOICE_DRIVER=disabled (sem worker → sem transcricao). Upload
            continua disponivel pra quem quiser guardar o audio cru. */}
        {viewState === "idle" && (
          <SegmentedControl
            items={
              features.voiceEnabled
                ? [
                    { id: "upload", label: "Upload", icon: Upload },
                    { id: "record", label: "Gravar", icon: Mic },
                  ]
                : [{ id: "upload", label: "Upload", icon: Upload }]
            }
            value={tab}
            onChange={setTab}
            variant="pill"
            size="sm"
            fullWidth
            monoCaps
            aria-label="Fonte do áudio"
          />
        )}

        {/* Tab: Upload */}
        {viewState === "idle" && tab === "upload" && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="block p-7 text-center cursor-pointer transition-colors"
            style={{
              background: dragOver
                ? "var(--tf-accent-light)"
                : "var(--tf-bg-secondary)",
              border: `1px dashed ${dragOver ? "var(--tf-accent)" : "var(--tf-border-strong)"}`,
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div
              className="w-10 h-10 mx-auto mb-3 flex items-center justify-center"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                color: "var(--tf-text-tertiary)",
              }}
            >
              <Upload size={15} strokeWidth={1.75} />
            </div>
            <p
              className="text-[0.8125rem] font-medium"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.005em",
              }}
            >
              Clique ou arraste um arquivo
            </p>
            <p
              className="text-[0.6875rem] mt-1"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              Máx 200 MB · mp3, wav, webm, m4a, mp4, ogg
            </p>
            <input
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={onInputFile}
            />
          </label>
        )}

        {/* Tab: Record */}
        {viewState === "idle" && tab === "record" && (
          <div
            className="p-7 text-center"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div
              className="w-10 h-10 mx-auto mb-3 flex items-center justify-center"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                color: "var(--tf-text-tertiary)",
              }}
            >
              <Mic size={15} strokeWidth={1.75} />
            </div>
            <p
              className="text-[0.8125rem] font-medium mb-4"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.005em",
              }}
            >
              Grave direto do seu microfone
            </p>
            <button
              onClick={handleStartRecording}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              <Mic size={13} strokeWidth={1.75} />
              Iniciar gravação
            </button>
          </div>
        )}

        {/* Gravando */}
        {viewState === "recording" && (
          <div
            className="p-7 text-center space-y-4"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center animate-pulse"
              style={{
                background: "var(--tf-danger-bg)",
                border: "1px solid var(--tf-danger)",
                borderRadius: "var(--tf-radius-md)",
                color: "var(--tf-danger)",
              }}
            >
              <Mic size={22} strokeWidth={1.75} />
            </div>
            <p
              className="text-[1.75rem] font-semibold"
              style={{
                color: "var(--tf-text)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "-0.02em",
              }}
            >
              {timeDisplay}
            </p>
            <button
              onClick={handleStopRecording}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110"
              style={{
                background: "var(--tf-danger)",
                border: "1px solid var(--tf-danger)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              <MicOff size={13} strokeWidth={1.75} />
              Parar gravação
            </button>
          </div>
        )}

        {/* Preview (ready) */}
        {viewState === "ready" && audioUrl && (
          <div
            className="p-3.5 space-y-3"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                style={{
                  background: "transparent",
                  border: "1px solid var(--tf-success)",
                  color: "var(--tf-success)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                <FileAudio size={13} strokeWidth={1.75} />
              </div>
              <p
                className="text-[0.75rem] font-medium flex-1 truncate"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.005em",
                }}
              >
                {audioName}
              </p>
              <button
                onClick={resetAudio}
                disabled={isBusy}
                className="p-1 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-danger)] disabled:opacity-50"
                style={{
                  color: "var(--tf-text-tertiary)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
                title="Remover áudio"
                aria-label="Remover áudio"
              >
                <RotateCcw size={12} strokeWidth={1.75} />
              </button>
            </div>
            <AudioPlayer src={audioUrl} />
          </div>
        )}

        {/* Status busy */}
        {submitPhase === "uploading" && (
          <div
            className="flex items-center gap-2.5 p-3"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: "var(--tf-accent)" }}
            />
            <span
              className="text-[0.8125rem] font-medium"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Enviando áudio…
            </span>
          </div>
        )}
        {submitPhase === "processing" && (
          <div
            className="flex items-center gap-2.5 p-3"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: "var(--tf-accent)" }}
            />
            <span
              className="text-[0.8125rem] font-medium"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              Iniciando processamento no worker…
            </span>
          </div>
        )}

        {/* Ações finais */}
        <div className="flex items-center justify-end gap-1.5 pt-2">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="h-9 px-3.5 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] disabled:opacity-40"
            style={{
              color: "var(--tf-text-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            {isRecording ? "Fechar (gravação continua)" : "Cancelar"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!audioBlob || !titulo.trim() || isBusy || isRecording}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--tf-accent)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Check size={13} strokeWidth={1.75} />
            Enviar
          </button>
        </div>

        <style jsx>{`
          .reuniao-input {
            background: var(--tf-surface);
            border: 1px solid var(--tf-border);
            transition: border-color 0.15s ease;
          }
          .reuniao-input:focus {
            border-color: var(--tf-accent);
          }
        `}</style>
      </div>
    </Modal>
  );
}
