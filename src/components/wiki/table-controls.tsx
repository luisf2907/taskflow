"use client";

import type { Editor } from "@tiptap/react";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface TableControlsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function Btn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="p-1 rounded-[5px] transition-colors hover:bg-[var(--tf-surface-hover)]"
      style={{ color: danger ? "var(--tf-danger)" : "var(--tf-text-secondary)" }}
    >
      {children}
    </button>
  );
}

export function TableControls({ editor, containerRef }: TableControlsProps) {
  const [isInTable, setIsInTable] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const inTable = editor.isActive("table");
      setIsInTable(inTable);

      if (inTable && containerRef.current) {
        // Encontra o DOM element da tabela
        const { from } = editor.state.selection;
        let tableEl: HTMLElement | null = null;

        try {
          const resolved = editor.state.doc.resolve(from);
          for (let d = resolved.depth; d > 0; d--) {
            const node = resolved.node(d);
            if (node.type.name === "table") {
              const domNode = editor.view.nodeDOM(resolved.before(d));
              if (domNode instanceof HTMLElement) {
                // O wrapper .tableWrapper contém a table
                tableEl = domNode.closest(".tableWrapper") as HTMLElement || domNode;
              }
              break;
            }
          }
        } catch { /* noop */ }

        if (tableEl) {
          const tableRect = tableEl.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setPos({
            top: tableRect.top - containerRect.top - 36,
            left: tableRect.left - containerRect.left,
          });
        }
      }
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, containerRef]);

  if (!isInTable) return null;

  return (
    <div
      ref={barRef}
      className="absolute z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-[var(--tf-radius-xs)]"
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        boxShadow: "var(--tf-shadow-lg)",
      }}
    >
      <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Coluna à esquerda">
        <ArrowLeft size={12} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Coluna à direita">
        <ArrowRight size={12} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="Linha acima">
        <ArrowUp size={12} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Linha abaixo">
        <ArrowDown size={12} />
      </Btn>

      <div className="w-px h-3.5 mx-0.5" style={{ background: "var(--tf-border)" }} />

      <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Remover coluna" danger>
        <span className="text-[9px] font-bold">Col</span>
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Remover linha" danger>
        <span className="text-[9px] font-bold">Row</span>
      </Btn>

      <div className="w-px h-3.5 mx-0.5" style={{ background: "var(--tf-border)" }} />

      <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela" danger>
        <Trash2 size={12} />
      </Btn>
    </div>
  );
}
