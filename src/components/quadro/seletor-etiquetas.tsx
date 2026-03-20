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
      <p className="text-xs font-medium text-[var(--trello-text-subtle)] uppercase tracking-wide">
        Etiquetas
      </p>

      <div className="space-y-1">
        {etiquetas.map((etiqueta) => (
          <div key={etiqueta.id} className="flex items-center gap-2 group">
            <button
              onClick={() => onToggle(etiqueta.id)}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-[3px] hover:bg-[var(--trello-hover)] transition-smooth"
            >
              <div
                className="w-8 h-5 rounded-sm shrink-0"
                style={{ backgroundColor: etiqueta.cor }}
              />
              <span className="text-sm text-[var(--trello-text)] flex-1 text-left">
                {etiqueta.nome}
              </span>
              {selecionadas.includes(etiqueta.id) && (
                <Check size={14} className="text-[#0C66E4]" />
              )}
            </button>
            {onExcluir && (
              <button
                onClick={() => onExcluir(etiqueta.id)}
                className="p-1 rounded-[3px] text-[var(--trello-text-subtle)] opacity-0 group-hover:opacity-100 hover:text-[#C9372C] transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {criando ? (
        <div
          className="space-y-2 p-2 rounded-[3px]"
          style={{ background: "var(--trello-surface)" }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da etiqueta"
            className="w-full px-2 py-1.5 text-sm rounded-[3px] outline-none focus:ring-2 focus:ring-[var(--trello-blue)] text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="flex flex-wrap gap-1.5">
            {CORES_PRESET.map((cor) => (
              <button
                key={cor}
                onClick={() => setNovaCor(cor)}
                className={`w-6 h-6 rounded-sm transition-all ${
                  novaCor === cor ? "ring-2 ring-offset-1 ring-[var(--trello-navy)] scale-110" : ""
                }`}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCriar}
              className="px-3 py-1 text-xs font-medium bg-[#0C66E4] text-white rounded-[3px] hover:bg-[#0055CC] transition-smooth"
            >
              Criar
            </button>
            <button
              onClick={() => setCriando(false)}
              className="px-3 py-1 text-xs text-[var(--trello-text-subtle)] hover:text-[var(--trello-text)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--trello-text-subtle)] hover:text-[#0C66E4] hover:bg-[var(--trello-hover)] rounded-[3px] w-full transition-smooth"
        >
          <Plus size={14} />
          Criar nova etiqueta
        </button>
      )}
    </div>
  );
}
