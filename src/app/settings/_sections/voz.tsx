"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  AudioLines,
  Quote,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
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
  "Ola, meu nome e _______. Eu estou gravando a minha voz para ser reconhecida nas reunioes do TaskFlow. Hoje o dia esta muito bom e eu espero que tudo funcione corretamente.";

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
  const [deleting, setDeleting] = useState(false);

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

    setDeleting(true);
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
    } finally {
      setDeleting(false);
    }
  }

  // ---------- derived ----------
  const enrolled = Boolean(perfil?.voice_enrolled_at);
  const elapsedSec = elapsedMs / 1000;
  const seconds = elapsedSec.toFixed(1);
  const progressPct = Math.min(
    100,
    (elapsedMs / (TARGET_SECONDS * 1000)) * 100,
  );
  const canUpload =
    state === "recorded" && elapsedMs >= 5 * 1000 && consent;

  // ---------- render ----------
  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <AudioLines size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Voz &mdash; reconhecimento em reunioes
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6 space-y-5"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {/* ─── Worker health alert ─── */}
        {health && !health.ok && (
          <div
            className="flex items-start gap-3 p-3 rounded-[12px]"
            style={{
              background: "var(--tf-danger-bg)",
              border: "1px solid color-mix(in srgb, var(--tf-danger) 20%, transparent)",
            }}
          >
            <AlertCircle
              size={14}
              style={{ color: "var(--tf-danger)", flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <p
                className="text-[12px] font-bold"
                style={{ color: "var(--tf-danger)" }}
              >
                Worker de voz indisponivel
              </p>
              {health.message && (
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {health.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── ENROLLED STATE ─── */}
        {enrolled ? (
          <div className="space-y-4">
            {/* Status card - matches GithubSection "Conta conectada" pattern */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--tf-success-bg)" }}
              >
                <Check size={16} style={{ color: "var(--tf-success)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--tf-text)" }}
                >
                  Voz cadastrada
                </p>
                {perfil?.voice_enrolled_at && (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Cadastrada em{" "}
                    {new Date(perfil.voice_enrolled_at).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "long", year: "numeric" },
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  resetRecording();
                  void deleteEnrollment(false);
                }}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--tf-accent)" }}
              >
                {deleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RotateCcw size={13} />
                )}
                Regravar voz
              </button>
              <button
                onClick={() => deleteEnrollment(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
                style={{
                  color: "var(--tf-danger)",
                  background: "var(--tf-danger-bg)",
                }}
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Apagar e revogar
              </button>
            </div>
          </div>
        ) : (
          /* ─── NOT ENROLLED STATE ─── */
          <div className="space-y-5">
            {/* Description */}
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Grave uma amostra da sua voz para que o TaskFlow possa identificar
              voce automaticamente nas transcricoes de reunioes.
            </p>

            {/* Step 1: LGPD Consent */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={12}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  1. Consentimento
                </p>
              </div>
              <label
                className="flex items-start gap-3 p-3.5 rounded-[12px] cursor-pointer transition-all duration-150"
                style={{
                  background: "var(--tf-surface)",
                  border: consent
                    ? "1.5px solid var(--tf-accent)"
                    : "1.5px solid var(--tf-border)",
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: "var(--tf-accent)" }}
                  disabled={Boolean(perfil?.voice_consent_at)}
                />
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Aceito que o TaskFlow processe a minha voz para fins de
                  identificacao em reunioes. O audio bruto nao e armazenado
                  &mdash; apenas um vetor matematico de ~1 KB que nao pode ser
                  convertido de volta em som. Posso remover estes dados a
                  qualquer momento.
                </span>
              </label>
            </div>

            {/* Step 2: Suggested phrase */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Quote
                  size={12}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  2. Leia esta frase em voz natural
                </p>
              </div>
              <div
                className="px-4 py-3.5 rounded-[12px]"
                style={{
                  background: "var(--tf-surface)",
                }}
              >
                <p
                  className="text-[13px] leading-relaxed italic"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  &ldquo;{ENROLLMENT_PHRASE}&rdquo;
                </p>
              </div>
            </div>

            {/* Step 3: Recorder */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic
                  size={12}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  3. Gravar
                </p>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: "var(--tf-surface)" }}
              >
                {/* ─ Idle: start button ─ */}
                {state === "idle" && (
                  <div className="text-center py-2">
                    <button
                      onClick={startRecording}
                      disabled={
                        !consent || (health ? !health.ok : false)
                      }
                      className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-40"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      <Mic size={14} />
                      Iniciar gravacao
                    </button>
                    {!consent && (
                      <p
                        className="text-[11px] mt-2.5"
                        style={{ color: "var(--tf-text-tertiary)" }}
                      >
                        Aceite o consentimento acima para gravar
                      </p>
                    )}
                  </div>
                )}

                {/* ─ Recording: pulsing indicator + timer + stop ─ */}
                {state === "recording" && (
                  <div className="text-center space-y-4 py-2">
                    <div
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center animate-pulse"
                      style={{ background: "rgba(239, 68, 68, 0.12)" }}
                    >
                      <Mic size={22} style={{ color: "#ef4444" }} />
                    </div>
                    <div>
                      <p
                        className="text-[20px] font-mono font-bold"
                        style={{ color: "var(--tf-text)" }}
                      >
                        {seconds}s
                      </p>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "var(--tf-text-tertiary)" }}
                      >
                        Recomendado: {TARGET_SECONDS}s &middot; Maximo:{" "}
                        {MAX_SECONDS}s
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden mx-auto max-w-[280px]"
                      style={{ background: "var(--tf-bg-secondary)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                          width: `${progressPct}%`,
                          background:
                            progressPct >= 100
                              ? "var(--tf-success)"
                              : "var(--tf-accent)",
                        }}
                      />
                    </div>
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90"
                      style={{ background: "#ef4444" }}
                    >
                      <MicOff size={14} />
                      Parar
                    </button>
                  </div>
                )}

                {/* ─ Recorded: preview + actions ─ */}
                {state === "recorded" && audioUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            elapsedSec >= 5
                              ? "var(--tf-success-bg)"
                              : "var(--tf-danger-bg)",
                        }}
                      >
                        {elapsedSec >= 5 ? (
                          <Check
                            size={14}
                            style={{ color: "var(--tf-success)" }}
                          />
                        ) : (
                          <AlertCircle
                            size={14}
                            style={{ color: "var(--tf-danger)" }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--tf-text)" }}
                        >
                          {seconds}s gravados
                        </p>
                        <p
                          className="text-[11px]"
                          style={{
                            color:
                              elapsedSec >= 5
                                ? "var(--tf-text-tertiary)"
                                : "var(--tf-danger)",
                          }}
                        >
                          {elapsedSec < 5
                            ? `Muito curto. Minimo: 5s, recomendado: ${TARGET_SECONDS}s`
                            : elapsedSec < TARGET_SECONDS
                              ? `Funcional, mas recomendado: ${TARGET_SECONDS}s`
                              : "Duracao ideal"}
                        </p>
                      </div>
                    </div>

                    {/* Audio player */}
                    <div
                      className="rounded-[10px] overflow-hidden"
                      style={{ background: "var(--tf-bg-secondary)" }}
                    >
                      <audio
                        src={audioUrl}
                        controls
                        className="w-full"
                        style={{ height: 40 }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={uploadRecording}
                        disabled={!canUpload}
                        className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-40"
                        style={{ background: "var(--tf-accent)" }}
                      >
                        <Check size={14} />
                        Confirmar e enviar
                      </button>
                      <button
                        onClick={resetRecording}
                        className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all duration-150 hover:opacity-80"
                        style={{ color: "var(--tf-text-tertiary)" }}
                      >
                        <RotateCcw size={12} />
                        Regravar
                      </button>
                    </div>
                  </div>
                )}

                {/* ─ Uploading ─ */}
                {state === "uploading" && (
                  <div className="flex items-center justify-center gap-2.5 py-4">
                    <Loader2
                      size={16}
                      className="animate-spin"
                      style={{ color: "var(--tf-accent)" }}
                    />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      Enviando amostra de voz...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
