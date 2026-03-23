"use client";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Calendar, Folder, Kanban, Search, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Resultado {
  id: string;
  tipo: "workspace" | "quadro" | "cartao";
  titulo: string;
  subtitulo?: string;
  cor?: string;
  href: string;
}

export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Abrir/fechar
  const abrir = useCallback(() => {
    setAberto(true);
    setBusca("");
    setResultados([]);
    setIndiceAtivo(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    setBusca("");
    setResultados([]);
  }, []);

  // Listener global para ⌘K e ⌘S
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

  // Busca com debounce
  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      setIndiceAtivo(0);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setCarregando(true);
      const termo = `%${busca.trim()}%`;

      const [resWorkspaces, resQuadros, resCartoes] = await Promise.all([
        supabase
          .from("workspaces")
          .select("id, nome, cor")
          .ilike("nome", termo)
          .limit(4),
        supabase
          .from("quadros")
          .select("id, nome, cor, workspace_id")
          .ilike("nome", termo)
          .limit(5),
        supabase
          .from("cartoes")
          .select("id, titulo, coluna_id, workspace_id")
          .ilike("titulo", termo)
          .limit(6),
      ]);

      const items: Resultado[] = [];

      // Workspaces
      if (resWorkspaces.data) {
        for (const ws of resWorkspaces.data) {
          items.push({
            id: ws.id,
            tipo: "workspace",
            titulo: ws.nome,
            subtitulo: "Workspace",
            cor: ws.cor,
            href: `/workspace/${ws.id}`,
          });
        }
      }

      // Quadros/Sprints
      if (resQuadros.data) {
        for (const q of resQuadros.data) {
          items.push({
            id: q.id,
            tipo: "quadro",
            titulo: q.nome,
            subtitulo: "Sprint",
            cor: q.cor,
            href: `/quadro/${q.id}`,
          });
        }
      }

      // Cartões — precisam buscar o quadro_id via coluna
      if (resCartoes.data && resCartoes.data.length > 0) {
        // Pegar coluna_ids dos cartões que têm coluna
        const colunaIds = resCartoes.data
          .filter((c) => c.coluna_id)
          .map((c) => c.coluna_id as string);

        let colunaMap: Record<string, string> = {};
        if (colunaIds.length > 0) {
          const { data: colunas } = await supabase
            .from("colunas")
            .select("id, quadro_id")
            .in("id", colunaIds);
          if (colunas) {
            for (const col of colunas) {
              colunaMap[col.id] = col.quadro_id;
            }
          }
        }

        for (const c of resCartoes.data) {
          const quadroId = c.coluna_id ? colunaMap[c.coluna_id] : null;
          if (quadroId) {
            items.push({
              id: c.id,
              tipo: "cartao",
              titulo: c.titulo,
              subtitulo: "Card",
              href: `/quadro/${quadroId}`,
            });
          }
        }
      }

      setResultados(items);
      setIndiceAtivo(0);
      setCarregando(false);
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [busca]);

  // Navegação por teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceAtivo((prev) => (prev + 1) % Math.max(resultados.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceAtivo((prev) => (prev - 1 + resultados.length) % Math.max(resultados.length, 1));
    } else if (e.key === "Enter" && resultados[indiceAtivo]) {
      e.preventDefault();
      navegar(resultados[indiceAtivo]);
    } else if (e.key === "Escape") {
      fechar();
    }
  }

  function navegar(item: Resultado) {
    fechar();
    router.push(item.href);
  }

  const icone = (tipo: Resultado["tipo"]) => {
    switch (tipo) {
      case "workspace": return <Folder size={16} />;
      case "quadro": return <Calendar size={16} />;
      case "cartao": return <Kanban size={16} />;
    }
  };

  const labelTipo = (tipo: Resultado["tipo"]) => {
    switch (tipo) {
      case "workspace": return "WORKSPACE";
      case "quadro": return "SPRINT";
      case "cartao": return "CARD";
    }
  };

  if (!aberto) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex justify-center pt-[18vh]"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) fechar(); }}
    >
      <div
        className="w-full max-w-[540px] mx-4 h-fit rounded-[20px] overflow-hidden border"
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          animation: "paletteIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <style>{`
          @keyframes paletteIn {
            0% { opacity: 0; transform: scale(0.97) translateY(-8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--tf-border)" }}>
          <Search size={20} style={{ color: "var(--tf-text-tertiary)" }} className="shrink-0" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar workspaces, sprints, cards..."
            className="flex-1 bg-transparent outline-none text-[15px] font-medium"
            style={{ color: "var(--tf-text)" }}
          />
          <kbd
            className="text-[10px] font-bold px-2 py-1 rounded-[8px] tracking-wide shrink-0"
            style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          className="max-h-[360px] overflow-y-auto py-2 px-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {busca.trim() === "" ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search size={28} style={{ color: "var(--tf-border)" }} />
              <p className="text-[13px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
                Digite para buscar...
              </p>
              <div className="flex items-center gap-3 mt-2">
                <kbd className="text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>⌘K</kbd>
                <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>para abrir</span>
                <kbd className="text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>↑↓</kbd>
                <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>navegar</span>
                <kbd className="text-[10px] font-bold px-2 py-0.5 rounded-[4px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>↵</kbd>
                <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>abrir</span>
              </div>
            </div>
          ) : carregando ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
              <span className="text-[13px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>Buscando...</span>
            </div>
          ) : resultados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1">
              <p className="text-[13px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>
                Nenhum resultado
              </p>
              <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                Tente um termo diferente
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {resultados.map((item, i) => (
                <button
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => navegar(item)}
                  onMouseEnter={() => setIndiceAtivo(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left group",
                  )}
                  style={{
                    background: i === indiceAtivo ? "var(--tf-accent-light)" : "transparent",
                    transition: "background 0.1s ease",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{
                      background: item.cor || "var(--tf-bg-secondary)",
                      color: item.cor ? "white" : "var(--tf-text-tertiary)",
                    }}
                  >
                    {icone(item.tipo)}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--tf-text)" }}>
                      {item.titulo}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span
                    className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
                  >
                    {labelTipo(item.tipo)}
                  </span>

                  {/* Arrow */}
                  <ArrowRight
                    size={14}
                    className="shrink-0"
                    style={{
                      color: i === indiceAtivo ? "var(--tf-accent)" : "transparent",
                      transition: "color 0.1s ease",
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {resultados.length > 0 && (
          <div className="px-5 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--tf-border)" }}>
            <span className="text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
              {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
            </span>
            <div className="flex items-center gap-2">
              <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>↵</kbd>
              <span className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>abrir</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
