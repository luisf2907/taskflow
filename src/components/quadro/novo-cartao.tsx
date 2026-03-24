"use client";

import { Gauge, Plus, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { SeletorPeso } from "./seletor-peso";

interface NovoCartaoProps {
  onCriar: (titulo: string, peso?: number | null) => void;
}

export const NovoCartao = memo(function NovoCartao({ onCriar }: NovoCartaoProps) {
  const [ativo, setAtivo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [peso, setPeso] = useState<number | null>(null);
  const [mostrarPeso, setMostrarPeso] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ativo && inputRef.current) inputRef.current.focus();
  }, [ativo]);

  function handleSubmit() {
    const t = titulo.trim();
    if (!t) return;
    onCriar(t, peso);
    setTitulo("");
    setPeso(null);
    setMostrarPeso(false);
    inputRef.current?.focus();
  }

  function handleCancel() {
    setAtivo(false);
    setTitulo("");
    setPeso(null);
    setMostrarPeso(false);
  }

  if (!ativo) {
    return (
      <button
        onClick={() => setAtivo(true)}
        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[13px] rounded-[8px] transition-smooth"
        style={{ color: "var(--tf-text-tertiary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Plus size={15} />
        Adicionar cartão
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        ref={inputRef}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Título do cartão..."
        className="w-full card-surface px-3 py-2 text-[13px] resize-none outline-none"
        style={{ color: "var(--tf-text)" }}
        rows={3}
        autoFocus
      />

      {/* Peso inline */}
      {mostrarPeso && (
        <div className="px-1 pb-1">
          <SeletorPeso valor={peso} onChange={setPeso} />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs font-semibold text-white rounded-[8px] transition-smooth"
          style={{ background: "var(--tf-accent)" }}
        >
          Adicionar
        </button>

        {/* Toggle story points */}
        <button
          onClick={() => setMostrarPeso(!mostrarPeso)}
          className="p-1.5 rounded-[8px] transition-smooth flex items-center gap-1"
          style={{
            color: peso ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
            background: mostrarPeso ? "var(--tf-surface-hover)" : "transparent",
          }}
          title="Story Points"
        >
          <Gauge size={14} />
          {peso !== null && <span className="text-[11px] font-bold">{peso}</span>}
        </button>

        <button
          onClick={handleCancel}
          className="p-1.5 transition-smooth"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});
