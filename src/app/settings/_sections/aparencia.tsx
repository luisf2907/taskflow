"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Perfil } from "@/types";

// ─── Presets ───
const PRESETS: {
  id: string;
  nome: string;
  cores: Record<string, string>;
}[] = [
  {
    id: "teal",
    nome: "Teal",
    cores: {}, // vazio = padrao do CSS
  },
  {
    id: "indigo",
    nome: "Indigo",
    cores: {
      accent: "#6366F1",
      accentHover: "#4F46E5",
      accentLight: "#EEF2FF",
      accentText: "#4338CA",
      bg: "#EEF2FF",
      bgSecondary: "#E0E7FF",
    },
  },
  {
    id: "rose",
    nome: "Rose",
    cores: {
      accent: "#E11D48",
      accentHover: "#BE123C",
      accentLight: "#FFF1F2",
      accentText: "#9F1239",
      bg: "#FFF1F2",
      bgSecondary: "#FFE4E6",
    },
  },
  {
    id: "amber",
    nome: "Amber",
    cores: {
      accent: "#D97706",
      accentHover: "#B45309",
      accentLight: "#FFFBEB",
      accentText: "#92400E",
      bg: "#FFFBEB",
      bgSecondary: "#FEF3C7",
    },
  },
  {
    id: "slate",
    nome: "Slate",
    cores: {
      accent: "#475569",
      accentHover: "#334155",
      accentLight: "#F1F5F9",
      accentText: "#1E293B",
      bg: "#F1F5F9",
      bgSecondary: "#E2E8F0",
    },
  },
  {
    id: "emerald",
    nome: "Emerald",
    cores: {
      accent: "#059669",
      accentHover: "#047857",
      accentLight: "#ECFDF5",
      accentText: "#065F46",
      bg: "#ECFDF5",
      bgSecondary: "#D1FAE5",
    },
  },
];

interface AparenciaSectionProps {
  perfil?: Perfil | null;
  onUpdate?: () => void;
}

export function AparenciaSection({ perfil, onUpdate }: AparenciaSectionProps) {
  const [tema, setTema] = useState<"light" | "dark">("light");
  const [activePreset, setActivePreset] = useState<string>("teal");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setTema(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  // Detectar preset ativo a partir do perfil
  useEffect(() => {
    if (!perfil?.theme_preferences || Object.keys(perfil.theme_preferences).length === 0) {
      setActivePreset("teal");
      return;
    }
    const accent = perfil.theme_preferences.accent;
    const match = PRESETS.find((p) => p.cores.accent === accent);
    setActivePreset(match?.id || "custom");
  }, [perfil?.theme_preferences]);

  function toggleTema(t: "light" | "dark") {
    setTema(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tema", "escuro");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tema", "claro");
    }
  }

  async function salvarPaleta(cores: Record<string, string> | null) {
    if (!perfil) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("perfis")
        .update({ theme_preferences: cores })
        .eq("id", perfil.id);
      if (error) {
        toast.error("Erro ao salvar paleta");
        return;
      }
      onUpdate?.();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSalvando(false);
    }
  }

  function aplicarPreset(preset: (typeof PRESETS)[number]) {
    setActivePreset(preset.id);
    if (preset.id === "teal") {
      // Reset para padrao
      void salvarPaleta(null);
    } else {
      void salvarPaleta(preset.cores);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Aparencia
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6 space-y-6"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {/* Tema claro/escuro */}
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wide mb-3"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Tema
          </p>
          <div className="flex gap-3">
            {(
              [
                { id: "light" as const, label: "Claro", icon: Sun },
                { id: "dark" as const, label: "Escuro", icon: Moon },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => toggleTema(id)}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150"
                style={{
                  background:
                    tema === id ? "var(--tf-surface)" : "transparent",
                  color:
                    tema === id
                      ? "var(--tf-text)"
                      : "var(--tf-text-tertiary)",
                  border:
                    tema === id
                      ? "1px solid var(--tf-border)"
                      : "1px solid transparent",
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Paleta de cores */}
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wide mb-3"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Paleta de cores
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              const accent = preset.cores.accent || "#00857A";
              const bg = preset.cores.bg || "#E4F0EE";
              return (
                <button
                  key={preset.id}
                  onClick={() => aplicarPreset(preset)}
                  disabled={salvando}
                  className="relative flex flex-col items-center gap-2 py-3 px-2 rounded-[12px] transition-all duration-150 disabled:opacity-50"
                  style={{
                    background: isActive
                      ? "var(--tf-surface)"
                      : "transparent",
                    border: isActive
                      ? "1.5px solid var(--tf-accent)"
                      : "1.5px solid transparent",
                  }}
                >
                  {/* Color swatch */}
                  <div className="flex gap-1">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: accent }}
                    />
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{
                        background: bg,
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{
                      color: isActive
                        ? "var(--tf-text)"
                        : "var(--tf-text-tertiary)",
                    }}
                  >
                    {preset.nome}
                  </span>
                  {isActive && (
                    <div
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Reset */}
          {activePreset !== "teal" && (
            <button
              onClick={() => aplicarPreset(PRESETS[0])}
              disabled={salvando}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <RotateCcw size={11} />
              Resetar para padrao
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
