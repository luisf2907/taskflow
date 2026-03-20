"use client";

import { ComentarioComAutor, Membro } from "@/types";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./avatar";

interface ComentariosProps {
  comentarios: ComentarioComAutor[];
  membros: Membro[];
  onCriar: (texto: string, membroId?: string) => void;
  onExcluir: (id: string) => void;
}

function tempoRelativo(data: string): string {
  const agora = new Date();
  const d = new Date(data);
  const diff = agora.getTime() - d.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos}min`;
  if (horas < 24) return `há ${horas}h`;
  if (dias < 7) return `há ${dias}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function Comentarios({
  comentarios,
  membros,
  onCriar,
  onExcluir,
}: ComentariosProps) {
  const [texto, setTexto] = useState("");
  const [autorId, setAutorId] = useState<string | undefined>(membros[0]?.id);

  function handleEnviar() {
    if (!texto.trim()) return;
    onCriar(texto.trim(), autorId);
    setTexto("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--trello-text)]">
        <MessageSquare size={16} />
        Comentários e atividade
      </div>

      {/* Novo comentário */}
      <div className="space-y-2">
        {membros.length > 0 && (
          <select
            value={autorId || ""}
            onChange={(e) => setAutorId(e.target.value || undefined)}
            className="w-full px-2 py-1.5 text-xs rounded-[3px] outline-none text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
          >
            <option value="">Anônimo</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                Comentar como {m.nome}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escrever um comentário..."
            className="flex-1 px-3 py-2 text-sm rounded-[3px] outline-none focus:ring-2 focus:ring-[var(--trello-blue)] transition-smooth text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
          />
          <button
            onClick={handleEnviar}
            disabled={!texto.trim()}
            className="p-2 rounded-[3px] bg-[#0C66E4] text-white hover:bg-[#0055CC] disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-3">
        {comentarios.map((comentario) => {
          const autor = comentario.membros;
          return (
            <div key={comentario.id} className="flex gap-2.5 group">
              {autor ? (
                <Avatar membro={autor} tamanho="sm" />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-semibold shrink-0 ring-2 ring-[var(--trello-card)]"
                  style={{ background: "var(--trello-border)" }}
                >
                  ?
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--trello-text)]">
                    {autor?.nome || "Anônimo"}
                  </span>
                  <span className="text-xs text-[var(--trello-text-subtle)]">
                    {tempoRelativo(comentario.criado_em)}
                  </span>
                  <button
                    onClick={() => onExcluir(comentario.id)}
                    className="p-0.5 rounded-[3px] text-[var(--trello-text-subtle)] opacity-0 group-hover:opacity-100 hover:text-[#C9372C] transition-all ml-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-sm text-[var(--trello-text)] mt-0.5 break-words">
                  {comentario.texto}
                </p>
              </div>
            </div>
          );
        })}

        {comentarios.length === 0 && (
          <p className="text-xs text-[var(--trello-text-subtle)] italic text-center py-4">
            Nenhum comentário ainda
          </p>
        )}
      </div>
    </div>
  );
}
