"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

interface NovaColunaProps {
  onCriar: (nome: string) => void;
}

export function NovaColuna({ onCriar }: NovaColunaProps) {
  const [ativo, setAtivo] = useState(false);
  const [nome, setNome] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const n = nome.trim();
    if (!n) return;
    onCriar(n);
    setNome("");
    inputRef.current?.focus();
  }

  if (!ativo) {
    return (
      <button
        onClick={() => { setAtivo(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 w-[272px] min-w-[272px] px-4 py-3 text-[13px] font-medium rounded-xl transition-smooth shrink-0 border-2 border-dashed"
        style={{
          borderColor: "var(--tf-border)",
          color: "var(--tf-text-tertiary)",
        }}
      >
        <Plus size={16} />
        Adicionar lista
      </button>
    );
  }

  return (
    <div className="w-[272px] min-w-[272px] column-surface p-2.5 space-y-2 shrink-0">
      <input
        ref={inputRef}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setAtivo(false);
        }}
        placeholder="Título da lista..."
        className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
        style={{
          background: "var(--tf-surface)",
          border: "2px solid var(--tf-accent)",
          color: "var(--tf-text)",
        }}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-smooth"
          style={{ background: "var(--tf-accent)" }}
        >
          Adicionar
        </button>
        <button
          onClick={() => { setAtivo(false); setNome(""); }}
          className="p-1.5 transition-smooth"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
