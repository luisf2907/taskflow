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
import { toast } from "@/hooks/use-toast";

interface NovaReuniaoModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}

type Tab = "upload" | "record";
type Phase = "idle" | "recording" | "ready" | "uploading" | "processing";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB (alinhado com o worker)
const MAX_RECORD_SECONDS = 60 * 60; // 1 hora
const ALLOWED_MIME_PREFIXES = ["audio/", "video/"];

export function NovaReuniaoModal({
  workspaceId,
  onClose,
  onCreated,
}: NovaReuniaoModalProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [audioMime, setAudioMime] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanupRecording() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  const resetAudio = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioName("");
    setAudioMime("");
    setElapsedMs(0);
    setPhase("idle");
  }, [audioUrl]);

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
      toast.error(`Tipo nao suportado: ${mime}`);
      return;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    setAudioMime(mime);
    setPhase("ready");
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

  // ---------- record ----------
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioName("gravacao.webm");
        setAudioMime(type);
        setPhase("ready");
        cleanupRecording();
      };

      startRef.current = Date.now();
      setElapsedMs(0);
      recorder.start(1000); // flush a cada 1s
      setPhase("recording");

      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startRef.current;
        setElapsedMs(ms);
        if (
          ms >= MAX_RECORD_SECONDS * 1000 &&
          recorder.state !== "inactive"
        ) {
          recorder.stop();
        }
      }, 250) as unknown as number;
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Acesso ao microfone negado"
          : err instanceof Error
            ? err.message
            : "Falha ao acessar microfone";
      toast.error(msg);
      cleanupRecording();
      setPhase("idle");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  // ---------- submit ----------
  async function handleSubmit() {
    if (!audioBlob) {
      toast.error("Nenhum audio selecionado");
      return;
    }
    if (!titulo.trim()) {
      toast.error("Titulo obrigatorio");
      return;
    }

    setPhase("uploading");

    // 1) POST /api/reunioes (cria linha + retorna signed upload URL)
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
        throw new Error(createData.error || "Falha ao criar reuniao");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
      setPhase("ready");
      return;
    }

    const reuniaoId = createData.reuniao.id;
    const uploadUrl = createData.upload.signed_url;

    // 2) PUT direto pro Supabase Storage
    try {
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": audioMime || "audio/webm" },
        body: audioBlob,
      });
      if (!uploadRes.ok) {
        throw new Error(
          `Upload falhou: HTTP ${uploadRes.status} ${uploadRes.statusText}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
      setPhase("ready");
      // Tenta limpar a reuniao orfa (best-effort)
      try {
        const { supabase } = await import("@/lib/supabase/client");
        await supabase.from("reunioes").delete().eq("id", reuniaoId);
      } catch {}
      return;
    }

    // 3) POST /api/reunioes/[id]/process (dispara o worker async)
    setPhase("processing");
    try {
      const procRes = await fetch(
        `/api/reunioes/${reuniaoId}/process`,
        { method: "POST" },
      );
      const procData = await procRes.json();
      if (!procRes.ok && procRes.status !== 202) {
        throw new Error(procData.error || "Falha ao iniciar processamento");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao iniciar processamento",
      );
      // A reuniao ja foi criada; o usuario pode ver na lista com status=pending
      onCreated();
      return;
    }

    toast.success("Reuniao enviada! Processando em background...");
    onCreated();
  }

  const totalSec = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeDisplay = `${minutes}:${secs.toString().padStart(2, "0")}`;
  const isBusy = phase === "uploading" || phase === "processing";

  return (
    <Modal
      aberto
      onFechar={isBusy ? () => {} : onClose}
      titulo="Nova reuniao"
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* Titulo */}
        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Titulo *
          </label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Daily 2026-04-09"
            disabled={isBusy}
            className="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-medium outline-none disabled:opacity-50 transition-all duration-150"
            style={{
              background: "var(--tf-surface)",
              border: "1.5px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          />
        </div>

        {/* Descricao */}
        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Descricao (opcional)
          </label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Sprint planning, review, etc"
            disabled={isBusy}
            className="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] outline-none disabled:opacity-50 transition-all duration-150"
            style={{
              background: "var(--tf-surface)",
              border: "1.5px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          />
        </div>

        {/* Tabs upload/record */}
        {phase === "idle" && (
          <div
            className="flex rounded-[10px] p-1"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <button
              onClick={() => setTab("upload")}
              className="flex-1 py-2 rounded-[8px] text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-150"
              style={{
                background:
                  tab === "upload" ? "var(--tf-surface)" : "transparent",
                color:
                  tab === "upload"
                    ? "var(--tf-text)"
                    : "var(--tf-text-tertiary)",
                boxShadow:
                  tab === "upload"
                    ? "0 1px 3px rgba(0,0,0,0.06)"
                    : "none",
              }}
            >
              <Upload size={12} />
              Upload
            </button>
            <button
              onClick={() => setTab("record")}
              className="flex-1 py-2 rounded-[8px] text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-150"
              style={{
                background:
                  tab === "record" ? "var(--tf-surface)" : "transparent",
                color:
                  tab === "record"
                    ? "var(--tf-text)"
                    : "var(--tf-text-tertiary)",
                boxShadow:
                  tab === "record"
                    ? "0 1px 3px rgba(0,0,0,0.06)"
                    : "none",
              }}
            >
              <Mic size={12} />
              Gravar
            </button>
          </div>
        )}

        {/* Tab: Upload */}
        {phase === "idle" && tab === "upload" && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="block rounded-[14px] p-8 text-center cursor-pointer transition-all duration-150"
            style={{
              background: dragOver
                ? "var(--tf-accent-light)"
                : "var(--tf-bg-secondary)",
              border: dragOver
                ? "2px dashed var(--tf-accent)"
                : "2px dashed var(--tf-border)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: "var(--tf-surface)" }}
            >
              <Upload
                size={20}
                style={{ color: "var(--tf-text-tertiary)" }}
              />
            </div>
            <p
              className="text-[13px] font-bold"
              style={{ color: "var(--tf-text)" }}
            >
              Clique ou arraste um arquivo
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Max 200 MB &middot; mp3, wav, webm, m4a, mp4, ogg
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
        {phase === "idle" && tab === "record" && (
          <div
            className="rounded-[14px] p-8 text-center"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: "var(--tf-surface)" }}
            >
              <Mic
                size={20}
                style={{ color: "var(--tf-text-tertiary)" }}
              />
            </div>
            <p
              className="text-[13px] font-bold mb-4"
              style={{ color: "var(--tf-text)" }}
            >
              Grave direto do seu microfone
            </p>
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90"
              style={{ background: "var(--tf-accent)" }}
            >
              <Mic size={14} />
              Iniciar gravacao
            </button>
          </div>
        )}

        {/* Gravando */}
        {phase === "recording" && (
          <div
            className="rounded-[14px] p-8 text-center space-y-4"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center animate-pulse"
              style={{ background: "rgba(239, 68, 68, 0.12)" }}
            >
              <Mic size={26} style={{ color: "#ef4444" }} />
            </div>
            <p
              className="text-[24px] font-mono font-bold"
              style={{ color: "var(--tf-text)" }}
            >
              {timeDisplay}
            </p>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90"
              style={{ background: "#ef4444" }}
            >
              <MicOff size={14} />
              Parar gravacao
            </button>
          </div>
        )}

        {/* Preview (ready) */}
        {phase === "ready" && audioUrl && (
          <div
            className="rounded-[14px] p-4 space-y-3"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--tf-success-bg)" }}
              >
                <FileAudio
                  size={14}
                  style={{ color: "var(--tf-success)" }}
                />
              </div>
              <p
                className="text-[12px] font-bold flex-1 truncate"
                style={{ color: "var(--tf-text)" }}
              >
                {audioName}
              </p>
              <button
                onClick={resetAudio}
                className="p-1.5 rounded-[8px] transition-all duration-150 hover:opacity-70"
                style={{ color: "var(--tf-text-tertiary)" }}
                title="Remover audio"
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <div
              className="rounded-[10px] overflow-hidden"
              style={{ background: "var(--tf-surface)" }}
            >
              <audio src={audioUrl} controls className="w-full" />
            </div>
          </div>
        )}

        {/* Status busy */}
        {phase === "uploading" && (
          <div
            className="flex items-center gap-3 p-4 rounded-[12px]"
            style={{ background: "var(--tf-bg-secondary)" }}
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
              Enviando audio...
            </span>
          </div>
        )}
        {phase === "processing" && (
          <div
            className="flex items-center gap-3 p-4 rounded-[12px]"
            style={{ background: "var(--tf-bg-secondary)" }}
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
              Iniciando processamento no worker...
            </span>
          </div>
        )}

        {/* Acoes finais */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 rounded-[10px] text-[12px] font-semibold disabled:opacity-40 transition-all duration-150 hover:opacity-70"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!audioBlob || !titulo.trim() || isBusy}
            className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2 disabled:opacity-40 transition-all duration-150 hover:opacity-90"
            style={{ background: "var(--tf-accent)" }}
          >
            <Check size={14} />
            Enviar
          </button>
        </div>
      </div>
    </Modal>
  );
}
