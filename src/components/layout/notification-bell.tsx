"use client";

import { useNotificacoes } from "@/hooks/use-notificacoes";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";

function tempoRelativo(data: string): string {
  const min = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const dias = Math.floor(hrs / 24);
  if (dias === 1) return "ontem";
  return `${dias}d`;
}

export function NotificationBell() {
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-center">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="hover-accent-text transition-all flex items-center justify-center"
        style={{
          width: 42,
          height: 42,
          borderRadius: 20,
          background: "var(--tf-bg-secondary)",
          color: "var(--tf-text-secondary)",
        }}
      >
        <Bell size={18} strokeWidth={2.5} />
        {naoLidas > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center font-bold"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--tf-danger)",
              color: "white",
              fontSize: 10,
            }}
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute left-1/2 z-50 overflow-hidden"
            style={{
              top: "calc(100% + 18px)",
              width: 320,
              marginLeft: -160,
              borderRadius: 20,
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              boxShadow: "var(--tf-shadow-lg)",
              animation: "dropdownExpandDown 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--tf-border)" }}
            >
              <span className="font-bold" style={{ fontSize: 14, color: "var(--tf-text)" }}>
                Notificações
              </span>
              {naoLidas > 0 && (
                <button
                  onClick={() => marcarTodasComoLidas()}
                  className="flex items-center gap-1 font-medium"
                  style={{ fontSize: 12, color: "var(--tf-accent)" }}
                >
                  <CheckCheck size={14} />
                  Marcar todas
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell size={28} style={{ color: "var(--tf-text-tertiary)" }} />
                  <span style={{ fontSize: 13, color: "var(--tf-text-tertiary)" }}>
                    Nenhuma notificação
                  </span>
                </div>
              ) : (
                notificacoes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover-surface transition-all"
                    style={{ borderBottom: "1px solid var(--tf-border-subtle)" }}
                    onClick={() => {
                      marcarComoLida(n.id);
                      if (n.link) window.location.href = n.link;
                    }}
                  >
                    {/* Unread dot */}
                    <div
                      className="shrink-0"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        marginTop: 8,
                        background: n.lida ? "transparent" : "var(--tf-accent)",
                      }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold truncate"
                        style={{ fontSize: 13, color: "var(--tf-text)" }}
                      >
                        {n.titulo}
                      </div>
                      {n.mensagem && (
                        <div
                          className="line-clamp-2 mt-0.5"
                          style={{ fontSize: 12, color: "var(--tf-text-secondary)" }}
                        >
                          {n.mensagem}
                        </div>
                      )}
                      <div className="mt-1" style={{ fontSize: 11, color: "var(--tf-text-tertiary)" }}>
                        {tempoRelativo(n.criado_em)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
