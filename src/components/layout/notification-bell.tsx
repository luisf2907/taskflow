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
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas, apagar, limparTodas } =
    useNotificacoes();

  const trigger = (
    <button
      className="relative w-8 h-8 flex items-center justify-center transition-colors outline-none cursor-pointer"
      aria-label={
        naoLidas > 0
          ? `Notificações — ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`
          : "Notificações"
      }
      style={{
        borderRadius: "var(--tf-radius-sm)",
        color: "var(--tf-text-secondary)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--tf-surface-hover)";
        e.currentTarget.style.color = "var(--tf-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--tf-text-secondary)";
      }}
    >
      <Bell size={15} strokeWidth={1.75} aria-hidden="true" />
      {naoLidas > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 pulse-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--tf-accent)",
            boxShadow: "0 0 0 2px var(--tf-surface)",
          }}
        />
      )}
    </button>
  );

  return (
    <Dropdown
      trigger={trigger}
      closeOnClick={false}
      className="!w-[340px] !p-0 overflow-hidden !right-auto !left-1/2 !-ml-[170px] !mt-2"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--tf-border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="label-mono"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Notificações
          </span>
          {naoLidas > 0 && (
            <span
              className="text-[0.625rem] px-1.5 rounded-[var(--tf-radius-xs)]"
              style={{
                background: "var(--tf-accent)",
                color: "#FFFFFF",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
                fontWeight: 500,
              }}
            >
              {naoLidas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodasComoLidas()}
              className="flex items-center gap-1 text-[0.6875rem] font-medium transition-colors hover:text-[var(--tf-accent)]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <CheckCheck size={12} strokeWidth={1.75} />
              Ler todas
            </button>
          )}
          {notificacoes.length > 0 && (
            <button
              onClick={() => limparTodas()}
              className="flex items-center gap-1 text-[0.6875rem] font-medium transition-colors hover:text-[var(--tf-danger)]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <Trash2 size={11} strokeWidth={1.75} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: 380 }}
        role="list"
        aria-label="Notificações"
      >
        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell
              size={22}
              strokeWidth={1.5}
              style={{ color: "var(--tf-border-strong)" }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              Nenhuma notificação
            </span>
          </div>
        ) : (
          notificacoes.map((n) => (
            <div
              key={n.id}
              role="listitem"
              tabIndex={0}
              className="group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors w-full text-left hover:bg-[var(--tf-surface-hover)] outline-none focus-visible:bg-[var(--tf-surface-hover)]"
              style={{ borderBottom: "1px solid var(--tf-border-subtle)" }}
              onClick={() => {
                marcarComoLida(n.id);
                if (n.link) window.location.href = n.link;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  marcarComoLida(n.id);
                  if (n.link) window.location.href = n.link;
                }
              }}
            >
              {/* Unread indicator — orange bar vertical */}
              <div
                className="shrink-0 self-stretch"
                style={{
                  width: 2,
                  background: n.lida ? "transparent" : "var(--tf-accent)",
                  borderRadius: 2,
                  minHeight: 32,
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-medium truncate flex-1"
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {n.titulo}
                  </span>
                  <span
                    className="shrink-0"
                    style={{
                      fontSize: "0.625rem",
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {tempoRelativo(n.criado_em)}
                  </span>
                </div>
                {n.mensagem && (
                  <div
                    className="line-clamp-2 mt-0.5"
                    style={{ fontSize: "0.75rem", color: "var(--tf-text-secondary)" }}
                  >
                    {n.mensagem}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  apagar(n.id);
                }}
                className="shrink-0 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-[var(--tf-radius-xs)] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
                style={{ color: "var(--tf-text-tertiary)" }}
                title="Apagar notificação"
                aria-label="Apagar notificação"
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </Dropdown>
  );
}
