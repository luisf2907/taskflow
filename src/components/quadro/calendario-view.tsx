"use client";

import { CartaoComResumo } from "@/hooks/use-cartoes";
import type { Coluna, Etiqueta, Membro } from "@/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "./avatar";

// =============================================
// DATE HELPERS — locais, sem date-fns
// =============================================
type DateKey = string; // "YYYY-MM-DD"

function dateKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(s: string | null): Date | null {
  if (!s) return null;
  // data_entrega pode vir como ISO ou YYYY-MM-DD. Normaliza pra YYYY-MM-DD.
  const onlyDate = s.slice(0, 10);
  const [y, m, d] = onlyDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  // Semana começa no domingo (0)
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(d.getMonth() + n);
  return r;
}

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const NOMES_DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// =============================================
// TIPOS
// =============================================
type Periodo = "mes" | "semana";

interface CalendarioViewProps {
  colunas: Coluna[];
  cartoesFiltradosPorColuna: Record<string, CartaoComResumo[]>;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
  onAtualizar: (id: string, campos: Record<string, unknown>) => void;
}

// =============================================
// CARTÃO COMPACTO — usado nos dias e no overlay de drag
// =============================================
function CalendarioCartao({
  cartao,
  etiquetas,
  membros,
  onClick,
}: {
  cartao: CartaoComResumo;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onClick: () => void;
}) {
  const cardEtiquetas = etiquetas.filter((e) => cartao.etiqueta_ids.includes(e.id));
  const cardMembros = membros.filter((m) => cartao.membro_ids.includes(m.id));
  const concluido = !!cartao.data_conclusao;
  const corPrincipal = cardEtiquetas[0]?.cor;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-1.5 py-1 transition-colors group"
      style={{
        background: "var(--tf-surface)",
        border: `1px solid ${corPrincipal || "var(--tf-border)"}`,
        borderLeftWidth: corPrincipal ? "3px" : "1px",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--tf-surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--tf-surface)";
      }}
    >
      <div className="flex items-center gap-1">
        <span
          className="flex-1 truncate text-[0.6875rem] font-medium"
          style={{
            color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
            textDecoration: concluido ? "line-through" : "none",
            letterSpacing: "-0.005em",
          }}
        >
          {cartao.titulo}
        </span>
        {cartao.peso != null && (
          <span
            className="text-[0.5625rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {cartao.peso}
          </span>
        )}
      </div>
      {cardMembros.length > 0 && (
        <div className="flex -space-x-0.5 mt-0.5">
          {cardMembros.slice(0, 3).map((m) => (
            <div
              key={m.id}
              style={{
                outline: "1px solid var(--tf-surface)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              <Avatar membro={m} tamanho="sm" />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// =============================================
// CARTÃO ARRASTÁVEL
// =============================================
function CartaoArrastavel({
  cartao,
  etiquetas,
  membros,
  onClick,
}: {
  cartao: CartaoComResumo;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cal-card-${cartao.id}`,
    data: { cartao },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        cursor: "grab",
        // "none" bloqueia QUALQUER rolagem iniciada em cima do cartao, e
        // aqui o cartao ocupa boa parte da celula — no celular a agenda
        // ficava impossivel de rolar. O sensor de toque desta view tambem e
        // por atraso (250ms), entao "manipulation" e o valor certo: o
        // navegador rola no swipe e o dnd assume no toque longo.
        // (backlog-row.tsx mantem "none" de proposito: la o alvo e um
        // punho de arrasto de 32px, nao a linha inteira.)
        touchAction: "manipulation",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <CalendarioCartao
        cartao={cartao}
        etiquetas={etiquetas}
        membros={membros}
        onClick={onClick}
      />
    </div>
  );
}

// =============================================
// CÉLULA DE DIA (droppable)
// =============================================
function CelulaDia({
  data,
  cartoes,
  etiquetas,
  membros,
  noMesAtual,
  onCartaoClick,
  variant = "mes",
}: {
  data: Date;
  cartoes: CartaoComResumo[];
  etiquetas: Etiqueta[];
  membros: Membro[];
  noMesAtual: boolean;
  onCartaoClick: (c: CartaoComResumo) => void;
  variant?: "mes" | "semana";
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cal-dia-${dateKey(data)}`,
    data: { data: dateKey(data) },
  });

  const hoje = isSameDay(data, new Date());

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-1 p-1.5 overflow-hidden"
      style={{
        background: isOver
          ? "var(--tf-accent-light)"
          : noMesAtual
            ? "var(--tf-bg-secondary)"
            : "var(--tf-surface)",
        border: `1px solid ${isOver ? "var(--tf-accent)" : "var(--tf-border)"}`,
        borderRadius: "var(--tf-radius-xs)",
        minHeight: variant === "mes" ? 96 : 200,
        opacity: noMesAtual ? 0.55 : 1,
        transition: "background 0.08s ease, border-color 0.08s ease",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[0.6875rem] font-medium"
          style={{
            background: hoje ? "var(--tf-accent)" : "transparent",
            color: hoje
              ? "#fff"
              : noMesAtual
                ? "var(--tf-text-tertiary)"
                : "var(--tf-text)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
        >
          {data.getDate()}
        </span>
        {cartoes.length > 3 && variant === "mes" && (
          <span
            className="text-[0.5625rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            +{cartoes.length - 3}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {(variant === "mes" ? cartoes.slice(0, 3) : cartoes).map((c) => (
          <CartaoArrastavel
            key={c.id}
            cartao={c}
            etiquetas={etiquetas}
            membros={membros}
            onClick={() => onCartaoClick(c)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================
// SIDEBAR (cards sem data) — droppable também (pra remover data)
// =============================================
function Sidebar({
  cartoesSemData,
  etiquetas,
  membros,
  onCartaoClick,
}: {
  cartoesSemData: CartaoComResumo[];
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "cal-sem-data",
    data: { data: null },
  });

  return (
    <aside
      ref={setNodeRef}
      className="w-60 shrink-0 flex flex-col overflow-hidden"
      style={{
        background: isOver ? "var(--tf-accent-light)" : "var(--tf-surface)",
        border: `1px solid ${isOver ? "var(--tf-accent)" : "var(--tf-border)"}`,
        borderRadius: "var(--tf-radius-md)",
        transition: "background 0.08s ease, border-color 0.08s ease",
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 h-8 shrink-0"
        style={{ borderBottom: "1px solid var(--tf-border)" }}
      >
        <CalendarOff
          size={11}
          strokeWidth={1.75}
          style={{ color: "var(--tf-text-tertiary)" }}
        />
        <h3
          className="text-[0.6875rem] font-medium"
          style={{
            color: "var(--tf-text-secondary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Sem data ({cartoesSemData.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {cartoesSemData.length === 0 ? (
          <p
            className="text-[0.6875rem] text-center py-4 px-2"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            Arraste cards aqui pra remover prazo
          </p>
        ) : (
          cartoesSemData.map((c) => (
            <CartaoArrastavel
              key={c.id}
              cartao={c}
              etiquetas={etiquetas}
              membros={membros}
              onClick={() => onCartaoClick(c)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

// =============================================
// VIEW PRINCIPAL
// =============================================
export function CalendarioView({
  colunas,
  cartoesFiltradosPorColuna,
  etiquetas,
  membros,
  onCartaoClick,
  onAtualizar,
}: CalendarioViewProps) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [referencia, setReferencia] = useState<Date>(() => new Date());
  const [arrastando, setArrastando] = useState<CartaoComResumo | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  // Flatten todos os cards filtrados.
  const cartoesPlanos = useMemo(() => {
    const arr: CartaoComResumo[] = [];
    for (const coluna of colunas) {
      arr.push(...(cartoesFiltradosPorColuna[coluna.id] || []));
    }
    return arr;
  }, [colunas, cartoesFiltradosPorColuna]);

  // Agrupa por data_entrega.
  const { cartoesPorDia, cartoesSemData } = useMemo(() => {
    const map: Record<DateKey, CartaoComResumo[]> = {};
    const semData: CartaoComResumo[] = [];
    for (const c of cartoesPlanos) {
      const d = parseDateKey(c.data_entrega);
      if (d) {
        const k = dateKey(d);
        (map[k] ||= []).push(c);
      } else {
        semData.push(c);
      }
    }
    return { cartoesPorDia: map, cartoesSemData: semData };
  }, [cartoesPlanos]);

  // Gera as datas exibidas no grid.
  const datasGrid = useMemo<Date[]>(() => {
    if (periodo === "semana") {
      const inicio = startOfWeek(referencia);
      return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
    }
    // Mês: começa no domingo da semana do dia 1, vai por 6 semanas (42 células)
    const primeiroDoMes = new Date(
      referencia.getFullYear(),
      referencia.getMonth(),
      1
    );
    const inicio = startOfWeek(primeiroDoMes);
    return Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  }, [referencia, periodo]);

  const tituloHeader = useMemo(() => {
    if (periodo === "semana") {
      const fim = addDays(startOfWeek(referencia), 6);
      const inicioStr = `${startOfWeek(referencia).getDate()} ${NOMES_MES[startOfWeek(referencia).getMonth()].slice(0, 3)}`;
      const fimStr = `${fim.getDate()} ${NOMES_MES[fim.getMonth()].slice(0, 3)} ${fim.getFullYear()}`;
      return `${inicioStr} – ${fimStr}`;
    }
    return `${NOMES_MES[referencia.getMonth()]} ${referencia.getFullYear()}`;
  }, [referencia, periodo]);

  function handleDragEnd(e: DragEndEvent) {
    setArrastando(null);
    const cartao = e.active.data.current?.cartao as CartaoComResumo | undefined;
    if (!cartao) return;
    const targetData = e.over?.data.current?.data as string | null | undefined;
    if (targetData === undefined) return; // dropped fora de qualquer alvo

    const dataAtual = cartao.data_entrega ? cartao.data_entrega.slice(0, 10) : null;
    const novaData = targetData; // null = sem data
    if (dataAtual === novaData) return;

    // Persistência (otimista — o caller já faz mutate via SWR)
    onAtualizar(cartao.id, { data_entrega: novaData });
  }

  function handleHoje() {
    setReferencia(new Date());
  }

  function handlePrev() {
    setReferencia((r) => (periodo === "semana" ? addDays(r, -7) : addMonths(r, -1)));
  }

  function handleNext() {
    setReferencia((r) => (periodo === "semana" ? addDays(r, 7) : addMonths(r, 1)));
  }

  return (
    <div className="flex-1 flex flex-col gap-3 px-3 md:px-4 lg:px-6 pb-6 overflow-hidden">
      {/* Header de navegação */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleHoje}
          className="h-7 px-2.5 text-[0.6875rem] font-medium transition-colors"
          style={{
            background: "transparent",
            color: "var(--tf-text-secondary)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Hoje
        </button>
        <div className="flex items-center">
          <button
            onClick={handlePrev}
            aria-label="Anterior"
            className="w-7 h-7 flex items-center justify-center transition-colors"
            style={{
              color: "var(--tf-text-secondary)",
              border: "1px solid var(--tf-border)",
              borderRight: "none",
              borderTopLeftRadius: "var(--tf-radius-xs)",
              borderBottomLeftRadius: "var(--tf-radius-xs)",
            }}
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            onClick={handleNext}
            aria-label="Próximo"
            className="w-7 h-7 flex items-center justify-center transition-colors"
            style={{
              color: "var(--tf-text-secondary)",
              border: "1px solid var(--tf-border)",
              borderTopRightRadius: "var(--tf-radius-xs)",
              borderBottomRightRadius: "var(--tf-radius-xs)",
            }}
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>

        <h2
          className="text-[0.875rem] font-semibold"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.01em",
          }}
        >
          {tituloHeader}
        </h2>

        <div className="ml-auto flex items-center gap-0.5">
          {(["mes", "semana"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className="h-7 px-2.5 text-[0.6875rem] font-medium transition-colors"
              style={{
                background: periodo === p ? "var(--tf-accent-light)" : "transparent",
                color:
                  periodo === p ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                border: `1px solid ${periodo === p ? "var(--tf-accent)" : "var(--tf-border)"}`,
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {p === "mes" ? "Mês" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* Layout principal: calendário + sidebar */}
      <DndContext
        sensors={sensors}
        onDragStart={(e) =>
          setArrastando((e.active.data.current?.cartao as CartaoComResumo) || null)
        }
        onDragCancel={() => setArrastando(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
          {/* Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
              {NOMES_DIA_CURTO.map((n) => (
                <div
                  key={n}
                  className="text-[0.625rem] font-medium text-center py-1"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {n}
                </div>
              ))}
            </div>

            {/* Grid de células */}
            <div
              className={
                periodo === "semana"
                  ? "grid grid-cols-7 gap-1 flex-1 min-h-0 overflow-y-auto"
                  : "grid grid-cols-7 gap-1 flex-1 min-h-0 overflow-y-auto auto-rows-fr"
              }
            >
              {datasGrid.map((d) => {
                const noMes = d.getMonth() === referencia.getMonth();
                return (
                  <CelulaDia
                    key={dateKey(d)}
                    data={d}
                    cartoes={cartoesPorDia[dateKey(d)] || []}
                    etiquetas={etiquetas}
                    membros={membros}
                    noMesAtual={periodo === "semana" ? true : noMes}
                    onCartaoClick={onCartaoClick}
                    variant={periodo}
                  />
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar
            cartoesSemData={cartoesSemData}
            etiquetas={etiquetas}
            membros={membros}
            onCartaoClick={onCartaoClick}
          />
        </div>

        <DragOverlay>
          {arrastando && (
            <div className="rotate-2 w-[200px] shadow-lg">
              <CalendarioCartao
                cartao={arrastando}
                etiquetas={etiquetas}
                membros={membros}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
