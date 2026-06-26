"use client";

import { useCamposCustomizados } from "@/hooks/use-campos-customizados";
import { useCartaoCampos } from "@/hooks/use-cartao-campos";
import { CampoCustomizado } from "@/types";
import { Calendar, Check, ChevronDown, Hash, ListFilter, Sliders, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  cartaoId: string;
  workspaceId: string | null;
}

// =============================================
// Inputs por tipo
// =============================================
function InputTexto({
  valor,
  onSave,
}: {
  valor: string | null;
  onSave: (v: string | null) => void;
}) {
  const [v, setV] = useState(valor || "");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV(valor || "");
  }, [valor]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const novo = v.trim() || null;
        if (novo !== (valor || null)) onSave(novo);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder="—"
      className="w-full h-7 px-1.5 text-[0.75rem] outline-none bg-transparent"
      style={{
        color: "var(--tf-text)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "transparent",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--tf-border)";
        e.currentTarget.style.background = "var(--tf-surface)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.background = "transparent";
        }
      }}
    />
  );
}

function InputNumero({
  valor,
  onSave,
}: {
  valor: number | null;
  onSave: (v: number | null) => void;
}) {
  const [v, setV] = useState(valor != null ? String(valor) : "");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV(valor != null ? String(valor) : "");
  }, [valor]);
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const trimmed = v.trim();
        const novo = trimmed === "" ? null : Number(trimmed);
        if (novo !== null && Number.isNaN(novo)) return;
        if (novo !== (valor ?? null)) onSave(novo);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder="—"
      className="w-full h-7 px-1.5 text-[0.75rem] outline-none bg-transparent"
      style={{
        color: "var(--tf-text)",
        fontFamily: "var(--tf-font-mono)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "transparent",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--tf-border)";
        e.currentTarget.style.background = "var(--tf-surface)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.background = "transparent";
        }
      }}
    />
  );
}

function InputData({
  valor,
  onSave,
}: {
  valor: string | null;
  onSave: (v: string | null) => void;
}) {
  return (
    <input
      type="date"
      value={valor || ""}
      onChange={(e) => onSave(e.target.value || null)}
      className="w-full h-7 px-1.5 text-[0.75rem] outline-none bg-transparent"
      style={{
        color: "var(--tf-text)",
        fontFamily: "var(--tf-font-mono)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "transparent",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--tf-border)";
        e.currentTarget.style.background = "var(--tf-surface)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.background = "transparent";
      }}
    />
  );
}

function InputSelect({
  valor,
  opcoes,
  onSave,
}: {
  valor: string | null;
  opcoes: string[];
  onSave: (v: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full h-7 px-1.5 flex items-center gap-1 text-[0.75rem] outline-none transition-colors"
        style={{
          color: valor ? "var(--tf-text)" : "var(--tf-text-tertiary)",
          background: "transparent",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: aberto ? "var(--tf-accent)" : "transparent",
          borderRadius: "var(--tf-radius-xs)",
        }}
        onMouseEnter={(e) => {
          if (!aberto) e.currentTarget.style.background = "var(--tf-surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!aberto) e.currentTarget.style.background = "transparent";
        }}
      >
        <span className="flex-1 text-left truncate">{valor || "—"}</span>
        <ChevronDown size={11} strokeWidth={2} style={{ color: "var(--tf-text-tertiary)" }} />
      </button>
      {aberto && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-10 py-1 overflow-hidden max-h-[180px] overflow-y-auto"
          style={{
            background: "var(--tf-surface-raised)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            boxShadow: "var(--tf-shadow-md)",
          }}
        >
          {valor && (
            <button
              onClick={() => {
                onSave(null);
                setAberto(false);
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[0.6875rem] text-left transition-colors"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--tf-surface-hover)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={10} strokeWidth={1.75} /> limpar
            </button>
          )}
          {opcoes.length === 0 ? (
            <p
              className="px-2 py-1 text-[0.6875rem] text-center"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              Sem opções configuradas
            </p>
          ) : (
            opcoes.map((opt) => {
              const ativo = valor === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    onSave(opt);
                    setAberto(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[0.75rem] text-left transition-colors"
                  style={{
                    color: ativo ? "var(--tf-accent-text)" : "var(--tf-text)",
                    background: ativo ? "var(--tf-accent-light)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!ativo)
                      e.currentTarget.style.background = "var(--tf-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!ativo) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {ativo && (
                    <Check
                      size={11}
                      strokeWidth={2.5}
                      style={{ color: "var(--tf-accent)" }}
                    />
                  )}
                  <span className={ativo ? "" : "pl-[15px]"}>{opt}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function InputCheckbox({
  valor,
  onSave,
}: {
  valor: boolean | null;
  onSave: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onSave(!valor)}
      className="w-5 h-5 flex items-center justify-center transition-colors"
      style={{
        background: valor ? "var(--tf-accent)" : "transparent",
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: valor ? "var(--tf-accent)" : "var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
      }}
      aria-label={valor ? "Desmarcar" : "Marcar"}
    >
      {valor && <Check size={12} strokeWidth={3} style={{ color: "#fff" }} />}
    </button>
  );
}

// =============================================
// Ícone por tipo
// =============================================
function iconePorTipo(tipo: CampoCustomizado["tipo"]) {
  const props = { size: 12, strokeWidth: 1.75 };
  switch (tipo) {
    case "texto":
      return <Type {...props} />;
    case "numero":
      return <Hash {...props} />;
    case "data":
      return <Calendar {...props} />;
    case "select":
      return <ListFilter {...props} />;
    case "checkbox":
      return <Check {...props} />;
  }
}

// =============================================
// Seção de campos customizados no detalhe do card
// =============================================
export function CamposCustomizados({ cartaoId, workspaceId }: Props) {
  const { campos } = useCamposCustomizados(workspaceId);
  const { getValor, setValor, limpar } = useCartaoCampos(cartaoId);

  if (campos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sliders size={14} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
        <h3
          className="text-[0.6875rem] font-medium"
          style={{
            color: "var(--tf-text-secondary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Campos personalizados
        </h3>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-0.5 items-center">
        {campos.map((c) => {
          const v = getValor(c.id);
          return (
            <RowCampo
              key={c.id}
              campo={c}
              valor={v}
              onSave={(novo) => {
                if (novo === null || novo === "") {
                  limpar(c.id);
                } else {
                  setValor(c.id, novo);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RowCampo({
  campo,
  valor,
  onSave,
}: {
  campo: CampoCustomizado;
  valor: ReturnType<ReturnType<typeof useCartaoCampos>["getValor"]>;
  onSave: (v: string | number | boolean | null) => void;
}) {
  return (
    <>
      <div
        className="flex items-center gap-1.5 text-[0.6875rem] py-1"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        <span style={{ color: "var(--tf-text-tertiary)" }}>{iconePorTipo(campo.tipo)}</span>
        <span className="truncate" title={campo.nome}>
          {campo.nome}
        </span>
      </div>
      <div>
        {campo.tipo === "texto" && (
          <InputTexto valor={(valor as string) || null} onSave={(v) => onSave(v)} />
        )}
        {campo.tipo === "numero" && (
          <InputNumero
            valor={typeof valor === "number" ? valor : null}
            onSave={(v) => onSave(v)}
          />
        )}
        {campo.tipo === "data" && (
          <InputData valor={(valor as string) || null} onSave={(v) => onSave(v)} />
        )}
        {campo.tipo === "select" && (
          <InputSelect
            valor={(valor as string) || null}
            opcoes={campo.opcoes || []}
            onSave={(v) => onSave(v)}
          />
        )}
        {campo.tipo === "checkbox" && (
          <InputCheckbox
            valor={typeof valor === "boolean" ? valor : null}
            onSave={(v) => onSave(v)}
          />
        )}
      </div>
    </>
  );
}
