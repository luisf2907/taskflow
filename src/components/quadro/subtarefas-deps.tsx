"use client";

import { useDependencias } from "@/hooks/use-dependencias";
import { useSubtarefas } from "@/hooks/use-subtarefas";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { CheckCircle2, Circle, GitBranch, Link2, Lock, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CartaoLite {
  id: string;
  titulo: string;
  data_conclusao: string | null;
}

interface Props {
  cartaoId: string;
  workspaceId: string | null;
  onAbrirCartao?: (id: string) => void;
}

// =============================================
// SUBTAREFAS
// =============================================
function SecaoSubtarefas({ cartaoId, workspaceId, onAbrirCartao }: Props) {
  const {
    subtarefas,
    total,
    concluidas,
    criarRapida,
    desvincular,
  } = useSubtarefas(cartaoId, workspaceId);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adicionando) inputRef.current?.focus();
  }, [adicionando]);

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    const t = novoTitulo.trim();
    if (!t) return;
    try {
      await criarRapida(t);
      setNovoTitulo("");
      inputRef.current?.focus();
    } catch {
      toast.error("Erro ao criar subtarefa");
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <GitBranch size={14} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
        <h3
          className="text-[0.6875rem] font-medium"
          style={{
            color: "var(--tf-text-secondary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Subtarefas
        </h3>
        {total > 0 && (
          <span
            className="text-[0.625rem] font-medium px-1.5 h-[16px] inline-flex items-center"
            style={{
              background: concluidas === total ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
              color: concluidas === total ? "var(--tf-success)" : "var(--tf-text-tertiary)",
              border: `1px solid ${concluidas === total ? "var(--tf-success)" : "var(--tf-border)"}`,
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {concluidas}/{total}
          </span>
        )}
      </div>

      {subtarefas.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {subtarefas.map((s) => {
            const concluida = !!s.data_conclusao;
            return (
              <li
                key={s.id}
                className="group flex items-center gap-2 px-1.5 py-1 transition-colors"
                style={{ borderRadius: "var(--tf-radius-xs)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--tf-surface-hover)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {concluida ? (
                  <CheckCircle2 size={12} strokeWidth={2} style={{ color: "var(--tf-success)" }} />
                ) : (
                  <Circle size={12} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                )}
                <button
                  onClick={() => onAbrirCartao?.(s.id)}
                  className="flex-1 text-left text-[0.8125rem] truncate"
                  style={{
                    color: concluida ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                    textDecoration: concluida ? "line-through" : "none",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {s.titulo}
                </button>
                {s.peso != null && (
                  <span
                    className="text-[0.625rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {s.peso}
                  </span>
                )}
                <button
                  onClick={() => desvincular(s.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--tf-text-tertiary)" }}
                  aria-label="Desvincular subtarefa"
                  title="Desvincular (vira card independente)"
                >
                  <X size={11} strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adicionando ? (
        <form onSubmit={handleAdicionar} className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            onBlur={() => {
              if (!novoTitulo.trim()) setAdicionando(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAdicionando(false);
                setNovoTitulo("");
              }
            }}
            placeholder="Título da subtarefa…"
            className="flex-1 h-7 px-2 text-[0.8125rem] outline-none"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              color: "var(--tf-text)",
            }}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="flex items-center gap-1.5 h-7 px-2 text-[0.75rem] font-medium transition-colors"
          style={{
            background: "transparent",
            color: "var(--tf-text-secondary)",
            border: "1px dashed var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Adicionar subtarefa
        </button>
      )}
    </div>
  );
}

// =============================================
// DEPENDÊNCIAS
// =============================================
function SecaoDependencias({ cartaoId, workspaceId, onAbrirCartao }: Props) {
  const { bloqueando, bloqueadoPor, estaBloqueado, adicionar, remover } = useDependencias(cartaoId);
  const [picker, setPicker] = useState(false);
  const [pickerBusca, setPickerBusca] = useState("");
  const [pickerResultados, setPickerResultados] = useState<CartaoLite[]>([]);
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
        // Filtra os já vinculados
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
            border: "1px dashed var(--tf-border)",
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
              border: "1px solid var(--tf-warning)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            <Lock size={9} strokeWidth={2} />
            Bloqueado
          </span>
        )}
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
            border: "1px solid var(--tf-border)",
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
            border: "1px dashed var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Adicionar dependência
        </button>
      )}
    </div>
  );
}

// =============================================
// EXPORT — wrapper que renderiza ambas as seções
// =============================================
export function SubtarefasDeps({ cartaoId, workspaceId, onAbrirCartao }: Props) {
  return (
    <div className="space-y-6">
      <SecaoSubtarefas cartaoId={cartaoId} workspaceId={workspaceId} onAbrirCartao={onAbrirCartao} />
      <SecaoDependencias cartaoId={cartaoId} workspaceId={workspaceId} onAbrirCartao={onAbrirCartao} />
    </div>
  );
}

/** Indicador compacto pra usar no card visual (Cartao component).
 *  Mostra "🔒 N" quando há deps abertas e/ou "X/Y" pra subtarefas. */
export function CartaoDepsBadge({
  cartaoId,
  workspaceId,
}: {
  cartaoId: string;
  workspaceId: string | null;
}) {
  const { estaBloqueado, bloqueando } = useDependencias(cartaoId);
  const { total, concluidas } = useSubtarefas(cartaoId, workspaceId);

  const depsAbertas = bloqueando.filter((d) => {
    const dep = (d as unknown as { depende_de: { data_conclusao: string | null } | null }).depende_de;
    return dep && !dep.data_conclusao;
  }).length;

  if (!estaBloqueado && total === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {estaBloqueado && (
        <span
          className="inline-flex items-center gap-0.5 text-[0.5625rem] font-medium px-1 h-[14px]"
          style={{
            background: "var(--tf-warning-bg)",
            color: "var(--tf-warning)",
            border: "1px solid var(--tf-warning)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
          title={`Bloqueado por ${depsAbertas} card(s)`}
        >
          <Lock size={8} strokeWidth={2} />
          {depsAbertas}
        </span>
      )}
      {total > 0 && (
        <span
          className="inline-flex items-center gap-0.5 text-[0.5625rem] font-medium px-1 h-[14px]"
          style={{
            background: concluidas === total ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
            color: concluidas === total ? "var(--tf-success)" : "var(--tf-text-tertiary)",
            border: `1px solid ${concluidas === total ? "var(--tf-success)" : "var(--tf-border)"}`,
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
          title={`${concluidas} de ${total} subtarefas concluídas`}
        >
          <GitBranch size={8} strokeWidth={2} />
          {concluidas}/{total}
        </span>
      )}
    </div>
  );
}
