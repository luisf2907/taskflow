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
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ativo && inputRef.current) inputRef.current.focus();
  }, [ativo]);

  async function handleSubmit() {
    const t = titulo.trim();
    if (!t || enviando) return;
    if (t.length > 500) return;
    setEnviando(true);
    try {
      onCriar(t, peso);
      setTitulo("");
      setPeso(null);
      setMostrarPeso(false);
      inputRef.current?.focus();
    } finally {
      setEnviando(false);
    }
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
        className="flex items-center gap-1.5 w-full px-2.5 h-7 text-[0.75rem] transition-colors"
        style={{
          color: "var(--tf-text-tertiary)",
          borderRadius: "var(--tf-radius-xs)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--tf-surface-hover)";
          e.currentTarget.style.color = "var(--tf-text-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--tf-text-tertiary)";
        }}
      >
        <Plus size={13} strokeWidth={1.75} />
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
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Título do cartão..."
        className="w-full px-3 py-2 text-[0.8125rem] resize-none outline-none transition-colors"
        style={{
          color: "var(--tf-text)",
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-accent)",
          borderRadius: "var(--tf-radius-md)",
          letterSpacing: "-0.005em",
        }}
        rows={3}
        maxLength={500}
        autoFocus
      />

      {mostrarPeso && (
        <div className="px-1 pb-1">
          <SeletorPeso valor={peso} onChange={setPeso} />
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={handleSubmit}
          disabled={enviando || !titulo.trim()}
          className="h-7 px-2.5 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--tf-accent)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          {enviando ? "Criando..." : "Adicionar"}
        </button>

        <button
          onClick={() => setMostrarPeso(!mostrarPeso)}
          className="h-7 px-1.5 flex items-center gap-1 text-[0.6875rem] font-medium transition-colors"
          style={{
            color: peso ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
            background: mostrarPeso ? "var(--tf-surface-hover)" : "transparent",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
          title="Story Points"
        >
          <Gauge size={12} strokeWidth={1.75} />
          {peso !== null && <span>{peso}</span>}
        </button>

        <button
          onClick={handleCancel}
          className="ml-auto p-1.5 transition-colors hover:text-[var(--tf-text)]"
          style={{ color: "var(--tf-text-tertiary)" }}
          aria-label="Cancelar"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
});
