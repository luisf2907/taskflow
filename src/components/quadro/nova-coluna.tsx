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
        onClick={() => {
          setAtivo(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        // Largura e snap iguais aos da <Coluna>. Estava 290px fixo e sem
        // snap-start: num container `snap-x snap-mandatory` o navegador so
        // descansa em pontos de snap, entao ao soltar o dedo no fim da
        // lista ele voltava para a ultima coluna e este botao nunca ficava
        // alcancavel no celular.
        className="flex items-center justify-center gap-2 w-[86vw] min-w-[86vw] md:w-[290px] md:min-w-[290px] h-11 text-[0.75rem] font-medium transition-colors shrink-0 snap-start"
        style={{
          border: "1px dashed var(--tf-border-strong)",
          borderRadius: "var(--tf-radius-lg)",
          color: "var(--tf-text-tertiary)",
          fontFamily: "var(--tf-font-mono)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-accent)";
          e.currentTarget.style.color = "var(--tf-accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-border-strong)";
          e.currentTarget.style.color = "var(--tf-text-tertiary)";
        }}
      >
        <Plus size={14} strokeWidth={1.75} />
        Nova coluna
      </button>
    );
  }

  return (
    <div className="w-[86vw] min-w-[86vw] md:w-[290px] md:min-w-[290px] column-surface p-2.5 space-y-2 shrink-0 snap-start">
      <input
        ref={inputRef}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={50}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setAtivo(false);
        }}
        placeholder="Título da lista..."
        className="w-full h-9 px-3 text-[0.8125rem] outline-none transition-colors"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-accent)",
          borderRadius: "var(--tf-radius-sm)",
          color: "var(--tf-text)",
          letterSpacing: "-0.005em",
        }}
      />
      <div className="flex items-center gap-1">
        <button
          onClick={handleSubmit}
          disabled={!nome.trim()}
          className="h-9 md:h-7 px-2.5 text-[0.75rem] font-medium transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--tf-accent)",
            color: "var(--tf-on-accent)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          Adicionar
        </button>
        <button
          onClick={() => {
            setAtivo(false);
            setNome("");
          }}
          className="ml-auto p-1.5 transition-colors hover:text-[var(--tf-text)]"
          style={{ color: "var(--tf-text-tertiary)" }}
          aria-label="Cancelar"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
