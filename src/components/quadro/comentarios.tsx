"use client";

import { useAuth } from "@/hooks/use-auth";
import { ComentarioComAutor, Membro } from "@/types";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  if (minutos < 60) return `${minutos}min atrás`;
  if (horas < 24) return `${horas}h atrás`;
  if (dias < 7) return `${dias}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function Comentarios({
  comentarios,
  membros,
  onCriar,
  onExcluir,
}: ComentariosProps) {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [focado, setFocado] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Encontrar o membro que corresponde ao usuário logado
  const meuMembro = useMemo(() => {
    if (!user) return membros[0];
    return membros.find((m) => m.user_id === user.id) || membros[0];
  }, [membros, user]);

  function handleEnviar() {
    if (!texto.trim()) return;
    onCriar(texto.trim(), meuMembro?.id);
    setTexto("");
    setFocado(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={15} style={{ color: "var(--tf-text-tertiary)" }} />
        <h3 className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
          Comentários
        </h3>
        {comentarios.length > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
          >
            {comentarios.length}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="mb-5">
        <div
          className="rounded-[14px] overflow-hidden"
          style={{
            background: "var(--tf-bg-secondary)",
            border: focado ? "2px solid var(--tf-accent)" : "2px solid transparent",
            transition: "border-color 0.15s ease",
          }}
        >
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => { if (!texto.trim()) setFocado(false); }}
            placeholder="Escreva um comentário..."
            className="w-full bg-transparent px-4 py-3 text-[13px] resize-none outline-none leading-relaxed"
            style={{ color: "var(--tf-text)", minHeight: focado ? "80px" : "44px", transition: "min-height 0.2s ease" }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
          />

          {/* Send bar */}
          {focado && (
            <div className="flex items-center justify-between px-4 pb-3">
              <p className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                Enter para enviar · Shift+Enter para quebrar linha
              </p>
              <button
                onClick={handleEnviar}
                disabled={!texto.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white rounded-[8px] disabled:opacity-30"
                style={{ background: "var(--tf-accent)", transition: "opacity 0.15s ease" }}
              >
                <Send size={12} />
                Enviar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments list */}
      {comentarios.length > 0 ? (
        <div className="space-y-1">
          {comentarios.map((comentario) => {
            const autor = comentario.membros;
            return (
              <div
                key={comentario.id}
                className="flex gap-3 p-3 rounded-[14px] group hover:bg-[var(--tf-bg-secondary)]"
                style={{ transition: "background 0.15s ease" }}
              >
                {autor ? (
                  <div className="shrink-0 mt-0.5">
                    <Avatar membro={autor} tamanho="sm" />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
                  >
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold" style={{ color: "var(--tf-text)" }}>
                      {autor?.nome || "Anônimo"}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      {tempoRelativo(comentario.criado_em)}
                    </span>
                    <button
                      onClick={() => onExcluir(comentario.id)}
                      className="p-1 rounded-[4px] opacity-0 group-hover:opacity-100 ml-auto hover:bg-[var(--tf-danger-bg)]"
                      style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease, background 0.15s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-[13px] break-words leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tf-text-secondary)" }}>
                    {comentario.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare size={20} className="mx-auto mb-2 opacity-20" style={{ color: "var(--tf-text-tertiary)" }} />
          <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
            Nenhum comentário ainda
          </p>
        </div>
      )}
    </div>
  );
}
