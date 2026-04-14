"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Folder } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { Workspace } from "@/types";

const CORES_QUADRO = [
  "#C4841D",
  "#3D8B37",
  "#B04632",
  "#2E86AB",
  "#89609E",
  "#CD5A91",
  "#00857C",
  "#D4732A",
  "#6B6560",
  "#2D2A26",
];

export interface NovoQuadroDados {
  nome: string;
  cor: string;
  workspaceId: string;
  dataInicio?: string;
  dataFim?: string;
  meta?: string;
}

interface ModalCriarQuadroProps {
  aberto: boolean;
  onFechar: () => void;
  workspaces: Workspace[];
  initialWorkspaceId?: string;
  onCriar: (dados: NovoQuadroDados) => Promise<void>;
}

export function ModalCriarQuadro({
  aberto,
  onFechar,
  workspaces,
  initialWorkspaceId,
  onCriar,
}: ModalCriarQuadroProps) {
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_QUADRO[0]);
  const [novoWorkspaceId, setNovoWorkspaceId] = useState<string>(
    initialWorkspaceId || ""
  );
  const [novoDataInicio, setNovoDataInicio] = useState("");
  const [novoDataFim, setNovoDataFim] = useState("");
  const [novoMeta, setNovoMeta] = useState("");
  const [mostrarWorkspaces, setMostrarWorkspaces] = useState(false);

  // Sincronizar workspace inicial quando o modal abrir.
  // set-state-in-effect é intencional aqui: precisamos reagir à mudança do prop
  // externo só quando o modal muda de estado fechado→aberto.
  useEffect(() => {
    if (aberto && initialWorkspaceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNovoWorkspaceId(initialWorkspaceId);
    }
  }, [aberto, initialWorkspaceId]);

  function reset() {
    setNovoNome("");
    setNovaCor(CORES_QUADRO[0]);
    setNovoWorkspaceId("");
    setNovoDataInicio("");
    setNovoDataFim("");
    setNovoMeta("");
    setMostrarWorkspaces(false);
  }

  function handleFechar() {
    onFechar();
    reset();
  }

  async function handleCriar() {
    const nome = novoNome.trim();
    if (!nome || !novoWorkspaceId) return;

    await onCriar({
      nome,
      cor: novaCor,
      workspaceId: novoWorkspaceId,
      dataInicio: novoDataInicio || undefined,
      dataFim: novoDataFim || undefined,
      meta: novoMeta.trim() || undefined,
    });

    reset();
  }

  return (
    <Modal aberto={aberto} onFechar={handleFechar} titulo="Criar sprint">
      <div className="space-y-5">
        <div
          className="h-28 rounded-[20px] flex items-end p-5 transition-colors"
          style={{
            background: `linear-gradient(135deg, ${novaCor}, ${novaCor}bb)`,
          }}
        >
          <span className="text-white font-black text-2xl drop-shadow-md tracking-tight">
            {novoNome || "Nome da sprint"}
          </span>
        </div>

        <div>
          <label
            className="text-[13px] font-bold mb-2 block"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Título
          </label>
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCriar();
            }}
            className="w-full px-4 py-3 text-[15px] font-medium rounded-[14px] outline-none transition-all"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "2px solid transparent",
              color: "var(--tf-text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--tf-accent)")
            }
            onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            autoFocus
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Workspace
          </label>
          {workspaces.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => setMostrarWorkspaces(!mostrarWorkspaces)}
                className="w-full text-left text-sm px-3 py-2 rounded-[8px] border flex items-center gap-2"
                style={{
                  background: "var(--tf-bg)",
                  borderColor: "var(--tf-border)",
                  color: novoWorkspaceId
                    ? "var(--tf-text)"
                    : "var(--tf-text-tertiary)",
                }}
              >
                {novoWorkspaceId ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-[6px] shrink-0"
                      style={{
                        background:
                          workspaces.find((w) => w.id === novoWorkspaceId)
                            ?.cor || "var(--tf-accent)",
                      }}
                    />
                    <span className="font-medium flex-1 truncate">
                      {workspaces.find((w) => w.id === novoWorkspaceId)?.nome}
                    </span>
                  </>
                ) : (
                  <span className="flex-1">Selecionar workspace...</span>
                )}
                <ChevronDown
                  size={14}
                  className="shrink-0"
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
              </button>
              {mostrarWorkspaces && (
                <div
                  className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-[8px] border"
                  style={{
                    background: "var(--tf-surface)",
                    borderColor: "var(--tf-border)",
                    scrollbarWidth: "thin",
                  }}
                >
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setNovoWorkspaceId(ws.id);
                        setMostrarWorkspaces(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-smooth"
                      style={{ color: "var(--tf-text)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--tf-bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        className="w-6 h-6 rounded-[8px] shrink-0 flex items-center justify-center"
                        style={{ background: ws.cor }}
                      >
                        <Folder size={12} className="text-white" />
                      </div>
                      <span className="font-medium">{ws.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p
              className="text-xs px-1"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Crie um workspace primeiro para poder criar sprints.
            </p>
          )}
        </div>

        {novoWorkspaceId && (
          <>
            <div>
              <label
                className="text-[13px] font-bold mb-2 block"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                Meta / Objetivo
              </label>
              <input
                value={novoMeta}
                onChange={(e) => setNovoMeta(e.target.value)}
                placeholder="O que queremos alcançar nessa sprint?"
                className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                style={{
                  background: "var(--tf-bg-secondary)",
                  border: "2px solid transparent",
                  color: "var(--tf-text)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--tf-accent)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "transparent")
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="text-[13px] font-bold mb-2 block"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Início
                </label>
                <input
                  type="date"
                  value={novoDataInicio}
                  onChange={(e) => setNovoDataInicio(e.target.value)}
                  className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "2px solid transparent",
                    color: "var(--tf-text)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--tf-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                />
              </div>
              <div>
                <label
                  className="text-[13px] font-bold mb-2 block"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Fim
                </label>
                <input
                  type="date"
                  value={novoDataFim}
                  onChange={(e) => setNovoDataFim(e.target.value)}
                  className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "2px solid transparent",
                    color: "var(--tf-text)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--tf-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "transparent")
                  }
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label
            className="text-[13px] font-bold mb-2 block"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Cor
          </label>
          <div className="flex flex-wrap gap-2.5">
            {CORES_QUADRO.map((cor) => (
              <button
                key={cor}
                onClick={() => setNovaCor(cor)}
                className={`w-10 h-10 rounded-[14px] transition-all ${
                  novaCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-110"
                }`}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleCriar}
          disabled={!novoNome.trim() || !novoWorkspaceId}
          className="w-full py-4 text-[15px] font-bold text-white rounded-[20px] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          style={{ background: "var(--tf-accent)" }}
        >
          Criar Sprint
        </button>
      </div>
    </Modal>
  );
}
