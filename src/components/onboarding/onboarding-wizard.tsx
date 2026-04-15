"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Kanban, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface OnboardingWizardProps {
  initialStep?: number;
  onComplete: (workspaceId: string) => void;
  onSkip: () => void;
}

const CORES = ["#00857A", "#D84D4D", "#FBD051", "#6366F1", "#EC4899", "#F59E0B"];

async function salvarStep(step: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("perfis").update({ onboarding_step: step }).eq("id", user.id);
  } catch {
    // Silent fail - nao bloquear UI
  }
}

async function marcarCompleto() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("perfis")
      .update({ onboarding_done: true, onboarding_step: 4 })
      .eq("id", user.id);
    // Legacy fallback
    localStorage.setItem("tf_onboarding_done", "true");
  } catch {
    // Silent fail
  }
}

export default function OnboardingWizard({ initialStep = 1, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(initialStep || 1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceColor, setWorkspaceColor] = useState(CORES[0]);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState("");

  // Persistir step ao mudar
  useEffect(() => {
    if (step > 0 && step < 4) salvarStep(step);
  }, [step]);

  async function handleCreateWorkspace() {
    const nome = workspaceName.trim();
    if (!nome) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          nome,
          cor: workspaceColor,
          descricao: "",
          icone: "folder",
          colunas_padrao: ["A fazer", "Em progresso", "Concluído"],
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedId(data.id);
      await marcarCompleto();
      setStep(3);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err), "OnboardingWizard");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    await marcarCompleto();
    onSkip();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="max-w-lg w-full mx-auto mt-[15vh] rounded-[var(--tf-radius-xl)] p-10"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: s <= step ? "var(--tf-accent)" : "var(--tf-border)",
              }}
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: "var(--tf-accent)" }}
            >
              <Kanban size={48} className="text-white" />
            </div>

            <h1
              className="text-[32px] font-black mb-3"
              style={{ color: "var(--tf-text)" }}
            >
              Bem-vindo ao Taskflow!
            </h1>
            <p
              className="text-[16px] mb-10"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Vamos configurar seu espaço de trabalho em poucos passos.
            </p>

            <button
              onClick={() => setStep(2)}
              className="px-8 py-3.5 rounded-[var(--tf-radius-md)] text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all"
              style={{ background: "var(--tf-accent)" }}
            >
              Começar
            </button>
            <button
              onClick={handleSkip}
              className="mt-4 text-[14px] font-bold transition-colors hover:opacity-80"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Pular
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col items-center">
            <h2
              className="text-[24px] font-bold mb-8 text-center"
              style={{ color: "var(--tf-text)" }}
            >
              Crie seu primeiro workspace
            </h2>

            <div className="w-full space-y-6">
              <div>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Nome do workspace"
                  maxLength={50}
                  className="w-full px-4 py-3 text-[15px] font-medium rounded-[var(--tf-radius-md)] outline-none transition-all"
                  style={{
                    background: "var(--tf-bg)",
                    border: "1px solid var(--tf-border)",
                    color: "var(--tf-text)",
                  }}
                  autoFocus
                />
              </div>

              <div>
                <p
                  className="text-[13px] font-bold mb-3"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Cor
                </p>
                <div className="flex items-center gap-3">
                  {CORES.map((cor) => (
                    <button
                      key={cor}
                      onClick={() => setWorkspaceColor(cor)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        workspaceColor === cor
                          ? "ring-2 ring-offset-2 scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{
                        backgroundColor: cor,
                        outlineColor: workspaceColor === cor ? cor : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateWorkspace}
              disabled={!workspaceName.trim() || loading}
              className="w-full mt-8 py-3.5 rounded-[var(--tf-radius-md)] text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
              style={{ background: "var(--tf-accent)" }}
            >
              {loading ? "Criando..." : "Criar workspace"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-[14px] font-bold transition-colors hover:opacity-80"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Voltar
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: "var(--tf-success)" }}
            >
              <CheckCircle2 size={48} className="text-white" />
            </div>

            <h1
              className="text-[28px] font-black mb-3"
              style={{ color: "var(--tf-text)" }}
            >
              Tudo pronto!
            </h1>
            <p
              className="text-[16px] mb-10"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Seu workspace foi criado. Hora de começar a organizar.
            </p>

            <button
              onClick={() => onComplete(createdId)}
              className="px-8 py-3.5 rounded-[var(--tf-radius-md)] text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all"
              style={{ background: "var(--tf-accent)" }}
            >
              Ir para o workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
