"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PALETA_EPICOS, LIMITE_EPICOS_ATIVOS, proximaCorDisponivel } from "@/lib/epicos";
import { Check, Crosshair, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EpicoMarker } from "./epico-marker";

interface SeletorEpicoProps {
  cartaoId: string;
  workspaceId: string | null;
  ehEpico: boolean;
  corEpico: string | null;
  cartaoPaiId: string | null;
  onChange: (campos: { eh_epico?: boolean; cor_epico?: string | null; cartao_pai_id?: string | null }) => Promise<void>;
}

interface EpicoOption {
  id: string;
  titulo: string;
  cor_epico: string | null;
  data_conclusao: string | null;
}

export function SeletorEpico({
  cartaoId,
  workspaceId,
  ehEpico,
  corEpico,
  cartaoPaiId,
  onChange,
}: SeletorEpicoProps) {
  const [epicos, setEpicos] = useState<EpicoOption[]>([]);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"vincular" | "novo">("vincular");
  const [coresUsadas, setCoresUsadas] = useState<string[]>([]);
  const [epicosAtivos, setEpicosAtivos] = useState<number>(0);
  const buscaRef = useRef<HTMLInputElement>(null);

  // Carrega épicos do workspace (pra dropdown de "vincular")
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data } = await supabase
        .from("cartoes")
        .select("id, titulo, cor_epico, data_conclusao")
        .eq("workspace_id", workspaceId)
        .eq("eh_epico", true)
        .order("criado_em", { ascending: false });
      const lista = (data || []) as EpicoOption[];
      setEpicos(lista);
      setCoresUsadas(
        lista
          .filter((e) => !e.data_conclusao && e.id !== cartaoId)
          .map((e) => e.cor_epico)
          .filter((c): c is string => !!c)
      );
      setEpicosAtivos(lista.filter((e) => !e.data_conclusao && e.id !== cartaoId).length);
    })();
  }, [workspaceId, cartaoId]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return epicos.filter((e) => !e.data_conclusao);
    return epicos.filter(
      (e) => !e.data_conclusao && e.titulo.toLowerCase().includes(t)
    );
  }, [epicos, busca]);

  // Cor sugerida pra promoção
  const corSugerida = useMemo(
    () => corEpico || proximaCorDisponivel(coresUsadas),
    [corEpico, coresUsadas]
  );

  async function handlePromoverAEpico() {
    if (epicosAtivos >= LIMITE_EPICOS_ATIVOS) {
      toast.error(
        `Limite de ${LIMITE_EPICOS_ATIVOS} épicos ativos atingido. Conclua ou arquive um antes.`
      );
      return;
    }
    await onChange({
      eh_epico: true,
      cor_epico: corSugerida,
      cartao_pai_id: null, // épico não tem pai
    });
    toast.success("Card marcado como épico");
  }

  async function handleDesmarcarEpico() {
    await onChange({ eh_epico: false, cor_epico: null });
    toast.success("Card desmarcado como épico");
  }

  async function handleMudarCor(novaCor: string) {
    await onChange({ cor_epico: novaCor });
  }

  async function handleVincular(epico: EpicoOption) {
    await onChange({ cartao_pai_id: epico.id });
    toast.success(`Vinculado ao épico "${epico.titulo}"`);
  }

  async function handleDesvincular() {
    await onChange({ cartao_pai_id: null });
    toast.success("Desvinculado do épico");
  }

  // =============================================
  // CASO 1: card já é épico — gerencia cor + opção de desmarcar
  // =============================================
  if (ehEpico) {
    return (
      <div
        className="px-3 py-3 space-y-3"
        style={{
          background: "var(--tf-surface-raised)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <EpicoMarker cor={corEpico} titulo={null} enfase tamanho={12} />
            <span
              className="text-[0.75rem] font-medium"
              style={{ color: "var(--tf-text)" }}
            >
              Este card é um épico
            </span>
          </div>
          <button
            onClick={handleDesmarcarEpico}
            className="text-[0.625rem] font-medium px-1.5 h-[20px] transition-colors"
            style={{
              color: "var(--tf-text-tertiary)",
              background: "transparent",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Desmarcar
          </button>
        </div>

        <div>
          <p
            className="text-[0.625rem] mb-1.5"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Cor do épico
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PALETA_EPICOS.map((c) => {
              const usada = coresUsadas.includes(c.hex);
              const ativa = corEpico?.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => handleMudarCor(c.hex)}
                  disabled={usada && !ativa}
                  title={
                    ativa
                      ? `${c.nome} (atual)`
                      : usada
                        ? `${c.nome} (já em uso)`
                        : c.nome
                  }
                  className="relative flex items-center justify-center transition-all disabled:cursor-not-allowed"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c.hex,
                    opacity: usada && !ativa ? 0.25 : 1,
                    boxShadow: ativa
                      ? `0 0 0 2px var(--tf-surface), 0 0 0 3.5px ${c.hex}`
                      : "0 0 0 1px rgba(255,255,255,0.4)",
                  }}
                >
                  {ativa && <Check size={11} strokeWidth={2.5} style={{ color: "#fff" }} />}
                </button>
              );
            })}
          </div>
          <p
            className="text-[0.625rem] mt-2"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            Cores em uso por outros épicos ativos aparecem desabilitadas.
          </p>
        </div>
      </div>
    );
  }

  // =============================================
  // CASO 2: card NÃO é épico — pode vincular a um ou virar épico
  // =============================================
  return (
    <div
      className="px-3 py-3 space-y-3"
      style={{
        background: "var(--tf-surface-raised)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setModo("vincular")}
          className="flex-1 h-7 text-[0.6875rem] font-medium transition-colors"
          style={{
            background: modo === "vincular" ? "var(--tf-accent-light)" : "transparent",
            color:
              modo === "vincular" ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
            border: `1px solid ${modo === "vincular" ? "var(--tf-accent)" : "var(--tf-border)"}`,
            borderRadius: "var(--tf-radius-xs) 0 0 var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Vincular a épico
        </button>
        <button
          onClick={() => setModo("novo")}
          className="flex-1 h-7 text-[0.6875rem] font-medium transition-colors"
          style={{
            background: modo === "novo" ? "var(--tf-accent-light)" : "transparent",
            color: modo === "novo" ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
            border: `1px solid ${modo === "novo" ? "var(--tf-accent)" : "var(--tf-border)"}`,
            borderLeft: "none",
            borderRadius: "0 var(--tf-radius-xs) var(--tf-radius-xs) 0",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Virar épico
        </button>
      </div>

      {modo === "vincular" ? (
        <div className="space-y-2">
          {cartaoPaiId && (
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              {(() => {
                const atual = epicos.find((e) => e.id === cartaoPaiId);
                if (!atual) return <span className="text-[0.75rem]">Vinculado</span>;
                return (
                  <>
                    <EpicoMarker cor={atual.cor_epico} titulo={atual.titulo} enfase tamanho={10} />
                    <span
                      className="flex-1 text-[0.75rem] font-medium truncate"
                      style={{ color: "var(--tf-text)" }}
                    >
                      {atual.titulo}
                    </span>
                    <button
                      onClick={handleDesvincular}
                      title="Desvincular"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      <X size={12} strokeWidth={1.75} />
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          <div
            className="flex items-center gap-2 px-2 h-8"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Search size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              ref={buscaRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar épico…"
              className="flex-1 bg-transparent outline-none text-[0.75rem]"
              style={{ color: "var(--tf-text)" }}
            />
          </div>

          <ul className="max-h-[180px] overflow-y-auto flex flex-col gap-0.5">
            {filtrados.length === 0 ? (
              <li
                className="px-2 py-2 text-center text-[0.6875rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {epicos.filter((e) => !e.data_conclusao).length === 0
                  ? "Nenhum épico ativo no workspace ainda. Crie um clicando em 'Virar épico'."
                  : "Nenhum épico bate com a busca"}
              </li>
            ) : (
              filtrados.map((e) => {
                const ativo = cartaoPaiId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => handleVincular(e)}
                      disabled={ativo}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-[0.75rem] transition-colors disabled:cursor-default"
                      style={{
                        background: ativo ? "var(--tf-accent-light)" : "transparent",
                        color: ativo ? "var(--tf-accent-text)" : "var(--tf-text)",
                        borderRadius: "var(--tf-radius-xs)",
                      }}
                      onMouseEnter={(ev) => {
                        if (!ativo) ev.currentTarget.style.background = "var(--tf-surface-hover)";
                      }}
                      onMouseLeave={(ev) => {
                        if (!ativo) ev.currentTarget.style.background = "transparent";
                      }}
                    >
                      <EpicoMarker cor={e.cor_epico} titulo={e.titulo} enfase tamanho={10} />
                      <span className="flex-1 truncate">{e.titulo}</span>
                      {ativo && <Check size={11} strokeWidth={2} />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <p
            className="text-[0.6875rem]"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Marcar este card como épico permite agrupar outros cards como
            filhos dele e dá uma cor única pra identificação rápida.
          </p>

          <div className="flex items-center gap-2">
            <EpicoMarker cor={corSugerida} titulo={null} enfase tamanho={12} />
            <span
              className="text-[0.75rem]"
              style={{ color: "var(--tf-text)" }}
            >
              Cor sugerida: <strong>{PALETA_EPICOS.find((p) => p.hex === corSugerida)?.nome}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-[0.625rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {epicosAtivos}/{LIMITE_EPICOS_ATIVOS} épicos ativos
            </span>
            <button
              onClick={handlePromoverAEpico}
              disabled={epicosAtivos >= LIMITE_EPICOS_ATIVOS}
              className="flex items-center gap-1.5 h-7 px-3 text-[0.6875rem] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--tf-accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Crosshair size={11} strokeWidth={2} />
              Virar épico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
