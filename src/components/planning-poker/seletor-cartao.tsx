"use client";

import { CartaoBacklog } from "@/hooks/use-backlog";
import { Search, Zap } from "lucide-react";
import { useState, useMemo } from "react";

interface SeletorCartaoProps {
  cartoes: CartaoBacklog[];
  carregando: boolean;
  onSelecionar: (cartaoId: string) => void;
}

export function SeletorCartao({ cartoes, carregando, onSelecionar }: SeletorCartaoProps) {
  const [busca, setBusca] = useState("");

  // Priorizar cards sem peso (nao estimados)
  const cartoesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrados = termo
      ? cartoes.filter((c) => c.titulo.toLowerCase().includes(termo))
      : cartoes;

    // Sem peso primeiro, depois com peso
    return [...filtrados].sort((a, b) => {
      if (a.peso === null && b.peso !== null) return -1;
      if (a.peso !== null && b.peso === null) return 1;
      return 0;
    });
  }, [cartoes, busca]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--tf-border)", borderTopColor: "var(--tf-accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--tf-text-secondary)" }}>
        Selecione um card para estimar com o time:
      </p>

      {/* Busca */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--tf-text-tertiary)" }}
        />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar card..."
          className="w-full pl-8 pr-3 py-2 rounded-[var(--tf-radius-xs)] border text-sm"
          style={{
            borderColor: "var(--tf-border)",
            background: "var(--tf-surface)",
            color: "var(--tf-text)",
          }}
        />
      </div>

      {/* Lista de cards */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {cartoesFiltrados.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: "var(--tf-text-tertiary)" }}>
            {busca ? "Nenhum card encontrado" : "Nenhum card no backlog"}
          </p>
        )}

        {cartoesFiltrados.map((cartao) => (
          <button
            key={cartao.id}
            onClick={() => onSelecionar(cartao.id)}
            className="w-full text-left p-3 rounded-[var(--tf-radius-xs)] border transition-smooth cursor-pointer group"
            style={{
              borderColor: "var(--tf-border)",
              background: "var(--tf-surface)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--tf-accent)";
              e.currentTarget.style.background = "var(--tf-bg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--tf-border)";
              e.currentTarget.style.background = "var(--tf-surface)";
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium flex-1 truncate group-hover:underline"
                style={{ color: "var(--tf-text)" }}
              >
                {cartao.titulo}
              </span>

              {cartao.peso !== null && cartao.peso !== undefined ? (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-bold shrink-0"
                  style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
                >
                  <Zap size={10} />
                  {cartao.peso}
                </span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium shrink-0"
                  style={{ background: "var(--tf-accent)", color: "#fff" }}
                >
                  Nao estimado
                </span>
              )}
            </div>

            {cartao.quadro_nome && (
              <span
                className="text-[11px] mt-1 block"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Sprint: {cartao.quadro_nome}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
