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
      <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
        Membros
      </p>

      {semMembros && !criando && (
        <div className="text-center py-4">
          <UserPlus
            size={18}
            strokeWidth={1.5}
            className="mx-auto mb-2"
            style={{ color: "var(--tf-border-strong)" }}
          />
          <p
            className="text-[0.6875rem] mb-3"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            Nenhum membro criado ainda
          </p>
          <button
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1.5 h-7 px-3 text-[0.6875rem] font-medium text-white transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
            }}
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
              className="flex items-center gap-2.5 px-2 h-9 w-full transition-colors hover:bg-[var(--tf-surface-hover)]"
              style={{
                borderRadius: "var(--tf-radius-xs)",
                background: selecionado ? "var(--tf-accent-light)" : "transparent",
              }}
            >
              <div className="relative shrink-0">
                <Avatar membro={membro} tamanho="sm" />
                {selecionado && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 flex items-center justify-center"
                    style={{
                      background: "var(--tf-accent)",
                      border: "1.5px solid var(--tf-surface)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    <Check size={7} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <span
                  className="text-[0.8125rem] font-medium block truncate"
                  style={{
                    color: selecionado ? "var(--tf-accent-text)" : "var(--tf-text)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {membro.nome}
                </span>
                {membro.email && (
                  <span
                    className="text-[0.625rem] block truncate"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.01em",
                    }}
                  >
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
          className="p-2 space-y-1.5"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-sm)",
          }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do membro"
            className="w-full h-8 px-2.5 text-[0.8125rem] outline-none"
            style={{
              color: "var(--tf-text)",
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <input
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="Email (opcional)"
            className="w-full h-8 px-2.5 text-[0.8125rem] outline-none"
            style={{
              color: "var(--tf-text)",
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
              fontFamily: "var(--tf-font-mono)",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleCriar}
              disabled={!novoNome.trim()}
              className="h-7 px-2.5 text-[0.6875rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setCriando(false);
                setNovoNome("");
                setNovoEmail("");
              }}
              className="ml-auto p-1.5 transition-colors hover:text-[var(--tf-text)]"
              style={{ color: "var(--tf-text-tertiary)" }}
              aria-label="Cancelar"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        !semMembros && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-2 h-7 text-[0.75rem] w-full transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Plus size={12} strokeWidth={1.75} />
            Adicionar membro
          </button>
        )
      )}
    </div>
  );
}
