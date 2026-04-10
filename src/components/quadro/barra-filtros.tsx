"use client";

import { Etiqueta, Membro } from "@/types";
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./avatar";

export interface Filtros {
  texto: string;
  etiquetaIds: string[];
  membroIds: string[];
}

interface BarraFiltrosProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  etiquetas: Etiqueta[];
  membros: Membro[];
}

export function BarraFiltros({ filtros, onChange, etiquetas, membros }: BarraFiltrosProps) {
  const [expandido, setExpandido] = useState(false);

  const totalAtivos =
    (filtros.texto ? 1 : 0) +
    filtros.etiquetaIds.length +
    filtros.membroIds.length;

  function limpar() {
    onChange({ texto: "", etiquetaIds: [], membroIds: [] });
  }

  function toggleEtiqueta(id: string) {
    const ids = filtros.etiquetaIds.includes(id)
      ? filtros.etiquetaIds.filter((e) => e !== id)
      : [...filtros.etiquetaIds, id];
    onChange({ ...filtros, etiquetaIds: ids });
  }

  function toggleMembro(id: string) {
    const ids = filtros.membroIds.includes(id)
      ? filtros.membroIds.filter((m) => m !== id)
      : [...filtros.membroIds, id];
    onChange({ ...filtros, membroIds: ids });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--tf-text-tertiary)" }} />
        <input
          value={filtros.texto}
          onChange={(e) => onChange({ ...filtros, texto: e.target.value })}
          placeholder="Buscar..."
          className="pl-8 pr-3 py-1.5 text-[13px] rounded-[8px] outline-none w-44 transition-smooth"
          style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
        />
      </div>

      {/* Toggle filtros */}
      <button
        onClick={() => setExpandido(!expandido)}
        aria-expanded={expandido}
        aria-label="Filtros"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-[8px] transition-smooth"
        style={{
          background: expandido || totalAtivos > 0 ? "var(--tf-accent-light)" : "var(--tf-surface)",
          color: expandido || totalAtivos > 0 ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
          border: "1px solid var(--tf-border)",
        }}
      >
        <Filter size={14} />
        Filtros
        {totalAtivos > 0 && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--tf-accent)" }}>
            {totalAtivos}
          </span>
        )}
      </button>

      {/* Limpar */}
      {totalAtivos > 0 && (
        <button
          onClick={limpar}
          className="flex items-center gap-1 px-2 py-1.5 text-[12px] rounded-[8px] transition-smooth"
          style={{ color: "var(--tf-danger)" }}
        >
          <X size={12} /> Limpar
        </button>
      )}

      {/* Painel expandido */}
      {expandido && (
        <div
          className="absolute top-full left-0 right-0 mt-2 p-4 rounded-[14px] border z-40 flex gap-6"
          style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
        >
          {/* Etiquetas */}
          {etiquetas.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>Etiquetas</p>
              <div className="flex flex-wrap gap-1.5">
                {etiquetas.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => toggleEtiqueta(e.id)}
                    className="px-2.5 py-1 rounded-[8px] text-[11px] font-bold text-white transition-smooth"
                    style={{
                      backgroundColor: e.cor,
                      opacity: filtros.etiquetaIds.length === 0 || filtros.etiquetaIds.includes(e.id) ? 1 : 0.35,
                      outline: filtros.etiquetaIds.includes(e.id) ? "2px solid var(--tf-text)" : "none",
                      outlineOffset: "1px",
                    }}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Membros */}
          {membros.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>Membros</p>
              <div className="flex flex-wrap gap-2">
                {membros.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMembro(m.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] transition-smooth"
                    style={{
                      background: filtros.membroIds.includes(m.id) ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
                      opacity: filtros.membroIds.length === 0 || filtros.membroIds.includes(m.id) ? 1 : 0.5,
                    }}
                  >
                    <Avatar membro={m} tamanho="sm" />
                    <span className="text-[12px] font-medium" style={{ color: "var(--tf-text)" }}>{m.nome.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
