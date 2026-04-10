"use client";

import { useNotificacoes } from "@/hooks/use-notificacoes";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

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
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas, apagar, limparTodas } = useNotificacoes();

  const trigger = (
    <div
      className="relative hover-accent-text transition-all flex items-center justify-center cursor-pointer"
      aria-label={naoLidas > 0 ? `Notificações — ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Notificações"}
      style={{
        width: 42,
        height: 42,
        borderRadius: 20,
        background: "var(--tf-bg-secondary)",
        color: "var(--tf-text-secondary)",
      }}
    >
      <Bell size={18} strokeWidth={2.5} aria-hidden="true" />
      {naoLidas > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center font-bold"
          aria-hidden="true"
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
    </div>
  );

  return (
    <Dropdown trigger={trigger} closeOnClick={false} className="!w-[320px] !rounded-[20px] !p-0 overflow-hidden !right-auto !left-1/2 !-ml-[160px] !mt-[18px]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--tf-border)" }}
      >
        <span className="font-bold" style={{ fontSize: 14, color: "var(--tf-text)" }}>
          Notificações
        </span>
        <div className="flex items-center gap-2">
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
          {notificacoes.length > 0 && (
            <button
              onClick={() => limparTodas()}
              className="flex items-center gap-1 font-medium"
              style={{ fontSize: 12, color: "var(--tf-danger)" }}
            >
              <Trash2 size={13} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }} role="list" aria-label="Notificações">
        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={28} style={{ color: "var(--tf-text-tertiary)" }} />
            <span style={{ fontSize: 13, color: "var(--tf-text-tertiary)" }}>
              Nenhuma notificação
            </span>
          </div>
        ) : (
          notificacoes.map((n) => (
            <button
              key={n.id}
              role="listitem"
              className="group flex items-start gap-3 px-4 py-3 cursor-pointer hover-surface transition-all w-full text-left"
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

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  apagar(n.id);
                }}
                className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)]"
                style={{ color: "var(--tf-text-tertiary)" }}
                title="Apagar notificação"
              >
                <X size={13} />
              </button>
            </button>
          ))
        )}
      </div>
    </Dropdown>
  );
}
