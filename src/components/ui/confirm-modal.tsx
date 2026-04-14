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
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "var(--tf-danger-bg)" }}
            >
              <AlertTriangle size={18} style={{ color: "var(--tf-danger)" }} />
            </div>
          )}
          <p
            className="text-[14px] leading-relaxed pt-1"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            {mensagem}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmar();
              onFechar();
            }}
            className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-white transition-colors"
            style={{
              background: danger ? "var(--tf-danger)" : "var(--tf-accent)",
            }}
          >
            {textoBotaoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
