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
  if (minutos < 60) return `${minutos}min`;
  if (horas < 24) return `${horas}h`;
  if (dias < 7) return `${dias}d`;
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
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const meuMembro = useMemo(() => {
    if (!user) return membros[0];
    return membros.find((m) => m.user_id === user.id) || membros[0];
  }, [membros, user]);

  async function handleEnviar() {
    if (!texto.trim()) return;
    if (!meuMembro?.id) return;
    setEnviandoComentario(true);
    try {
      await onCriar(texto.trim(), meuMembro.id);
      setTexto("");
      setFocado(false);
      inputRef.current?.blur();
    } finally {
      setEnviandoComentario(false);
    }
  }

  return (
    <div>
      {/* Header — label-mono uppercase */}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare
          size={13}
          strokeWidth={1.75}
          style={{ color: "var(--tf-text-tertiary)" }}
        />
        <h3
          className="label-mono"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          Comentários
        </h3>
        {comentarios.length > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[0.625rem] font-medium"
            style={{
              background: "var(--tf-bg-secondary)",
              color: "var(--tf-text-tertiary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {comentarios.length}
          </span>
        )}
      </div>

      {/* Input area — focus gerenciado pelo CSS */}
      <div className="mb-5 comentario-box">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => {
            if (!texto.trim()) setFocado(false);
          }}
          placeholder="Escreva um comentário…"
          maxLength={2000}
          className="comentario-textarea w-full bg-transparent px-3.5 py-3 text-[0.8125rem] resize-none outline-none leading-relaxed"
          style={{
            color: "var(--tf-text)",
            minHeight: focado ? "80px" : "44px",
            transition: "min-height 0.2s ease",
            letterSpacing: "-0.005em",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleEnviar();
            }
          }}
        />

        {focado && (
          <div
            className="flex items-center justify-between px-3.5 pb-2.5 pt-2"
            style={{ borderTop: "1px solid var(--tf-border)" }}
          >
            <p
              className="text-[0.625rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              Enter enviar · Shift+Enter quebra linha
            </p>
            <button
              onClick={handleEnviar}
              disabled={!texto.trim() || enviandoComentario || !meuMembro?.id}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              {enviandoComentario ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={11} strokeWidth={1.75} />
              )}
              {enviandoComentario ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}

        <style jsx>{`
          .comentario-box {
            background: var(--tf-bg-secondary);
            border: 1px solid var(--tf-border);
            border-radius: var(--tf-radius-md);
            overflow: hidden;
            transition: border-color 0.15s ease, background 0.15s ease;
          }
          .comentario-box:focus-within {
            background: var(--tf-surface);
            border-color: var(--tf-accent);
          }
          .comentario-textarea::placeholder {
            color: var(--tf-text-tertiary);
          }
        `}</style>
      </div>

      {/* Lista de comentários */}
      {comentarios.length > 0 ? (
        <div className="space-y-1">
          {comentarios.map((comentario) => {
            const autor = comentario.membros;
            return (
              <div
                key={comentario.id}
                className="flex gap-2.5 p-2.5 group transition-colors hover:bg-[var(--tf-bg-secondary)]"
                style={{ borderRadius: "var(--tf-radius-sm)" }}
              >
                {autor ? (
                  <div className="shrink-0 mt-0.5">
                    <Avatar membro={autor} tamanho="sm" />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 flex items-center justify-center text-[0.625rem] font-medium shrink-0 mt-0.5"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      color: "var(--tf-text-tertiary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[0.75rem] font-medium"
                      style={{
                        color: "var(--tf-text)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {autor?.nome || "Anônimo"}
                    </span>
                    <span
                      className="text-[0.625rem]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {tempoRelativo(comentario.criado_em)}
                    </span>
                    <button
                      onClick={() => onExcluir(comentario.id)}
                      className="p-0.5 opacity-0 group-hover:opacity-100 ml-auto transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        borderRadius: "var(--tf-radius-xs)",
                      }}
                      aria-label="Excluir comentário"
                    >
                      <Trash2 size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                  <p
                    className="text-[0.8125rem] break-words leading-relaxed whitespace-pre-wrap"
                    style={{
                      color: "var(--tf-text-secondary)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {comentario.texto}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare
            size={18}
            strokeWidth={1.5}
            className="mx-auto mb-2"
            style={{ color: "var(--tf-border-strong)" }}
          />
          <p
            className="text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            Nenhum comentário ainda
          </p>
        </div>
      )}
    </div>
  );
}
