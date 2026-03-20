"use client";

import { Membro } from "@/types";
import { Check, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./avatar";

interface SeletorMembrosProps {
  membros: Membro[];
  selecionados: string[];
  onToggle: (membroId: string) => void;
  onCriar: (nome: string, email?: string) => void;
}

export function SeletorMembros({
  membros,
  selecionados,
  onToggle,
  onCriar,
}: SeletorMembrosProps) {
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  function handleCriar() {
    if (!novoNome.trim()) return;
    onCriar(novoNome.trim(), novoEmail.trim() || undefined);
    setNovoNome("");
    setNovoEmail("");
    setCriando(false);
  }

  // Se não tem membros, abrir form de criar automaticamente
  const semMembros = membros.length === 0;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tf-text-tertiary)" }}>
        Membros
      </p>

      {semMembros && !criando && (
        <div className="text-center py-3">
          <p className="text-[12px] mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
            Nenhum membro criado ainda.
          </p>
          <button
            onClick={() => setCriando(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-smooth"
            style={{ background: "var(--tf-accent)" }}
          >
            Criar primeiro membro
          </button>
        </div>
      )}

      <div className="space-y-1">
        {membros.map((membro) => (
          <button
            key={membro.id}
            onClick={() => onToggle(membro.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-full transition-smooth"
            style={{ color: "var(--tf-text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Avatar membro={membro} tamanho="sm" />
            <div className="flex-1 text-left">
              <span className="text-sm">{membro.nome}</span>
              {membro.email && (
                <span className="text-xs ml-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
                  {membro.email}
                </span>
              )}
            </div>
            {selecionados.includes(membro.id) && (
              <Check size={14} style={{ color: "var(--tf-accent)" }} />
            )}
          </button>
        ))}
      </div>

      {criando ? (
        <div className="space-y-2 p-3 rounded-lg" style={{ background: "var(--tf-bg-secondary)" }}>
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do membro"
            className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
            style={{
              background: "var(--tf-surface)",
              border: "2px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="Email (opcional)"
            className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
            style={{
              background: "var(--tf-surface)",
              border: "2px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCriar}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-smooth"
              style={{ background: "var(--tf-accent)" }}
            >
              Adicionar
            </button>
            <button
              onClick={() => setCriando(false)}
              className="px-3 py-1.5 text-xs rounded-lg transition-smooth"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        !semMembros && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg w-full transition-smooth"
            style={{ color: "var(--tf-text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--tf-accent)"; e.currentTarget.style.background = "var(--tf-bg-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--tf-text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
          >
            <UserPlus size={14} />
            Adicionar membro
          </button>
        )
      )}
    </div>
  );
}
