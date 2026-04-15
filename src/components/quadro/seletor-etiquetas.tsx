"use client";

import { Etiqueta } from "@/types";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

const CORES_PRESET = [
  "#22C55E",
  "#16A34A",
  "#A855F7",
  "#7C3AED",
  "#3B82F6",
  "#2563EB",
  "#06B6D4",
  "#14B8A6",
  "#EAB308",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#78716C",
  "#475569",
];

interface SeletorEtiquetasProps {
  etiquetas: Etiqueta[];
  selecionadas: string[];
  onToggle: (etiquetaId: string) => void;
  onCriar: (nome: string, cor: string) => void;
  onExcluir?: (id: string) => void;
}

export function SeletorEtiquetas({
  etiquetas,
  selecionadas,
  onToggle,
  onCriar,
  onExcluir,
}: SeletorEtiquetasProps) {
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_PRESET[0]);

  function handleCriar() {
    if (!novoNome.trim()) return;
    onCriar(novoNome.trim(), novaCor);
    setNovoNome("");
    setNovaCor(CORES_PRESET[0]);
    setCriando(false);
  }

  return (
    <div className="space-y-2">
      <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
        Etiquetas
      </p>

      <div className="space-y-0.5">
        {etiquetas.map((etiqueta) => {
          const selecionada = selecionadas.includes(etiqueta.id);
          return (
            <div key={etiqueta.id} className="flex items-center gap-1 group">
              <button
                onClick={() => onToggle(etiqueta.id)}
                className="flex-1 flex items-center gap-2.5 px-2 h-7 transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{ borderRadius: "var(--tf-radius-xs)" }}
              >
                <div
                  className="w-4 h-4 shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: selecionada ? etiqueta.cor : "transparent",
                    border: `1px solid ${etiqueta.cor}`,
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                >
                  {selecionada && (
                    <Check size={9} className="text-white" strokeWidth={3} />
                  )}
                </div>
                <span
                  className="text-[0.8125rem]"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
                >
                  {etiqueta.nome}
                </span>
              </button>
              {onExcluir && (
                <button
                  onClick={() => onExcluir(etiqueta.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  aria-label={`Excluir etiqueta ${etiqueta.nome}`}
                >
                  <X size={10} strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {criando ? (
        <div
          className="p-2.5 space-y-2"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-sm)",
          }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da etiqueta"
            maxLength={30}
            className="w-full h-8 px-2.5 text-[0.8125rem] outline-none"
            style={{
              color: "var(--tf-text)",
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="flex flex-wrap gap-1">
            {CORES_PRESET.map((cor) => (
              <button
                key={cor}
                onClick={() => setNovaCor(cor)}
                className="w-5 h-5 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: cor,
                  borderRadius: "var(--tf-radius-xs)",
                  outline:
                    novaCor === cor ? "2px solid var(--tf-text)" : "2px solid transparent",
                  outlineOffset: "1px",
                }}
              >
                {novaCor === cor && (
                  <Check size={9} className="text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCriar}
              disabled={!novoNome.trim()}
              className="h-7 px-2.5 text-[0.6875rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              Criar
            </button>
            <button
              onClick={() => setCriando(false)}
              className="ml-auto p-1.5 transition-colors hover:text-[var(--tf-text)]"
              style={{ color: "var(--tf-text-tertiary)" }}
              aria-label="Cancelar"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 px-2 h-7 text-[0.75rem] transition-colors w-full hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Criar nova etiqueta
        </button>
      )}
    </div>
  );
}
