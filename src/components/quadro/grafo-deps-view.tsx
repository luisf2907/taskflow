"use client";

import { useCardsSemDep, useGrafoWorkspace } from "@/hooks/use-grafo-dependencias";
import { CheckCircle2, ChevronRight, Circle, Filter, Inbox, Network } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { EpicoMarker } from "./epico-marker";
import { GrafoCanvas } from "./grafo-dependencias";

interface Props {
  workspaceId: string | null;
}

const BACKLOG_KEY = "__backlog__";

export function GrafoDepsView({ workspaceId }: Props) {
  const { nos, arestas, carregando } = useGrafoWorkspace(workspaceId);
  const { cards: cardsSemDep } = useCardsSemDep(workspaceId);
  const router = useRouter();
  const [sprintsSel, setSprintsSel] = useState<Set<string>>(new Set());
  const [epicosSel, setEpicosSel] = useState<Set<string>>(new Set());
  const [bandejaAberta, setBandejaAberta] = useState(false);

  // Opções de filtro derivadas dos nós
  const { sprints, epicos } = useMemo(() => {
    const sprintMap = new Map<string, string>(); // key → label
    const epicoMap = new Map<string, { titulo: string; cor: string | null }>();
    for (const n of nos) {
      const sKey = n.quadro_id || BACKLOG_KEY;
      sprintMap.set(sKey, n.quadro_nome || "Backlog");
      if (n.epico_id) {
        epicoMap.set(n.epico_id, {
          titulo: n.epico_titulo || "Épico",
          cor: n.cor_epico,
        });
      }
    }
    return {
      sprints: [...sprintMap.entries()].map(([key, label]) => ({ key, label })),
      epicos: [...epicoMap.entries()].map(([id, v]) => ({ id, ...v })),
    };
  }, [nos]);

  // Aplica filtros + remove nós isolados (sem aresta sobrevivente)
  const { nosFiltrados, arestasFiltradas, quadroDeId } = useMemo(() => {
    const quadroDeId = new Map<string, string | null>();
    for (const n of nos) quadroDeId.set(n.id, n.quadro_id);

    const passaFiltro = (id: string): boolean => {
      const n = nos.find((x) => x.id === id);
      if (!n) return false;
      const sKey = n.quadro_id || BACKLOG_KEY;
      const sprintOk = sprintsSel.size === 0 || sprintsSel.has(sKey);
      const epicoOk =
        epicosSel.size === 0 || (!!n.epico_id && epicosSel.has(n.epico_id));
      return sprintOk && epicoOk;
    };

    const arestasFiltradas = arestas.filter(
      (a) => passaFiltro(a.origem) && passaFiltro(a.destino)
    );
    const conectados = new Set<string>();
    for (const a of arestasFiltradas) {
      conectados.add(a.origem);
      conectados.add(a.destino);
    }
    const nosFiltrados = nos.filter((n) => conectados.has(n.id));
    return { nosFiltrados, arestasFiltradas, quadroDeId };
  }, [nos, arestas, sprintsSel, epicosSel]);

  const abrirNo = useCallback(
    (id: string) => {
      const quadroId = quadroDeId.get(id);
      if (quadroId) router.push(`/quadro/${quadroId}?card=${id}`);
      else if (workspaceId) router.push(`/workspace/${workspaceId}?card=${id}`);
    },
    [quadroDeId, router, workspaceId]
  );

  function abrirCard(quadroId: string | null, id: string) {
    if (quadroId) router.push(`/quadro/${quadroId}?card=${id}`);
    else if (workspaceId) router.push(`/workspace/${workspaceId}?card=${id}`);
  }

  // Cards sem dep: aplica os MESMOS filtros e agrupa por sprint.
  const semDepAgrupados = useMemo(() => {
    const filtrados = cardsSemDep.filter((c) => {
      const sKey = c.quadro_id || BACKLOG_KEY;
      const sprintOk = sprintsSel.size === 0 || sprintsSel.has(sKey);
      const epicoOk =
        epicosSel.size === 0 || (!!c.epico_id && epicosSel.has(c.epico_id));
      return sprintOk && epicoOk;
    });
    const grupos = new Map<string, { label: string; cards: typeof filtrados }>();
    for (const c of filtrados) {
      const sKey = c.quadro_id || BACKLOG_KEY;
      if (!grupos.has(sKey)) {
        grupos.set(sKey, { label: c.quadro_nome || "Backlog", cards: [] });
      }
      grupos.get(sKey)!.cards.push(c);
    }
    return { total: filtrados.length, grupos: [...grupos.values()] };
  }, [cardsSemDep, sprintsSel, epicosSel]);

  function toggle(set: Set<string>, key: string): Set<string> {
    const novo = new Set(set);
    if (novo.has(key)) novo.delete(key);
    else novo.add(key);
    return novo;
  }

  const semDeps = !carregando && nos.length === 0;

  if (semDeps) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
        <Network size={28} strokeWidth={1.5} style={{ color: "var(--tf-border-strong)" }} />
        <div className="text-center">
          <p className="text-[0.875rem] font-medium" style={{ color: "var(--tf-text-secondary)" }}>
            Nenhuma dependência no workspace
          </p>
          <p
            className="text-[0.75rem] mt-1"
            style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
          >
            Vincule dependências entre cards (no detalhe) pra ver o grafo aqui
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-3 md:px-4 lg:px-6 pb-4">
      {/* Barra de filtros */}
      <div className="flex items-start gap-3 py-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5 h-6" style={{ color: "var(--tf-text-tertiary)" }}>
          <Filter size={12} strokeWidth={1.75} />
          <span
            className="text-[0.625rem] font-medium"
            style={{ fontFamily: "var(--tf-font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Filtrar
          </span>
        </div>

        {/* Sprints */}
        {sprints.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            {sprints.map((s) => {
              const ativo = sprintsSel.has(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => setSprintsSel((prev) => toggle(prev, s.key))}
                  className="h-6 px-2 text-[0.625rem] font-medium transition-colors"
                  style={{
                    background: ativo ? "var(--tf-accent-light)" : "transparent",
                    color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: ativo ? "var(--tf-accent)" : "var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Épicos */}
        {epicos.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {epicos.map((e) => {
              const ativo = epicosSel.has(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => setEpicosSel((prev) => toggle(prev, e.id))}
                  className="h-6 px-2 text-[0.625rem] font-medium transition-colors flex items-center gap-1"
                  style={{
                    background: ativo ? "var(--tf-accent-light)" : "transparent",
                    color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: ativo ? "var(--tf-accent)" : "var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  <EpicoMarker cor={e.cor} titulo={e.titulo} enfase tamanho={8} />
                  {e.titulo}
                </button>
              );
            })}
          </div>
        )}

        {(sprintsSel.size > 0 || epicosSel.size > 0) && (
          <button
            onClick={() => {
              setSprintsSel(new Set());
              setEpicosSel(new Set());
            }}
            className="h-6 px-2 text-[0.6rem] font-medium transition-colors ml-auto"
            style={{
              color: "var(--tf-danger)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Canvas */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{
          background: "var(--tf-surface)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <GrafoCanvas
          nos={nosFiltrados}
          arestas={arestasFiltradas}
          carregando={carregando}
          onAbrirNo={abrirNo}
          emptyMsg="Nenhuma dependência bate com os filtros"
        />
      </div>

      {/* Bandeja: tarefas sem dependência (colapsável) */}
      {semDepAgrupados.total > 0 && (
        <div
          className="mt-2 shrink-0 overflow-hidden"
          style={{
            background: "var(--tf-surface)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          <button
            onClick={() => setBandejaAberta((v) => !v)}
            className="w-full flex items-center gap-2 px-3 h-9 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span
              aria-hidden
              style={{
                color: "var(--tf-text-tertiary)",
                transition: "transform 0.15s ease",
                transform: bandejaAberta ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <ChevronRight size={13} strokeWidth={2} />
            </span>
            <Inbox size={13} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
            <span className="text-[0.75rem] font-medium" style={{ color: "var(--tf-text-secondary)" }}>
              Tarefas sem dependência
            </span>
            <span
              className="text-[0.625rem] font-medium px-1.5 h-[16px] inline-flex items-center"
              style={{
                color: "var(--tf-text-tertiary)",
                background: "var(--tf-bg-secondary)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {semDepAgrupados.total}
            </span>
            <span
              className="ml-auto text-[0.625rem]"
              style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
            >
              {bandejaAberta ? "ocultar" : "trabalho independente, sem bloqueios"}
            </span>
          </button>

          {bandejaAberta && (
            <div
              className="px-3 pb-3 pt-1 max-h-[28vh] overflow-y-auto flex flex-col gap-3"
              style={{ borderTop: "1px solid var(--tf-border-subtle)" }}
            >
              {semDepAgrupados.grupos.map((g) => (
                <div key={g.label}>
                  <p
                    className="text-[0.6rem] font-medium mb-1.5"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {g.label} · {g.cards.length}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.cards.map((c) => {
                      const concluido = !!c.data_conclusao;
                      return (
                        <button
                          key={c.id}
                          onClick={() => abrirCard(c.quadro_id, c.id)}
                          className="flex items-center gap-1.5 h-7 pl-1.5 pr-2 max-w-[220px] transition-colors"
                          style={{
                            background: "var(--tf-bg-secondary)",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: "var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "var(--tf-border)")
                          }
                          title={c.titulo}
                        >
                          {concluido ? (
                            <CheckCircle2
                              size={11}
                              strokeWidth={2}
                              style={{ color: "var(--tf-success)", flexShrink: 0 }}
                            />
                          ) : (
                            <Circle
                              size={11}
                              strokeWidth={1.75}
                              style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }}
                            />
                          )}
                          {c.epico_cor && (
                            <EpicoMarker cor={c.epico_cor} titulo={c.epico_titulo} tamanho={7} />
                          )}
                          <span
                            className="text-[0.75rem] truncate"
                            style={{
                              color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                              textDecoration: concluido ? "line-through" : "none",
                            }}
                          >
                            {c.titulo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
