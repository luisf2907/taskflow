"use client";

import { useDependencias } from "@/hooks/use-dependencias";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { CheckCircle2, Circle, GitBranch, Link2, Lock, Network, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GrafoDependenciasOverlay } from "./grafo-dependencias";

interface CartaoLite {
  id: string;
  titulo: string;
  data_conclusao: string | null;
}

interface Props {
  cartaoId: string;
  workspaceId: string | null;
  cartaoTitulo?: string;
  onAbrirCartao?: (id: string) => void;
}

// =============================================
// DEPENDÊNCIAS — relação cronológica entre cards
// (este card só pode concluir depois que aquele concluir)
// =============================================
export function SecaoDependencias({ cartaoId, workspaceId, cartaoTitulo, onAbrirCartao }: Props) {
  const { bloqueando, bloqueadoPor, estaBloqueado, adicionar, remover } = useDependencias(cartaoId);
  const [picker, setPicker] = useState(false);
  const [pickerBusca, setPickerBusca] = useState("");
  const [pickerResultados, setPickerResultados] = useState<CartaoLite[]>([]);
  const [grafoAberto, setGrafoAberto] = useState(false);
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picker) pickerInputRef.current?.focus();
  }, [picker]);

  // Fecha picker ao clicar fora.
  useEffect(() => {
    if (!picker) return;
    function onClick(e: MouseEvent) {
      if (!pickerContainerRef.current?.contains(e.target as Node)) {
        setPicker(false);
        setPickerBusca("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [picker]);

  // Debounce + busca de cards no workspace
  useEffect(() => {
    const termo = pickerBusca.trim();
    if (!workspaceId || !picker) return;
    const t = setTimeout(async () => {
      let q = supabase
        .from("cartoes")
        .select("id, titulo, data_conclusao")
        .eq("workspace_id", workspaceId)
        .neq("id", cartaoId)
        .order("criado_em", { ascending: false })
        .limit(10);
      if (termo) q = q.ilike("titulo", `%${termo}%`);
      const { data } = await q;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickerResultados(((data || []) as CartaoLite[]).filter((c) => {
        const jaDep = bloqueando.some((d) => d.depende_de_cartao_id === c.id);
        return !jaDep;
      }));
    }, 200);
    return () => clearTimeout(t);
  }, [pickerBusca, picker, workspaceId, cartaoId, bloqueando]);

  async function handleAdicionar(c: CartaoLite) {
    try {
      await adicionar(c.id);
      setPicker(false);
      setPickerBusca("");
      toast.success("Dependência adicionada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao vincular";
      toast.error(msg);
    }
  }

  const totalDeps = bloqueando.length + bloqueadoPor.length;
  if (totalDeps === 0 && !picker) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 size={14} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
          <h3
            className="text-[0.6875rem] font-medium"
            style={{
              color: "var(--tf-text-secondary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Dependências
          </h3>
        </div>
        <button
          onClick={() => setPicker(true)}
          className="flex items-center gap-1.5 h-7 px-2 text-[0.75rem] font-medium transition-colors"
          style={{
            background: "transparent",
            color: "var(--tf-text-secondary)",
            borderWidth: "1px",
            borderStyle: "dashed",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Adicionar dependência
        </button>
      </div>
    );
  }

  return (
    <div ref={pickerContainerRef} className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Link2 size={14} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
        <h3
          className="text-[0.6875rem] font-medium"
          style={{
            color: "var(--tf-text-secondary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Dependências
        </h3>
        {estaBloqueado && (
          <span
            className="inline-flex items-center gap-1 text-[0.625rem] font-medium px-1.5 h-[16px]"
            style={{
              background: "var(--tf-warning-bg)",
              color: "var(--tf-warning)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-warning)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            <Lock size={9} strokeWidth={2} />
            Bloqueado
          </span>
        )}
        {/* Botão: ver árvore de dependências em grafo */}
        <button
          onClick={() => setGrafoAberto(true)}
          title="Ver árvore de dependências"
          className="ml-auto inline-flex items-center gap-1 h-6 px-2 text-[0.625rem] font-medium transition-colors"
          style={{
            color: "var(--tf-accent-text)",
            background: "var(--tf-accent-light)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          <Network size={10} strokeWidth={2} />
          Ver árvore
        </button>
      </div>

      {/* Bloqueando: este card depende destes outros */}
      {bloqueando.length > 0 && (
        <div className="space-y-1">
          <p
            className="text-[0.6rem] font-medium"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Este card depende de
          </p>
          <ul className="flex flex-col gap-0.5">
            {bloqueando.map((d) => {
              const dep = (d as unknown as { depende_de: { id: string; titulo: string; data_conclusao: string | null } | null }).depende_de;
              if (!dep) return null;
              const concluido = !!dep.data_conclusao;
              return (
                <li
                  key={d.id}
                  className="group flex items-center gap-2 px-1.5 py-1 transition-colors"
                  style={{ borderRadius: "var(--tf-radius-xs)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--tf-surface-hover)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {concluido ? (
                    <CheckCircle2 size={12} strokeWidth={2} style={{ color: "var(--tf-success)" }} />
                  ) : (
                    <Lock size={11} strokeWidth={2} style={{ color: "var(--tf-warning)" }} />
                  )}
                  <button
                    onClick={() => onAbrirCartao?.(dep.id)}
                    className="flex-1 text-left text-[0.8125rem] truncate"
                    style={{
                      color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                      textDecoration: concluido ? "line-through" : "none",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {dep.titulo}
                  </button>
                  <button
                    onClick={() => remover(d.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--tf-text-tertiary)" }}
                    aria-label="Remover dependência"
                  >
                    <X size={11} strokeWidth={1.75} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Bloqueado por: cards que dependem deste */}
      {bloqueadoPor.length > 0 && (
        <div className="space-y-1">
          <p
            className="text-[0.6rem] font-medium"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Bloqueia
          </p>
          <ul className="flex flex-col gap-0.5">
            {bloqueadoPor.map((d) => {
              const c = (d as unknown as { cartao: { id: string; titulo: string; data_conclusao: string | null } | null }).cartao;
              if (!c) return null;
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-1.5 py-1"
                  style={{ borderRadius: "var(--tf-radius-xs)" }}
                >
                  <GitBranch size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                  <button
                    onClick={() => onAbrirCartao?.(c.id)}
                    className="flex-1 text-left text-[0.8125rem] truncate"
                    style={{
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {c.titulo}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {picker ? (
        <div
          className="overflow-hidden"
          style={{
            background: "var(--tf-surface)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <div
            className="flex items-center gap-2 px-2 h-8"
            style={{ borderBottom: "1px solid var(--tf-border)" }}
          >
            <Search size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              ref={pickerInputRef}
              value={pickerBusca}
              onChange={(e) => setPickerBusca(e.target.value)}
              placeholder="Buscar card no workspace…"
              className="flex-1 bg-transparent outline-none text-[0.75rem]"
              style={{ color: "var(--tf-text)" }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setPicker(false);
                  setPickerBusca("");
                }
              }}
            />
          </div>
          <ul className="max-h-[180px] overflow-y-auto py-1">
            {pickerResultados.length === 0 ? (
              <li
                className="px-2 py-2 text-center text-[0.6875rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {pickerBusca ? "Nenhum resultado" : "Digite pra buscar…"}
              </li>
            ) : (
              pickerResultados.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleAdicionar(c)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-[0.75rem] transition-colors"
                    style={{ color: "var(--tf-text)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--tf-surface-hover)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {c.data_conclusao ? (
                      <CheckCircle2
                        size={11}
                        strokeWidth={2}
                        style={{ color: "var(--tf-success)" }}
                      />
                    ) : (
                      <Circle size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                    )}
                    <span className="truncate">{c.titulo}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <button
          onClick={() => setPicker(true)}
          className="flex items-center gap-1.5 h-7 px-2 text-[0.75rem] font-medium transition-colors"
          style={{
            background: "transparent",
            color: "var(--tf-text-secondary)",
            borderWidth: "1px",
            borderStyle: "dashed",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Adicionar dependência
        </button>
      )}

      {grafoAberto && (
        <GrafoDependenciasOverlay
          cartaoId={cartaoId}
          cartaoTitulo={cartaoTitulo || ""}
          onClose={() => setGrafoAberto(false)}
          onAbrirCartao={(id) => {
            setGrafoAberto(false);
            onAbrirCartao?.(id);
          }}
        />
      )}
    </div>
  );
}
