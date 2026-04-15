"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type RecordingPhase = "idle" | "recording" | "stopped";

export interface RecordingResult {
  blob: Blob;
  url: string;
  mime: string;
  name: string;
  durationMs: number;
}

interface RecordingContextValue {
  phase: RecordingPhase;
  elapsedMs: number;
  workspaceId: string | null;
  titulo: string;
  descricao: string;
  result: RecordingResult | null;

  setMeta: (workspaceId: string, titulo: string, descricao: string) => void;
  setTitulo: (s: string) => void;
  setDescricao: (s: string) => void;

  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<RecordingResult | null>;
  discard: () => void;

  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

const MAX_RECORD_SECONDS = 60 * 60; // 1 hora

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const resolveStopRef = useRef<((r: RecordingResult | null) => void) | null>(
    null
  );

  const cleanupStream = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Limpa tudo ao desmontar (provider no root, só roda no unload da app)
  useEffect(() => {
    return () => {
      cleanupStream();
      if (result?.url) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMeta = useCallback((ws: string, t: string, d: string) => {
    setWorkspaceId(ws);
    setTitulo(t);
    setDescricao(d);
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
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
        const r: RecordingResult = {
          blob,
          url,
          mime: type,
          name: "gravacao.webm",
          durationMs: Date.now() - startRef.current,
        };
        setResult(r);
        setPhase("stopped");
        cleanupStream();
        if (resolveStopRef.current) {
          resolveStopRef.current(r);
          resolveStopRef.current = null;
        }
      };

      startRef.current = Date.now();
      setElapsedMs(0);
      // Limpa resultado anterior
      setResult((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      recorder.start(1000);
      setPhase("recording");

      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startRef.current;
        setElapsedMs(ms);
        if (ms >= MAX_RECORD_SECONDS * 1000 && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 250) as unknown as number;

      return true;
    } catch {
      cleanupStream();
      setPhase("idle");
      return false;
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return null;
    }
    return new Promise<RecordingResult | null>((resolve) => {
      resolveStopRef.current = resolve;
      mediaRecorderRef.current!.stop();
    });
  }, []);

  const discard = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setElapsedMs(0);
    setWorkspaceId(null);
    setTitulo("");
    setDescricao("");
    setPhase("idle");
    cleanupStream();
  }, [result, cleanupStream]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <RecordingContext.Provider
      value={{
        phase,
        elapsedMs,
        workspaceId,
        titulo,
        descricao,
        result,
        setMeta,
        setTitulo,
        setDescricao,
        startRecording,
        stopRecording,
        discard,
        modalOpen,
        openModal,
        closeModal,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx)
    throw new Error("useRecording deve ser usado dentro de RecordingProvider");
  return ctx;
}
