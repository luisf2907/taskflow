"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Trash2, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Perfil } from "@/types";

interface VoiceSectionProps {
  perfil: Perfil | null;
  onUpdate: () => void;
}

// Frase pedida pro enrollment — cobre sons variados do portugues (fonemas
// fricativos, nasais, vogais abertas e fechadas) pra gerar um embedding
// representativo.
const ENROLLMENT_PHRASE =
  "Olá, meu nome é _______. Eu estou gravando a minha voz para ser reconhecida nas reuniões do TaskFlow. Hoje o dia está muito bom e eu espero que tudo funcione corretamente.";

const TARGET_SECONDS = 15; // minimo recomendado
const MAX_SECONDS = 45; // corta automaticamente

type RecorderState = "idle" | "recording" | "recorded" | "uploading";

interface HealthStatus {
  ok: boolean;
  reason?: string;
  message?: string;
  status?: string;
  models_loaded?: boolean;
  embedding_model?: string;
}

export function VoiceSection({ perfil, onUpdate }: VoiceSectionProps) {
  // ---------- state ----------
  const [state, setState] = useState<RecorderState>("idle");
  const [consent, setConsent] = useState(Boolean(perfil?.voice_consent_at));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // ---------- refs ----------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // Sync consent quando perfil carrega
  useEffect(() => {
    if (perfil?.voice_consent_at) setConsent(true);
  }, [perfil?.voice_consent_at]);

  // Checa status do worker ao montar
  useEffect(() => {
    let cancelled = false;
    fetch("/api/voice/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled)
          setHealth({ ok: false, reason: "unreachable", message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup quando desmonta
  useEffect(() => {
    return () => {
      stopStreamAndTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- helpers ----------
  function stopStreamAndTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedMs(0);
    setState("idle");
  }, [audioUrl]);

  // ---------- actions ----------
  async function startRecording() {
    if (!consent) {
      toast.error("Aceite o consentimento antes de gravar");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Prefer webm/opus (amplamente suportado e eficiente)
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
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("recorded");
        stopStreamAndTimer();
      };

      startRef.current = Date.now();
      setElapsedMs(0);
      recorder.start();
      setState("recording");

      timerRef.current = window.setInterval(() => {
        const ms = Date.now() - startRef.current;
        setElapsedMs(ms);
        if (ms >= MAX_SECONDS * 1000 && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 100) as unknown as number;
    } catch (err) {
      console.error("getUserMedia error", err);
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Acesso ao microfone negado. Habilite nas configuracoes do navegador."
          : err instanceof Error
            ? err.message
            : "Falha ao acessar microfone";
      toast.error(msg);
      stopStreamAndTimer();
      setState("idle");
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

  async function uploadRecording() {
    if (!audioBlob) return;
    if (!consent) {
      toast.error("Aceite o consentimento");
      return;
    }

    setState("uploading");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "enrollment.webm");
      formData.append("consent", "true");

      const res = await fetch("/api/voice/enroll", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        speech_s?: number;
        duration_s?: number;
      };

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar audio");
        setState("recorded");
        return;
      }

      toast.success(
        `Voz cadastrada! (${data.speech_s?.toFixed(1) ?? "?"}s de fala detectada)`,
      );
      resetRecording();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro de rede");
      setState("recorded");
    }
  }

  async function deleteEnrollment(revokeConsent: boolean) {
    const ok = window.confirm(
      revokeConsent
        ? "Apagar seu embedding de voz E revogar o consentimento?"
        : "Apagar seu embedding de voz? Voce pode gravar outro depois.",
    );
    if (!ok) return;

    try {
      const url = revokeConsent
        ? "/api/voice/enroll?revokeConsent=true"
        : "/api/voice/enroll";
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao remover");
        return;
      }
      toast.success(
        revokeConsent ? "Dados de voz removidos" : "Cadastro removido",
      );
      if (revokeConsent) setConsent(false);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro de rede");
    }
  }

  // ---------- derived ----------
  const enrolled = Boolean(perfil?.voice_enrolled_at);
  const seconds = (elapsedMs / 1000).toFixed(1);
  const progressPct = Math.min(
    100,
    (elapsedMs / (TARGET_SECONDS * 1000)) * 100,
  );
  const canUpload =
    state === "recorded" && elapsedMs >= 5 * 1000 && consent;

  // ---------- render ----------
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Mic size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Voz — reconhecimento em reuniões
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6 space-y-5"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {/* Status atual */}
        {enrolled ? (
          <div
            className="flex items-start gap-3 p-3 rounded-[12px]"
            style={{ background: "var(--tf-surface)" }}
          >
            <Check size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-bold"
                style={{ color: "var(--tf-text)" }}
              >
                Voz cadastrada
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {perfil?.voice_enrolled_at &&
                  `Cadastrada em ${new Date(perfil.voice_enrolled_at).toLocaleString("pt-BR")}`}
              </p>
            </div>
          </div>
        ) : (
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Grave uma amostra da sua voz para que o TaskFlow possa identificar
            você automaticamente nas transcrições de reuniões.
          </p>
        )}

        {/* Health do worker */}
        {health && !health.ok && (
          <div
            className="flex items-start gap-2 p-3 rounded-[12px]"
            style={{ background: "rgba(239, 68, 68, 0.08)" }}
          >
            <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
            <div className="text-[12px]" style={{ color: "#ef4444" }}>
              Worker de voz indisponivel no momento
              {health.message && `: ${health.message}`}
            </div>
          </div>
        )}

        {/* Consentimento LGPD */}
        {!enrolled && (
          <label
            className="flex items-start gap-3 p-3 rounded-[12px] cursor-pointer"
            style={{ background: "var(--tf-surface)" }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: "var(--tf-accent)" }}
              disabled={Boolean(perfil?.voice_consent_at)}
            />
            <span
              className="text-[12px] leading-relaxed"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Aceito que o TaskFlow processe a minha voz para fins de
              identificação em reuniões. O áudio bruto não é armazenado — apenas
              um vetor matemático de ~1 KB que não pode ser convertido de volta
              em som. Posso remover estes dados a qualquer momento.
            </span>
          </label>
        )}

        {/* Frase sugerida */}
        {!enrolled && (
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wide mb-2"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Leia esta frase em voz natural
            </p>
            <blockquote
              className="text-[13px] leading-relaxed italic px-4 py-3 rounded-[12px]"
              style={{
                background: "var(--tf-surface)",
                color: "var(--tf-text-secondary)",
                borderLeft: "3px solid var(--tf-accent)",
              }}
            >
              {ENROLLMENT_PHRASE}
            </blockquote>
          </div>
        )}

        {/* Recorder */}
        {!enrolled && (
          <div className="space-y-3">
            {/* Tempo + barra de progresso */}
            {(state === "recording" || state === "recorded") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[13px] font-mono font-bold"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {seconds}s
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Recomendado: {TARGET_SECONDS}s · Máximo: {MAX_SECONDS}s
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--tf-surface)" }}
                >
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        progressPct >= 100
                          ? "#10b981"
                          : "var(--tf-accent)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            {state === "recorded" && audioUrl && (
              <audio
                src={audioUrl}
                controls
                className="w-full"
                style={{ maxHeight: 40 }}
              />
            )}

            {/* Botoes */}
            <div className="flex flex-wrap gap-2">
              {state === "idle" && (
                <button
                  onClick={startRecording}
                  disabled={!consent || (health ? !health.ok : false)}
                  className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Mic size={14} />
                  Gravar
                </button>
              )}

              {state === "recording" && (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2"
                  style={{ background: "#ef4444" }}
                >
                  <MicOff size={14} />
                  Parar ({seconds}s)
                </button>
              )}

              {state === "recorded" && (
                <>
                  <button
                    onClick={uploadRecording}
                    disabled={!canUpload}
                    className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2 disabled:opacity-40"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    <Check size={14} />
                    Confirmar e enviar
                  </button>
                  <button
                    onClick={resetRecording}
                    className="px-4 py-2 rounded-[10px] text-[12px] font-semibold"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Regravar
                  </button>
                </>
              )}

              {state === "uploading" && (
                <div
                  className="px-4 py-2 rounded-[10px] text-[12px] font-bold flex items-center gap-2"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Enviando...
                </div>
              )}
            </div>

            {state === "recorded" && elapsedMs < 5000 && (
              <p
                className="text-[11px]"
                style={{ color: "#ef4444" }}
              >
                Gravação muito curta ({seconds}s). Mínimo: 5s, recomendado: {TARGET_SECONDS}s.
              </p>
            )}
          </div>
        )}

        {/* Botoes pra quem ja esta enrollado */}
        {enrolled && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                resetRecording();
                // deleta o embedding mantendo o consent, pra permitir regravar
                void deleteEnrollment(false);
              }}
              className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white flex items-center gap-2"
              style={{ background: "var(--tf-accent)" }}
            >
              <Mic size={14} />
              Regravar voz
            </button>
            <button
              onClick={() => deleteEnrollment(true)}
              className="px-4 py-2 rounded-[10px] text-[12px] font-semibold flex items-center gap-2"
              style={{ color: "#ef4444" }}
            >
              <Trash2 size={14} />
              Apagar e revogar consentimento
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
