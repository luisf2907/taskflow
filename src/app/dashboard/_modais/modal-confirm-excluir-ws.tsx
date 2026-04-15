"use client";

import { Modal } from "@/components/ui/modal";

interface ModalConfirmExcluirWsProps {
  workspaceId: string | null;
  onFechar: () => void;
  onConfirmar: (id: string) => Promise<void> | void;
}

export function ModalConfirmExcluirWs({
  workspaceId,
  onFechar,
  onConfirmar,
}: ModalConfirmExcluirWsProps) {
  if (!workspaceId) return null;

  return (
    <Modal aberto onFechar={onFechar} titulo="Excluir workspace">
      <p
        className="text-[13px] mb-4"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        Tem certeza? Os quadros/sprints ficarão avulsos. Esta ação não pode ser
        desfeita.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onFechar}
          className="px-4 py-2 text-[13px] font-medium rounded-[var(--tf-radius-xs)]"
          style={{
            color: "var(--tf-text-secondary)",
            background: "var(--tf-bg-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            await onConfirmar(workspaceId);
            onFechar();
          }}
          className="px-4 py-2 text-[13px] font-bold text-white rounded-[var(--tf-radius-xs)]"
          style={{ background: "var(--tf-danger)" }}
        >
          Sim, excluir
        </button>
      </div>
    </Modal>
  );
}
