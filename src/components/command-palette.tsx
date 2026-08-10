"use client";

import { supabase } from "@/lib/supabase/client";
import { buscarGlobal, buscaHref } from "@/hooks/use-busca-global";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Folder,
  Kanban,
  Search,
  ArrowRight,
  FileText,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fadeOnly, scaleIn } from "@/lib/motion/presets";

type TipoResultado = "workspace" | "quadro" | "cartao" | "wiki" | "comentario";
type FiltroTab = "todos" | "cartao" | "quadro" | "workspace" | "wiki" | "comentario";

interface Resultado {
  id: string;
  tipo: TipoResultado;
  titulo: string;
  subtitulo?: string;
  descricaoPreview?: string;
  cor?: string;
  href: string;
}

const TABS: { id: FiltroTab; label: string }[] = [
  { id: "todos", label: "Tudo" },
  { id: "cartao", label: "Cards" },
  { id: "wiki", label: "Wiki" },
  { id: "comentario", label: "Comentários" },
  { id: "quadro", label: "Sprints" },
  { id: "workspace", label: "Workspaces" },
];

// Kbd label em mono — usado em hints de atalho.
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center h-[18px] px-1.5 text-[0.625rem]"
      style={{
        background: "var(--tf-bg-secondary)",
        color: "var(--tf-text-secondary)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [tab, setTab] = useState<FiltroTab>("todos");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const abrir = useCallback(() => {
    setAberto(true);
    setBusca("");
    setResultados([]);
    setIndiceAtivo(0);
    setTab("todos");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    setBusca("");
    setResultados([]);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "s")) {
        e.preventDefault();
        if (aberto) fechar();
        else abrir();
      }
    }
    function handleOpenEvent() {
      abrir();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, [aberto, abrir, fechar]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      setIndiceAtivo(0);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setCarregando(true);

      // Full-text search via RPC buscar_global (migration 048):
      // cobre cartoes (titulo+descricao), wiki (titulo+conteudo TipTap) e
      // comentários (texto). Workspaces e Sprints continuam com ilike — sem
      // tsvector ainda (volumes baixos, ilike é OK).
      const termoLower = busca.trim();
      const termoLike = `%${termoLower}%`;

      const [resGlobal, resWorkspaces, resQuadros] = await Promise.all([
        buscarGlobal(termoLower, 25),
        supabase.from("workspaces").select("id, nome, cor").ilike("nome", termoLike).limit(5),
        supabase
          .from("quadros")
          .select("id, nome, cor, workspace_id, status_sprint")
          .ilike("nome", termoLike)
          .limit(6),
      ]);

      const items: Resultado[] = [];

      // Workspaces
      for (const ws of resWorkspaces.data || []) {
        items.push({
          id: ws.id,
          tipo: "workspace",
          titulo: ws.nome,
          subtitulo: "Workspace",
          cor: ws.cor,
          href: `/workspace/${ws.id}`,
        });
      }

      // Sprints (quadros)
      for (const q of resQuadros.data || []) {
        const statusLabel =
          q.status_sprint === "ativa"
            ? "Ativa"
            : q.status_sprint === "concluida"
              ? "Concluida"
              : "Planejada";
        items.push({
          id: q.id,
          tipo: "quadro",
          titulo: q.nome,
          subtitulo: `Sprint · ${statusLabel}`,
          cor: q.cor,
          href: `/quadro/${q.id}`,
        });
      }

      // Cartões + Wiki + Comentários (ranqueados pela RPC)
      // O snippet vem com tags <b> destacando o match (ts_headline).
      for (const r of resGlobal) {
        if (r.tipo === "cartao") {
          items.push({
            id: r.id,
            tipo: "cartao",
            titulo: r.titulo,
            subtitulo: "Card",
            descricaoPreview: r.snippet || undefined,
            href: buscaHref(r),
          });
        } else if (r.tipo === "wiki") {
          items.push({
            id: r.id,
            tipo: "wiki",
            titulo: r.titulo,
            subtitulo: "Wiki",
            descricaoPreview: r.snippet || undefined,
            href: buscaHref(r),
          });
        } else if (r.tipo === "comentario") {
          items.push({
            id: r.id,
            tipo: "comentario",
            titulo: r.titulo || "Comentário",
            subtitulo: "Comentário",
            descricaoPreview: r.snippet || undefined,
            href: buscaHref(r),
          });
        }
      }

      setResultados(items);
      setIndiceAtivo(0);
      setCarregando(false);
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [busca]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtrados = tab === "todos" ? resultados : resultados.filter((r) => r.tipo === tab);

  // Mantém o item ativo visível ao navegar com setas. Usa `block: "nearest"`
  // pra não rolar quando já está visível (evita jitter no hover do mouse).
  // Também trunca refs ao tamanho atual da lista — refs de itens que saíram
  // por troca de tab/busca ficariam pendurados e poderiam fazer scroll errado.
  useEffect(() => {
    itemRefs.current.length = filtrados.length;
    const el = itemRefs.current[indiceAtivo];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [indiceAtivo, filtrados.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceAtivo((prev) => (prev + 1) % Math.max(filtrados.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceAtivo((prev) => (prev - 1 + filtrados.length) % Math.max(filtrados.length, 1));
    } else if (e.key === "Enter" && filtrados[indiceAtivo]) {
      e.preventDefault();
      navegar(filtrados[indiceAtivo]);
    } else if (e.key === "Escape") {
      fechar();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const tabIds = TABS.map((t) => t.id);
      const idx = tabIds.indexOf(tab);
      setTab(tabIds[(idx + 1) % tabIds.length]);
      setIndiceAtivo(0);
    }
  }

  function navegar(item: Resultado) {
    fechar();
    router.push(item.href);
  }

  const icone = (tipo: TipoResultado) => {
    switch (tipo) {
      case "workspace":
        return <Folder size={13} strokeWidth={1.75} />;
      case "quadro":
        return <Calendar size={13} strokeWidth={1.75} />;
      case "cartao":
        return <Kanban size={13} strokeWidth={1.75} />;
      case "wiki":
        return <BookOpen size={13} strokeWidth={1.75} />;
      case "comentario":
        return <MessageSquare size={13} strokeWidth={1.75} />;
    }
  };

  const labelTipo = (tipo: TipoResultado) => {
    switch (tipo) {
      case "workspace":
        return "WS";
      case "quadro":
        return "SP";
      case "cartao":
        return "CARD";
      case "wiki":
        return "WIKI";
      case "comentario":
        return "COM";
    }
  };

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          ref={overlayRef}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeOnly}
          // No mobile a paleta sobe de baixo em vez de boiar a 15% do topo.
          // O campo de busca fica onde o polegar alcanca, e com
          // interactiveWidget: "resizes-content" o teclado empurra a folha
          // para cima em vez de cobri-la. A partir de md volta ao
          // pt-[15vh] de sempre — desktop intacto.
          className="fixed inset-0 z-[100] flex items-end md:items-start justify-center pt-0 md:pt-[15vh]"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={(e) => {
            if (e.target === overlayRef.current) fechar();
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleIn}
            className={cn(
              "w-full md:max-w-[600px] mx-0 md:mx-4 h-fit overflow-hidden",
              "max-h-[85dvh] md:max-h-none",
              "rounded-t-2xl md:rounded-[var(--tf-radius-lg)]"
            )}
            style={{
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              boxShadow: "var(--tf-shadow-lg)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Search Input */}
            <div
              className="flex items-center gap-2.5 px-4 h-11"
              style={{ borderBottom: "1px solid var(--tf-border)" }}
            >
              <Search
                size={15}
                strokeWidth={1.75}
                style={{ color: "var(--tf-text-tertiary)" }}
                className="shrink-0"
              />
              <input
                ref={inputRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar workspace, sprint ou card…"
                className="flex-1 bg-transparent outline-none text-[0.875rem]"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.005em",
                }}
              />
              <Kbd>ESC</Kbd>
            </div>

            {/* Tabs */}
            {busca.trim() && resultados.length > 0 && (
              <div
                className="flex items-center gap-1 px-3 py-1.5"
                style={{ borderBottom: "1px solid var(--tf-border)" }}
              >
                {TABS.map((t) => {
                  const count =
                    t.id === "todos"
                      ? resultados.length
                      : resultados.filter((r) => r.tipo === t.id).length;
                  if (t.id !== "todos" && count === 0) return null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTab(t.id);
                        setIndiceAtivo(0);
                      }}
                      className="flex items-center gap-1.5 h-6 px-2 text-[0.6875rem] font-medium transition-all"
                      style={{
                        background:
                          tab === t.id ? "var(--tf-accent-light)" : "transparent",
                        color:
                          tab === t.id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {t.label}
                      {count > 0 && (
                        <span style={{ opacity: 0.6 }}>{count}</span>
                      )}
                    </button>
                  );
                })}
                <span
                  className="ml-auto label-mono"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Tab ↹
                </span>
              </div>
            )}

            {/* Results */}
            <div
              className="max-h-[380px] overflow-y-auto py-1.5 px-1.5"
              style={{ scrollbarWidth: "thin" }}
              aria-live="polite"
              aria-atomic="true"
            >
              {busca.trim() === "" ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Search
                    size={22}
                    strokeWidth={1.5}
                    style={{ color: "var(--tf-border-strong)" }}
                  />
                  <p
                    className="text-[0.75rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    Digite para buscar
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Kbd>↑↓</Kbd>
                      <span className="text-[0.6875rem]" style={{ color: "var(--tf-text-tertiary)" }}>
                        navegar
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Kbd>Tab</Kbd>
                      <span className="text-[0.6875rem]" style={{ color: "var(--tf-text-tertiary)" }}>
                        filtrar
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Kbd>↵</Kbd>
                      <span className="text-[0.6875rem]" style={{ color: "var(--tf-text-tertiary)" }}>
                        abrir
                      </span>
                    </span>
                  </div>
                </div>
              ) : carregando ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <div
                    className="w-3 h-3 border rounded-full animate-spin"
                    style={{
                      borderColor: "var(--tf-accent)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <span
                    className="text-[0.75rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    Buscando…
                  </span>
                </div>
              ) : filtrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-1">
                  <p
                    className="text-[0.8125rem] font-medium"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    Nenhum resultado
                  </p>
                  <p
                    className="text-[0.6875rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    tente outro termo{tab !== "todos" ? " ou outro filtro" : ""}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {filtrados.map((item, i) => {
                    const ativo = i === indiceAtivo;
                    return (
                      <button
                        key={`${item.tipo}-${item.id}`}
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        onClick={() => navegar(item)}
                        onMouseEnter={() => setIndiceAtivo(i)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 text-left outline-none"
                        )}
                        style={{
                          background: ativo ? "var(--tf-accent-light)" : "transparent",
                          borderRadius: "var(--tf-radius-xs)",
                          transition: "background 0.08s ease",
                        }}
                      >
                        <div
                          className="w-6 h-6 flex items-center justify-center shrink-0"
                          style={{
                            background: item.cor || "var(--tf-bg-secondary)",
                            color: item.cor ? "#FFFFFF" : "var(--tf-text-tertiary)",
                            border: item.cor ? "none" : "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                        >
                          {icone(item.tipo)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[0.8125rem] font-medium truncate"
                            style={{
                              color: ativo ? "var(--tf-accent-text)" : "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {item.titulo}
                          </p>
                          {item.descricaoPreview ? (
                            <p
                              className="text-[0.6875rem] truncate flex items-center gap-1 mt-0.5"
                              style={{ color: "var(--tf-text-tertiary)" }}
                            >
                              <FileText size={9} className="shrink-0" strokeWidth={1.75} />
                              {item.descricaoPreview}
                            </p>
                          ) : (
                            item.subtitulo && (
                              <p
                                className="text-[0.6875rem] truncate mt-0.5"
                                style={{
                                  color: "var(--tf-text-tertiary)",
                                  fontFamily: "var(--tf-font-mono)",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {item.subtitulo}
                              </p>
                            )
                          )}
                        </div>

                        <span
                          className="shrink-0 label-mono"
                          style={{
                            color: ativo ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
                          }}
                        >
                          {labelTipo(item.tipo)}
                        </span>

                        <ArrowRight
                          size={12}
                          strokeWidth={2}
                          className="shrink-0"
                          style={{
                            color: ativo ? "var(--tf-accent)" : "transparent",
                            transition: "color 0.08s ease",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {filtrados.length > 0 && (
              <div
                className="px-3 h-8 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--tf-border)" }}
              >
                <span
                  className="text-[0.6875rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd>
                  <span
                    className="text-[0.6875rem]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    abrir
                  </span>
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
