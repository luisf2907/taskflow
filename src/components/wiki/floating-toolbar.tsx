"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState, useCallback } from "react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  ChevronDown,
  Highlighter,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Copy,
  Clipboard,
} from "lucide-react";

// ── Botão inline ──
function Btn({
  onClick,
  active,
  title,
  children,
  className = "",
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-[5px] transition-colors ${className}`}
      style={{
        background: active ? "var(--tf-accent-light)" : "transparent",
        color: active ? "var(--tf-text)" : "var(--tf-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: "var(--tf-border)" }} />;
}

// ── Block type dropdown ──
function BlockTypeDropdown({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const items = [
    { label: "Texto", icon: <Type size={14} />, action: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", icon: <Heading1 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: <Heading2 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: <Heading3 size={14} />, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Lista", icon: <List size={14} />, action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Lista numerada", icon: <ListOrdered size={14} />, action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Checklist", icon: <CheckSquare size={14} />, action: () => editor.chain().focus().toggleTaskList().run() },
    { label: "Citação", icon: <Quote size={14} />, action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Código", icon: <Code2 size={14} />, action: () => editor.chain().focus().toggleCodeBlock().run() },
  ];

  return (
    <div
      className="absolute left-0 top-full mt-1 rounded-[10px] py-1 min-w-[170px] z-50"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        boxShadow: "var(--tf-shadow-lg)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); item.action(); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left transition-colors hover:bg-[var(--tf-surface-hover)]"
          style={{ color: "var(--tf-text)" }}
        >
          <span style={{ color: "var(--tf-text-tertiary)" }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── More options dropdown ──
function MoreDropdown({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <div
      className="absolute right-0 top-full mt-1 rounded-[10px] py-1 min-w-[160px] z-50"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        boxShadow: "var(--tf-shadow-lg)",
      }}
    >
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().setTextAlign("left").run();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text)" }}
      >
        <AlignLeft size={13} style={{ color: "var(--tf-text-tertiary)" }} /> Alinhar esquerda
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().setTextAlign("center").run();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text)" }}
      >
        <AlignCenter size={13} style={{ color: "var(--tf-text-tertiary)" }} /> Centralizar
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().setTextAlign("right").run();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text)" }}
      >
        <AlignRight size={13} style={{ color: "var(--tf-text-tertiary)" }} /> Alinhar direita
      </button>
      <div className="h-px my-1" style={{ background: "var(--tf-border)" }} />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to);
          navigator.clipboard.writeText(text);
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text)" }}
      >
        <Copy size={13} style={{ color: "var(--tf-text-tertiary)" }} /> Copiar
      </button>
      <div className="h-px my-1" style={{ background: "var(--tf-border)" }} />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().deleteSelection().run();
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-[12px] text-left hover:bg-[var(--tf-danger-bg)]"
        style={{ color: "var(--tf-danger)" }}
      >
        <Trash2 size={13} /> Excluir
      </button>
    </div>
  );
}

// ── Main Floating Toolbar ──
export function FloatingToolbar({ editor }: { editor: Editor }) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [blockDropdown, setBlockDropdown] = useState(false);
  const [moreDropdown, setMoreDropdown] = useState(false);

  // Nome do bloco atual
  const getBlockLabel = useCallback(() => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("bulletList")) return "Lista";
    if (editor.isActive("orderedList")) return "Numerada";
    if (editor.isActive("taskList")) return "Checklist";
    if (editor.isActive("blockquote")) return "Citação";
    if (editor.isActive("codeBlock")) return "Código";
    return "Texto";
  }, [editor]);

  const updateToolbar = useCallback(() => {
    const { from, to, empty } = editor.state.selection;

    if (empty || from === to) {
      tippyRef.current?.hide();
      setLinkMode(false);
      setBlockDropdown(false);
      setMoreDropdown(false);
      return;
    }

    if (!tippyRef.current && toolbarRef.current) {
      tippyRef.current = tippy(document.body, {
        getReferenceClientRect: () => {
          const coords = editor.view.coordsAtPos(from);
          const endCoords = editor.view.coordsAtPos(to);
          return new DOMRect(coords.left, coords.top - 6, endCoords.right - coords.left, endCoords.bottom - coords.top + 6);
        },
        content: toolbarRef.current,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "top",
        animation: false,
        appendTo: () => document.body,
      });
    } else if (tippyRef.current) {
      tippyRef.current.setProps({
        getReferenceClientRect: () => {
          const coords = editor.view.coordsAtPos(from);
          const endCoords = editor.view.coordsAtPos(to);
          return new DOMRect(coords.left, coords.top - 6, endCoords.right - coords.left, endCoords.bottom - coords.top + 6);
        },
      });
      tippyRef.current.show();
    }
  }, [editor]);

  useEffect(() => {
    const handleBlur = () => {
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          tippyRef.current?.hide();
          setLinkMode(false);
          setLinkUrl("");
          setBlockDropdown(false);
          setMoreDropdown(false);
        }
      }, 200);
    };

    editor.on("selectionUpdate", updateToolbar);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", updateToolbar);
      editor.off("blur", handleBlur);
      tippyRef.current?.destroy();
    };
  }, [editor, updateToolbar]);

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkMode(false);
    setLinkUrl("");
  };

  return (
    <div ref={toolbarRef} className="hidden">
      <div
        role="toolbar"
        aria-label="Barra de formatacao"
        className="flex items-center rounded-[10px] shadow-2xl"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
        }}
      >
        {linkMode ? (
          <div className="flex items-center gap-1 px-2 py-1.5">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") { setLinkMode(false); setLinkUrl(""); }
              }}
              placeholder="https://..."
              aria-label="URL do link"
              autoFocus
              className="w-[200px] text-[12px] px-2 py-1 rounded-[5px] outline-none"
              style={{
                background: "var(--tf-bg-secondary)",
                color: "var(--tf-text)",
                border: "1px solid var(--tf-border)",
              }}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-[5px] text-white"
              style={{ background: "var(--tf-accent)" }}
            >
              OK
            </button>
          </div>
        ) : (
          <div className="flex items-center px-1 py-1 gap-0">
            {/* Block type dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={blockDropdown}
                aria-haspopup="listbox"
                onMouseDown={(e) => { e.preventDefault(); setBlockDropdown(!blockDropdown); setMoreDropdown(false); }}
                className="flex items-center gap-1 px-2 py-1 rounded-[5px] text-[12px] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                {getBlockLabel()}
                <ChevronDown size={11} />
              </button>
              {blockDropdown && <BlockTypeDropdown editor={editor} onClose={() => setBlockDropdown(false)} />}
            </div>

            <Separator />

            {/* Formatação inline */}
            <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito (Ctrl+B)">
              <Bold size={14} strokeWidth={2.5} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico (Ctrl+I)">
              <Italic size={14} strokeWidth={2.5} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado (Ctrl+U)">
              <Underline size={14} strokeWidth={2.5} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
              <Strikethrough size={14} strokeWidth={2.5} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Código inline">
              <Code size={14} strokeWidth={2.5} />
            </Btn>
            <Btn
              onClick={() => { setLinkUrl(editor.getAttributes("link").href || ""); setLinkMode(true); }}
              active={editor.isActive("link")}
              title="Link"
            >
              <Link size={14} strokeWidth={2.5} />
            </Btn>

            {/* Highlight (cor) */}
            <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Destaque">
              <Highlighter size={14} strokeWidth={2.5} />
            </Btn>

            <Separator />

            {/* More options */}
            <div className="relative">
              <Btn
                onClick={() => { setMoreDropdown(!moreDropdown); setBlockDropdown(false); }}
                title="Mais opções"
              >
                <MoreHorizontal size={14} strokeWidth={2.5} />
              </Btn>
              {moreDropdown && <MoreDropdown editor={editor} onClose={() => setMoreDropdown(false)} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
