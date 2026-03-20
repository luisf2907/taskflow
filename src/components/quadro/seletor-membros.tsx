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

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--trello-text-subtle)] uppercase tracking-wide">
        Membros
      </p>

      <div className="space-y-1">
        {membros.map((membro) => (
          <button
            key={membro.id}
            onClick={() => onToggle(membro.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] hover:bg-[var(--trello-hover)] w-full transition-smooth"
          >
            <Avatar membro={membro} tamanho="sm" />
            <div className="flex-1 text-left">
              <span className="text-sm text-[var(--trello-text)]">
                {membro.nome}
              </span>
              {membro.email && (
                <span className="text-xs text-[var(--trello-text-subtle)] ml-1.5">
                  {membro.email}
                </span>
              )}
            </div>
            {selecionados.includes(membro.id) && (
              <Check size={14} className="text-[#0C66E4]" />
            )}
          </button>
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
            placeholder="Nome do membro"
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
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="Email (opcional)"
            className="w-full px-2 py-1.5 text-sm rounded-[3px] outline-none focus:ring-2 focus:ring-[var(--trello-blue)] text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCriar}
              className="px-3 py-1 text-xs font-medium bg-[#0C66E4] text-white rounded-[3px] hover:bg-[#0055CC] transition-smooth"
            >
              Adicionar
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
          <UserPlus size={14} />
          Adicionar membro ao quadro
        </button>
      )}
    </div>
  );
}
