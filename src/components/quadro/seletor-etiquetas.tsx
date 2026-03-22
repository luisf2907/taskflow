"use client";

import { Etiqueta } from "@/types";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

const CORES_PRESET = [
  "#22C55E", "#16A34A", "#A855F7", "#7C3AED", "#3B82F6",
  "#2563EB", "#06B6D4", "#14B8A6", "#EAB308", "#F97316",
  "#EF4444", "#EC4899", "#78716C", "#475569",
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
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
        Etiquetas
      </p>

      <div className="space-y-0.5">
        {etiquetas.map((etiqueta) => (
          <div key={etiqueta.id} className="flex items-center gap-1.5 group">
            <button
              onClick={() => onToggle(etiqueta.id)}
              className="flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
              style={{ transition: "background 0.15s ease" }}
            >
              <div
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                style={{ backgroundColor: etiqueta.cor }}
              >
                {selecionadas.includes(etiqueta.id) && (
                  <Check size={10} className="text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-[13px]" style={{ color: "var(--tf-text)" }}>
                {etiqueta.nome}
              </span>
            </button>
            {onExcluir && (
              <button
                onClick={() => onExcluir(etiqueta.id)}
                className="p-1 rounded-[4px] opacity-0 group-hover:opacity-100 hover:bg-[var(--tf-danger-bg)]"
                style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease, background 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {criando ? (
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-accent)" }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da etiqueta"
            className="w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
            style={{ color: "var(--tf-text)" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="px-3 pb-3 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {CORES_PRESET.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setNovaCor(cor)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: cor,
                    outline: novaCor === cor ? "2px solid var(--tf-text)" : "none",
                    outlineOffset: "2px",
                    transition: "outline 0.15s ease",
                  }}
                >
                  {novaCor === cor && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCriar}
                className="px-3 py-1 text-[11px] font-semibold text-white rounded-[8px]"
                style={{ background: "var(--tf-accent)" }}
              >
                Criar
              </button>
              <button
                onClick={() => setCriando(false)}
                className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-[8px] w-full hover:bg-[var(--tf-surface-hover)]"
          style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
        >
          <Plus size={13} />
          Criar nova etiqueta
        </button>
      )}
    </div>
  );
}
