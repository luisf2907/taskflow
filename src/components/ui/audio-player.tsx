"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  /** Nome exibido acima do player (ex: "gravacao.webm"). Se omitido, só mostra o controle. */
  label?: string;
  /** Cor do botão play/progress (default: var(--tf-accent)). */
  accentColor?: string;
}

function formatTime(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "0:00";
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Player de áudio custom coerente com o design system do Taskflow.
 * Substitui o `<audio controls>` nativo (visual do browser).
 */
export function AudioPlayer({ src, label, accentColor = "var(--tf-accent)" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => {
      const d = audio.duration;
      if (Number.isFinite(d)) setDurationMs(d * 1000);
    };
    const onEnded = () => setPlaying(false);
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
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  }, [playing]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = seekRef.current;
      if (!audio || !bar || !durationMs) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = (durationMs * pct) / 1000;
    },
    [durationMs]
  );

  const progressPct = durationMs > 0 ? (currentMs / durationMs) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      {label && (
        <div className="flex items-center gap-2">
          <Volume2
            size={12}
            strokeWidth={1.75}
            style={{ color: "var(--tf-text-tertiary)" }}
          />
          <span
            className="text-[0.6875rem] truncate flex-1"
            style={{
              color: "var(--tf-text-secondary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            {label}
          </span>
        </div>
      )}

      <div
        className="flex items-center gap-2.5 h-9 px-2.5"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Tocar"}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 transition-colors hover:brightness-110"
          style={{
            background: accentColor,
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          {playing ? (
            <Pause size={11} className="text-white" fill="white" />
          ) : (
            <Play size={11} className="text-white" fill="white" />
          )}
        </button>

        {/* Current time */}
        <span
          className="text-[0.625rem] min-w-[32px] text-right"
          style={{
            color: "var(--tf-text)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          {formatTime(currentMs)}
        </span>

        {/* Seek bar */}
        <div
          ref={seekRef}
          onClick={seek}
          className="flex-1 h-[3px] cursor-pointer relative group"
          style={{
            background: "var(--tf-border)",
            borderRadius: "1px",
          }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-100"
            style={{
              width: `${progressPct}%`,
              background: accentColor,
              borderRadius: "1px",
            }}
          />
          {/* Thumb quadrado */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${progressPct}% - 4px)`,
              background: accentColor,
              borderRadius: "1px",
            }}
          />
        </div>

        {/* Duration */}
        <span
          className="text-[0.625rem] min-w-[32px]"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          {formatTime(durationMs)}
        </span>
      </div>
    </div>
  );
}
