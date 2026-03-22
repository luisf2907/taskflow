"use client";

import { Plus, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

interface NovoCartaoProps {
  onCriar: (titulo: string) => void;
}

export const NovoCartao = memo(function NovoCartao({ onCriar }: NovoCartaoProps) {
  const [ativo, setAtivo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ativo && inputRef.current) inputRef.current.focus();
  }, [ativo]);

  function handleSubmit() {
    const t = titulo.trim();
    if (!t) return;
    onCriar(t);
    setTitulo("");
    inputRef.current?.focus();
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
          if (e.key === "Escape") setAtivo(false);
        }}
        placeholder="Título do cartão..."
        className="w-full card-surface px-3 py-2 text-[13px] resize-none outline-none"
        style={{ color: "var(--tf-text)" }}
        rows={3}
        autoFocus
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs font-semibold text-white rounded-[8px] transition-smooth"
          style={{ background: "var(--tf-accent)" }}
        >
          Adicionar
        </button>
        <button
          onClick={() => { setAtivo(false); setTitulo(""); }}
          className="p-1.5 transition-smooth"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});
