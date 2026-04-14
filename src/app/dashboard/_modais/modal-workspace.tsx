"use client";

import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { Workspace } from "@/types";

const CORES_WORKSPACE = [
  "#C4841D",
  "#3D8B37",
  "#2E86AB",
  "#89609E",
  "#B04632",
  "#CD5A91",
  "#00857C",
  "#6B6560",
];

interface ModalWorkspaceProps {
  aberto: boolean;
  editando: Workspace | null;
  onFechar: () => void;
  onCriar: (nome: string, descricao: string | undefined, cor: string) => Promise<void> | void;
  onSalvar: (
    id: string,
    campos: { nome: string; descricao: string | null; cor: string }
  ) => Promise<void> | void;
}

export function ModalWorkspace({
  aberto,
  editando,
  onFechar,
  onCriar,
  onSalvar,
}: ModalWorkspaceProps) {
  const [wsNome, setWsNome] = useState("");
  const [wsDescricao, setWsDescricao] = useState("");
  const [wsCor, setWsCor] = useState(CORES_WORKSPACE[0]);

  // Sincronizar com o workspace em edição. set-state-in-effect intencional:
  // o modal precisa popular os campos quando `editando` muda de fora.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editando) {
      setWsNome(editando.nome);
      setWsDescricao(editando.descricao || "");
      setWsCor(editando.cor);
    } else if (aberto) {
      setWsNome("");
      setWsDescricao("");
      setWsCor(CORES_WORKSPACE[0]);
    }
  }, [editando, aberto]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleFechar() {
    onFechar();
    setWsNome("");
    setWsDescricao("");
    setWsCor(CORES_WORKSPACE[0]);
  }

  async function handleCriar() {
    const nome = wsNome.trim();
    if (!nome) return;
    await onCriar(nome, wsDescricao.trim() || undefined, wsCor);
    handleFechar();
  }

  async function handleSalvar() {
    if (!editando) return;
    const nome = wsNome.trim();
    if (!nome) return;
    await onSalvar(editando.id, {
      nome,
      descricao: wsDescricao.trim() || null,
      cor: wsCor,
    });
    handleFechar();
  }

  const isOpen = aberto || !!editando;

  return (
    <Modal
      aberto={isOpen}
      onFechar={handleFechar}
      titulo={editando ? "Editar workspace" : "Criar workspace"}
    >
      <div className="space-y-5">
        <div
          className="flex items-center gap-4 p-5 rounded-[20px]"
          style={{ background: "var(--tf-bg-secondary)" }}
        >
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0"
            style={{ background: wsCor }}
          >
            <Folder size={24} className="text-white" />
          </div>
          <div>
            <p
              className="font-extrabold text-[18px] tracking-tight"
              style={{ color: "var(--tf-text)" }}
            >
              {wsNome || "Nome do workspace"}
            </p>
            {wsDescricao && (
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {wsDescricao}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            className="text-[13px] font-bold mb-2 block"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Nome
          </label>
          <input
            value={wsNome}
            onChange={(e) => setWsNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editando) handleSalvar();
                else handleCriar();
              }
            }}
            className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
            style={{
              background: "var(--tf-surface)",
              border: "2px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-border)")
            }
            autoFocus
          />
        </div>

        <div>
          <label
            className="text-[13px] font-bold mb-2 block"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Descrição (opcional)
          </label>
          <input
            value={wsDescricao}
            onChange={(e) => setWsDescricao(e.target.value)}
            placeholder="Ex: Projetos da equipe de marketing"
            className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
            style={{
              background: "var(--tf-surface)",
              border: "2px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-border)")
            }
          />
        </div>

        <div>
          <label
            className="text-[13px] font-bold mb-2 block"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Cor
          </label>
          <div className="flex flex-wrap gap-2.5">
            {CORES_WORKSPACE.map((cor) => (
              <button
                key={cor}
                onClick={() => setWsCor(cor)}
                className={`w-10 h-10 rounded-[14px] transition-all ${
                  wsCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-110"
                }`}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={editando ? handleSalvar : handleCriar}
          disabled={!wsNome.trim()}
          className="w-full py-4 text-[15px] font-bold text-white rounded-[20px] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          style={{ background: "var(--tf-accent)" }}
        >
          {editando ? "Salvar Workspace" : "Criar Workspace"}
        </button>
      </div>
    </Modal>
  );
}
