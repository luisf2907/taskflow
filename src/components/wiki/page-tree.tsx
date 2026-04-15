"use client";

import { cn } from "@/lib/utils";
import type { WikiPaginaTree } from "@/types";
import {
  ChevronRight,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  PenLine,
  Search,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";

interface PageTreeProps {
  arvore: WikiPaginaTree[];
  paginaAtivaId: string | null;
  onSelecionar: (pagina: WikiPaginaTree) => void;
  onCriarPagina: (parentId?: string | null) => void;
  onExcluirPagina: (id: string) => void;
  onRenomearPagina: (id: string, novoTitulo: string) => void;
}

interface TreeNodeProps {
  node: WikiPaginaTree;
  depth: number;
  paginaAtivaId: string | null;
  onSelecionar: (pagina: WikiPaginaTree) => void;
  onCriarPagina: (parentId?: string | null) => void;
  onExcluirPagina: (id: string) => void;
  onRenomearPagina: (id: string, novoTitulo: string) => void;
}

function TreeNode({
  node,
  depth,
  paginaAtivaId,
  onSelecionar,
  onCriarPagina,
  onExcluirPagina,
  onRenomearPagina,
}: TreeNodeProps) {
  const [expandido, setExpandido] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(node.titulo);

  const ativo = node.id === paginaAtivaId;
  const temFilhos = node.filhos.length > 0;

  const handleRenomear = useCallback(() => {
    if (titulo.trim() && titulo !== node.titulo) {
      onRenomearPagina(node.id, titulo.trim());
    } else {
      setTitulo(node.titulo);
    }
    setEditando(false);
  }, [titulo, node.id, node.titulo, onRenomearPagina]);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-[5px] pr-2 rounded-[var(--tf-radius-xs)] relative transition-colors",
          ativo
            ? "font-medium"
            : "hover:bg-[var(--tf-surface-hover)]",
        )}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          background: ativo ? "var(--tf-accent-light)" : undefined,
          color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
        }}
      >
        {/* Expand/collapse */}
        <button
          type="button"
          aria-expanded={expandido}
          aria-label={expandido ? "Recolher" : "Expandir"}
          onClick={(e) => {
            e.stopPropagation();
            setExpandido(!expandido);
          }}
          className={cn(
            "shrink-0 w-5 h-5 flex items-center justify-center rounded-[4px] transition-transform",
            !temFilhos && "invisible",
          )}
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <ChevronRight
            size={13}
            strokeWidth={2}
            className={cn(
              "transition-transform",
              expandido && "rotate-90",
            )}
          />
        </button>

        {/* Ícone */}
        <span className="shrink-0 text-[14px] w-5 h-5 flex items-center justify-center">
          {node.icone || (
            <FileText
              size={14}
              strokeWidth={1.8}
              style={{ color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)" }}
            />
          )}
        </span>

        {/* Título */}
        {editando ? (
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={handleRenomear}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenomear();
              if (e.key === "Escape") {
                setTitulo(node.titulo);
                setEditando(false);
              }
            }}
            autoFocus
            className="flex-1 min-w-0 text-[13px] px-1 py-0 outline-none rounded-[4px]"
            style={{
              background: "var(--tf-bg-secondary)",
              color: "var(--tf-text)",
              border: "1px solid var(--tf-accent)",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelecionar(node)}
            onDoubleClick={() => {
              setTitulo(node.titulo);
              setEditando(true);
            }}
            className="flex-1 min-w-0 text-left text-[13px] truncate"
          >
            {node.titulo}
          </button>
        )}

        {/* Ações hover */}
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCriarPagina(node.id);
            }}
            className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-tertiary)" }}
            title="Criar sub-página"
          >
            <Plus size={13} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAberto(!menuAberto);
              }}
              className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <MoreHorizontal size={13} />
            </button>

            {menuAberto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuAberto(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded-[var(--tf-radius-xs)] overflow-hidden min-w-[140px] py-1"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    boxShadow: "var(--tf-shadow-lg)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      setTitulo(node.titulo);
                      setEditando(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left hover:bg-[var(--tf-surface-hover)]"
                    style={{ color: "var(--tf-text)" }}
                  >
                    <PenLine size={13} /> Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      onExcluirPagina(node.id);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left hover:bg-[var(--tf-danger-bg)]"
                    style={{ color: "var(--tf-danger)" }}
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filhos */}
      {expandido && temFilhos && (
        <div>
          {node.filhos.map((filho) => (
            <TreeNode
              key={filho.id}
              node={filho}
              depth={depth + 1}
              paginaAtivaId={paginaAtivaId}
              onSelecionar={onSelecionar}
              onCriarPagina={onCriarPagina}
              onExcluirPagina={onExcluirPagina}
              onRenomearPagina={onRenomearPagina}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function filtrarArvore(arvore: WikiPaginaTree[], termo: string): WikiPaginaTree[] {
  if (!termo) return arvore;
  const lower = termo.toLowerCase();

  return arvore.reduce<WikiPaginaTree[]>((acc, node) => {
    const filhosMatch = filtrarArvore(node.filhos, termo);
    const tituloMatch = node.titulo.toLowerCase().includes(lower);

    if (tituloMatch || filhosMatch.length > 0) {
      acc.push({ ...node, filhos: tituloMatch ? node.filhos : filhosMatch });
    }
    return acc;
  }, []);
}

export function PageTree({
  arvore,
  paginaAtivaId,
  onSelecionar,
  onCriarPagina,
  onExcluirPagina,
  onRenomearPagina,
}: PageTreeProps) {
  const [busca, setBusca] = useState("");

  const arvoreFiltrada = useMemo(
    () => filtrarArvore(arvore, busca),
    [arvore, busca],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--tf-border)" }}
      >
        <span
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Páginas
        </span>
        <button
          type="button"
          onClick={() => onCriarPagina(null)}
          className="p-1 rounded-[6px] hover:bg-[var(--tf-surface-hover)]"
          style={{ color: "var(--tf-text-tertiary)" }}
          title="Nova página"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Busca */}
      {arvore.length > 0 && (
        <div className="px-3 pt-2">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--tf-radius-xs)]"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
            }}
          >
            <Search size={12} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pagina..."
              aria-label="Buscar pagina"
              className="flex-1 text-[12px] outline-none bg-transparent"
              style={{ color: "var(--tf-text)" }}
            />
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {busca && arvoreFiltrada.length === 0 ? (
          <div
            className="flex items-center justify-center py-8 text-center"
          >
            <p
              className="text-[12px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Nenhuma pagina encontrada
            </p>
          </div>
        ) : arvore.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
          >
            <FileText
              size={36}
              strokeWidth={1.2}
              style={{ color: "var(--tf-border)", marginBottom: "12px" }}
            />
            <p
              className="text-[13px] font-medium mb-1"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Nenhuma página ainda
            </p>
            <p
              className="text-[12px] mb-4"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Crie sua primeira página para começar a documentar
            </p>
            <button
              type="button"
              onClick={() => onCriarPagina(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--tf-radius-xs)] text-[13px] font-medium"
              style={{
                background: "var(--tf-accent)",
                color: "white",
              }}
            >
              <Plus size={14} /> Nova página
            </button>
          </div>
        ) : (
          arvoreFiltrada.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              paginaAtivaId={paginaAtivaId}
              onSelecionar={onSelecionar}
              onCriarPagina={onCriarPagina}
              onExcluirPagina={onExcluirPagina}
              onRenomearPagina={onRenomearPagina}
            />
          ))
        )}
      </div>
    </div>
  );
}
