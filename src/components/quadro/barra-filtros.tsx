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

export function BarraFiltros({
  filtros,
  onChange,
  etiquetas,
  membros,
}: BarraFiltrosProps) {
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
    <div className="relative flex items-center gap-1.5">
      {/* Busca */}
      <div className="relative">
        <Search
          size={12}
          strokeWidth={1.75}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--tf-text-tertiary)" }}
        />
        <input
          value={filtros.texto}
          onChange={(e) => onChange({ ...filtros, texto: e.target.value })}
          placeholder="Buscar…"
          className="filtro-input pl-7 pr-3 h-7 text-[0.75rem] outline-none w-44"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.005em",
            borderRadius: "var(--tf-radius-xs)",
          }}
        />
        <style jsx>{`
          .filtro-input {
            background: var(--tf-surface);
            border: 1px solid var(--tf-border);
            transition: border-color 0.15s ease;
          }
          .filtro-input:focus {
            border-color: var(--tf-accent);
          }
        `}</style>
      </div>

      {/* Toggle filtros */}
      <button
        onClick={() => setExpandido(!expandido)}
        aria-expanded={expandido}
        aria-label="Filtros"
        className="flex items-center gap-1.5 h-7 px-2.5 text-[0.75rem] font-medium transition-colors"
        style={{
          background:
            expandido || totalAtivos > 0 ? "var(--tf-accent-light)" : "transparent",
          color:
            expandido || totalAtivos > 0
              ? "var(--tf-accent-text)"
              : "var(--tf-text-secondary)",
          border: `1px solid ${
            expandido || totalAtivos > 0 ? "var(--tf-accent)" : "var(--tf-border)"
          }`,
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        <Filter size={12} strokeWidth={1.75} />
        Filtros
        {totalAtivos > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[0.625rem] font-medium text-white"
            style={{
              background: "var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {totalAtivos}
          </span>
        )}
      </button>

      {/* Limpar */}
      {totalAtivos > 0 && (
        <button
          onClick={limpar}
          className="flex items-center gap-1 h-7 px-2 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-danger-bg)]"
          style={{
            color: "var(--tf-danger)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <X size={11} strokeWidth={1.75} /> Limpar
        </button>
      )}

      {/* Painel expandido */}
      {expandido && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 p-3.5 border z-40 flex gap-5"
          style={{
            background: "var(--tf-surface-raised)",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
            boxShadow: "var(--tf-shadow-md)",
          }}
        >
          {/* Etiquetas */}
          {etiquetas.length > 0 && (
            <div>
              <p
                className="label-mono mb-2"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Etiquetas
              </p>
              <div className="flex flex-wrap gap-1">
                {etiquetas.map((e) => {
                  const ativa = filtros.etiquetaIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEtiqueta(e.id)}
                      className="h-[22px] px-2 text-[0.6875rem] font-medium text-white transition-all"
                      style={{
                        backgroundColor: e.cor,
                        borderRadius: "var(--tf-radius-xs)",
                        opacity:
                          filtros.etiquetaIds.length === 0 || ativa ? 1 : 0.35,
                        outline: ativa
                          ? "2px solid var(--tf-text)"
                          : "2px solid transparent",
                        outlineOffset: "1px",
                      }}
                    >
                      {e.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Membros */}
          {membros.length > 0 && (
            <div>
              <p
                className="label-mono mb-2"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Membros
              </p>
              <div className="flex flex-wrap gap-1">
                {membros.map((m) => {
                  const ativo = filtros.membroIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMembro(m.id)}
                      className="flex items-center gap-1.5 h-7 pl-1 pr-2 transition-colors"
                      style={{
                        background: ativo ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
                        border: `1px solid ${ativo ? "var(--tf-accent)" : "var(--tf-border)"}`,
                        borderRadius: "var(--tf-radius-xs)",
                        opacity: filtros.membroIds.length === 0 || ativo ? 1 : 0.5,
                      }}
                    >
                      <Avatar membro={m} tamanho="sm" />
                      <span
                        className="text-[0.6875rem] font-medium"
                        style={{
                          color: ativo ? "var(--tf-accent-text)" : "var(--tf-text)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {m.nome.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
