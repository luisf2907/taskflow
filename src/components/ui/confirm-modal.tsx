"use client";

import { Modal } from "./modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  titulo?: string;
  mensagem: string;
  textoBotaoConfirmar?: string;
  danger?: boolean;
}

export function ConfirmModal({
  aberto,
  onFechar,
  onConfirmar,
  titulo = "Confirmar",
  mensagem,
  textoBotaoConfirmar = "Confirmar",
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {danger && (
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{
                background: "var(--tf-danger-bg)",
                border: "1px solid var(--tf-danger)",
                borderRadius: "var(--tf-radius-xs)",
                color: "var(--tf-danger)",
              }}
            >
              <AlertTriangle size={15} />
            </div>
          )}
          <p
            className="text-[0.8125rem] leading-relaxed pt-1"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            {mensagem}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onFechar}
            className="h-9 px-3.5 text-[0.8125rem] font-medium transition-smooth hover:bg-[var(--tf-surface-hover)]"
            style={{
              color: "var(--tf-text-secondary)",
              borderRadius: "var(--tf-radius-sm)",
              border: "1px solid transparent",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmar();
              onFechar();
            }}
            className="h-9 px-3.5 text-[0.8125rem] font-medium text-white transition-smooth hover:brightness-110"
            style={{
              background: danger ? "var(--tf-danger)" : "var(--tf-accent)",
              borderRadius: "var(--tf-radius-sm)",
              border: `1px solid ${danger ? "var(--tf-danger)" : "var(--tf-accent)"}`,
            }}
          >
            {textoBotaoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
