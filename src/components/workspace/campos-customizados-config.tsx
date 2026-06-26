"use client";

import { useCamposCustomizados } from "@/hooks/use-campos-customizados";
import { toast } from "@/hooks/use-toast";
import { CampoCustomizado, CampoTipo } from "@/types";
import {
  Calendar,
  Check,
  Hash,
  ListFilter,
  Pencil,
  Plus,
  Sliders,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useState } from "react";

interface Props {
  workspaceId: string;
}

const TIPOS: { id: CampoTipo; label: string; icon: React.ReactNode }[] = [
  { id: "texto", label: "Texto", icon: <Type size={12} strokeWidth={1.75} /> },
  { id: "numero", label: "Número", icon: <Hash size={12} strokeWidth={1.75} /> },
  { id: "data", label: "Data", icon: <Calendar size={12} strokeWidth={1.75} /> },
  { id: "select", label: "Seleção", icon: <ListFilter size={12} strokeWidth={1.75} /> },
  { id: "checkbox", label: "Sim/Não", icon: <Check size={12} strokeWidth={1.75} /> },
];

export function CamposCustomizadosConfig({ workspaceId }: Props) {
  const { campos, criar, atualizar, excluir } = useCamposCustomizados(workspaceId);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<CampoTipo>("texto");
  const [opcoesTxt, setOpcoesTxt] = useState("");

  async function handleCriar() {
    const n = nome.trim();
    if (!n) return;
    try {
      const opcoes =
        tipo === "select"
          ? opcoesTxt
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      await criar({ nome: n, tipo, opcoes });
      toast.success(`Campo "${n}" criado`);
      setNome("");
      setOpcoesTxt("");
      setCriando(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao criar";
      toast.error(msg);
    }
  }

  return (
    <div className="p-4" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", borderRadius: "var(--tf-radius-md)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
          <h3
            className="text-[0.875rem] font-semibold"
            style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
          >
            Campos personalizados
          </h3>
          {campos.length > 0 && (
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
              {campos.length}
            </span>
          )}
        </div>
        {!criando && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium transition-colors"
            style={{
              background: "var(--tf-accent-light)",
              color: "var(--tf-accent-text)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Plus size={11} strokeWidth={2} />
            Novo campo
          </button>
        )}
      </div>

      <p
        className="text-[0.75rem] mb-3"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        Campos que aparecem em todos os cards do workspace. Editáveis no detalhe do card.
      </p>

      {/* Lista de campos */}
      {campos.length > 0 && (
        <ul className="flex flex-col gap-1 mb-3">
          {campos.map((c) => (
            <CampoRow
              key={c.id}
              campo={c}
              onAtualizar={(novo) => atualizar(c.id, novo)}
              onExcluir={() => {
                if (
                  confirm(
                    `Excluir o campo "${c.nome}"? Todos os valores preenchidos serão perdidos.`
                  )
                ) {
                  excluir(c.id);
                  toast.success("Campo excluído");
                }
              }}
            />
          ))}
        </ul>
      )}

      {/* Form de criação */}
      {criando && (
        <div
          className="p-3 flex flex-col gap-2.5"
          style={{
            background: "var(--tf-surface-raised)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do campo (ex: Cliente, Prioridade)"
            className="h-8 px-2 text-[0.8125rem] outline-none"
            style={{
              background: "var(--tf-surface)",
              color: "var(--tf-text)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          />
          <div className="flex flex-wrap gap-1">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className="flex items-center gap-1 h-7 px-2 text-[0.6875rem] font-medium transition-colors"
                style={{
                  background: tipo === t.id ? "var(--tf-accent-light)" : "transparent",
                  color: tipo === t.id ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: tipo === t.id ? "var(--tf-accent)" : "var(--tf-border)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {tipo === "select" && (
            <input
              value={opcoesTxt}
              onChange={(e) => setOpcoesTxt(e.target.value)}
              placeholder="Opções separadas por vírgula (ex: Baixa, Média, Alta)"
              className="h-8 px-2 text-[0.75rem] outline-none"
              style={{
                background: "var(--tf-surface)",
                color: "var(--tf-text)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCriar}
              disabled={!nome.trim() || (tipo === "select" && !opcoesTxt.trim())}
              className="flex-1 h-7 text-[0.6875rem] font-medium disabled:opacity-40"
              style={{
                background: "var(--tf-accent)",
                color: "#fff",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Criar
            </button>
            <button
              onClick={() => {
                setCriando(false);
                setNome("");
                setOpcoesTxt("");
              }}
              className="flex-1 h-7 text-[0.6875rem] font-medium"
              style={{
                background: "var(--tf-bg-secondary)",
                color: "var(--tf-text-secondary)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {campos.length === 0 && !criando && (
        <p
          className="text-[0.75rem] text-center py-4"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
          }}
        >
          Nenhum campo personalizado ainda
        </p>
      )}
    </div>
  );
}

// =============================================
// Row de campo na lista — permite renomear e excluir
// =============================================
function CampoRow({
  campo,
  onAtualizar,
  onExcluir,
}: {
  campo: CampoCustomizado;
  onAtualizar: (campos: Partial<Pick<CampoCustomizado, "nome" | "opcoes">>) => void;
  onExcluir: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(campo.nome);
  const [opcoesTxt, setOpcoesTxt] = useState((campo.opcoes || []).join(", "));

  const tipoInfo = TIPOS.find((t) => t.id === campo.tipo);

  function salvar() {
    const n = nome.trim();
    const updates: Partial<Pick<CampoCustomizado, "nome" | "opcoes">> = {};
    if (n && n !== campo.nome) updates.nome = n;
    if (campo.tipo === "select") {
      const novas = opcoesTxt.split(",").map((s) => s.trim()).filter(Boolean);
      const antigas = campo.opcoes || [];
      if (JSON.stringify(novas) !== JSON.stringify(antigas)) {
        updates.opcoes = novas;
      }
    }
    if (Object.keys(updates).length > 0) onAtualizar(updates);
    setEditando(false);
  }

  if (editando) {
    return (
      <li
        className="p-2 flex flex-col gap-1.5"
        style={{
          background: "var(--tf-surface-raised)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--tf-accent)",
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--tf-text-tertiary)" }}>{tipoInfo?.icon}</span>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") {
                setEditando(false);
                setNome(campo.nome);
                setOpcoesTxt((campo.opcoes || []).join(", "));
              }
            }}
            className="flex-1 h-7 px-1.5 text-[0.75rem] outline-none"
            style={{
              background: "var(--tf-surface)",
              color: "var(--tf-text)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          />
          <button onClick={salvar} title="Salvar" style={{ color: "var(--tf-accent)" }}>
            <Check size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              setEditando(false);
              setNome(campo.nome);
              setOpcoesTxt((campo.opcoes || []).join(", "));
            }}
            title="Cancelar"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>
        {campo.tipo === "select" && (
          <input
            value={opcoesTxt}
            onChange={(e) => setOpcoesTxt(e.target.value)}
            placeholder="Opções separadas por vírgula"
            className="h-7 px-1.5 text-[0.75rem] outline-none"
            style={{
              background: "var(--tf-surface)",
              color: "var(--tf-text)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          />
        )}
      </li>
    );
  }

  return (
    <li
      className="group flex items-center gap-2 px-2 py-1.5 transition-colors"
      style={{
        background: "var(--tf-surface)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
      }}
    >
      <span style={{ color: "var(--tf-text-tertiary)" }}>{tipoInfo?.icon}</span>
      <span
        className="flex-1 text-[0.8125rem] font-medium truncate"
        style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
      >
        {campo.nome}
      </span>
      <span
        className="text-[0.625rem]"
        style={{
          color: "var(--tf-text-tertiary)",
          fontFamily: "var(--tf-font-mono)",
        }}
      >
        {tipoInfo?.label}
        {campo.tipo === "select" && campo.opcoes && ` · ${campo.opcoes.length} opções`}
      </span>
      <button
        onClick={() => setEditando(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--tf-text-tertiary)" }}
        aria-label="Editar"
      >
        <Pencil size={11} strokeWidth={1.75} />
      </button>
      <button
        onClick={onExcluir}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--tf-danger)" }}
        aria-label="Excluir"
      >
        <Trash2 size={11} strokeWidth={1.75} />
      </button>
    </li>
  );
}
