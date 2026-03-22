"use client";

import { Membro } from "@/types";
import { Check, Plus, UserPlus, X } from "lucide-react";
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

  const semMembros = membros.length === 0;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
        Membros
      </p>

      {semMembros && !criando && (
        <div className="text-center py-4">
          <UserPlus size={20} className="mx-auto mb-2 opacity-20" style={{ color: "var(--tf-text-tertiary)" }} />
          <p className="text-[11px] mb-3" style={{ color: "var(--tf-text-tertiary)" }}>
            Nenhum membro criado ainda.
          </p>
          <button
            onClick={() => setCriando(true)}
            className="px-4 py-1.5 text-[11px] font-semibold text-white rounded-[8px]"
            style={{ background: "var(--tf-accent)" }}
          >
            Criar primeiro membro
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {membros.map((membro) => {
          const selecionado = selecionados.includes(membro.id);
          return (
            <button
              key={membro.id}
              onClick={() => onToggle(membro.id)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] w-full hover:bg-[var(--tf-surface-hover)]"
              style={{ transition: "background 0.15s ease" }}
            >
              <div className="relative shrink-0">
                <Avatar membro={membro} tamanho="sm" />
                {selecionado && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    <Check size={8} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="text-[13px] font-medium block truncate" style={{ color: "var(--tf-text)" }}>
                  {membro.nome}
                </span>
                {membro.email && (
                  <span className="text-[10px] block truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                    {membro.email}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {criando ? (
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-accent)" }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do membro"
            className="w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
            style={{ color: "var(--tf-text)" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="border-t" style={{ borderColor: "var(--tf-border-subtle)" }}>
            <input
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
              style={{ color: "var(--tf-text)" }}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
            />
          </div>
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <button
              onClick={handleCriar}
              className="px-3 py-1 text-[11px] font-semibold text-white rounded-[8px]"
              style={{ background: "var(--tf-accent)" }}
            >
              Adicionar
            </button>
            <button
              onClick={() => { setCriando(false); setNovoNome(""); setNovoEmail(""); }}
              className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
              style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        !semMembros && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-[8px] w-full hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
          >
            <Plus size={13} />
            Adicionar membro
          </button>
        )
      )}
    </div>
  );
}
