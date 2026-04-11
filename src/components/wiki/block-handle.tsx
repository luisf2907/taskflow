"use client";

import type { Editor } from "@tiptap/react";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

interface BlockHandleProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function BlockHandle({ editor, containerRef }: BlockHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  const currentBlockPos = useRef<number>(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isDragging = useRef(false);
  const dropIndicatorRef = useRef<HTMLDivElement | null>(null);
  const draggedBlockPos = useRef<number>(0);

  const positionHandle = useCallback(
    (event: MouseEvent) => {
      if (isDragging.current) return;

      const container = containerRef.current;
      if (!container || !editor.view?.dom) return;

      const editorDom = editor.view.dom;
      const editorRect = editorDom.getBoundingClientRect();
      const mouseY = event.clientY;

      if (mouseY < editorRect.top - 10 || mouseY > editorRect.bottom + 10) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 200);
        return;
      }

      const pos = editor.view.posAtCoords({ left: editorRect.left + 10, top: mouseY });
      if (!pos) return;

      try {
        const resolvedPos = editor.state.doc.resolve(pos.pos);
        if (resolvedPos.depth < 1) return;

        const nodeStart = resolvedPos.before(1);
        const dom = editor.view.nodeDOM(nodeStart);

        if (dom && dom instanceof HTMLElement) {
          const blockRect = dom.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (hideTimer.current) clearTimeout(hideTimer.current);
          currentBlockPos.current = nodeStart;
          setTop(blockRect.top - containerRect.top + 2);
          setVisible(true);
        }
      } catch { /* posição inválida */ }
    },
    [editor, containerRef],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", positionHandle);
    const onLeave = () => {
      if (!isDragging.current) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), 300);
      }
    };
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", positionHandle);
      container.removeEventListener("mouseleave", onLeave);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [containerRef, positionHandle]);

  // ── + BUTTON ──
  const handleAddBlock = useCallback(() => {
    try {
      const resolved = editor.state.doc.resolve(currentBlockPos.current);
      const node = resolved.nodeAfter;
      if (!node) return;

      const endPos = currentBlockPos.current + node.nodeSize;

      editor
        .chain()
        .insertContentAt(endPos, { type: "paragraph" })
        .setTextSelection(endPos + 1)
        .focus()
        .run();

      requestAnimationFrame(() => {
        editor.view.dispatch(
          editor.state.tr.insertText("/", editor.state.selection.from)
        );
      });
    } catch {
      editor.chain().focus().run();
    }
  }, [editor]);

  // ── DRAG & DROP ──
  const getBlockAtY = useCallback((y: number): { pos: number; rect: DOMRect } | null => {
    const editorDom = editor.view.dom;
    const editorRect = editorDom.getBoundingClientRect();

    const pos = editor.view.posAtCoords({ left: editorRect.left + 10, top: y });
    if (!pos) return null;

    try {
      const resolved = editor.state.doc.resolve(pos.pos);
      if (resolved.depth < 1) return null;

      const nodeStart = resolved.before(1);
      const dom = editor.view.nodeDOM(nodeStart) as HTMLElement | null;
      if (!dom) return null;

      return { pos: nodeStart, rect: dom.getBoundingClientRect() };
    } catch {
      return null;
    }
  }, [editor]);

  const showDropIndicator = useCallback((y: number) => {
    if (!dropIndicatorRef.current) {
      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed; left: 0; right: 0; height: 2px; z-index: 999;
        background: var(--tf-accent); pointer-events: none;
        transition: top 0.05s ease;
      `;
      document.body.appendChild(el);
      dropIndicatorRef.current = el;
    }

    const target = getBlockAtY(y);
    if (!target) return -1;

    const midY = target.rect.top + target.rect.height / 2;
    const indicatorY = y < midY ? target.rect.top : target.rect.bottom;

    dropIndicatorRef.current.style.top = `${indicatorY}px`;
    dropIndicatorRef.current.style.left = `${target.rect.left}px`;
    dropIndicatorRef.current.style.right = `${document.documentElement.clientWidth - target.rect.right}px`;
    dropIndicatorRef.current.style.width = `${target.rect.width}px`;

    // Retorna a posição de destino
    if (y < midY) {
      return target.pos; // antes do bloco
    } else {
      const node = editor.state.doc.resolve(target.pos).nodeAfter;
      return node ? target.pos + node.nodeSize : target.pos;
    }
  }, [editor, getBlockAtY]);

  const removeDropIndicator = useCallback(() => {
    dropIndicatorRef.current?.remove();
    dropIndicatorRef.current = null;
  }, []);

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isDragging.current = true;
    draggedBlockPos.current = currentBlockPos.current;
    let dropPos = -1;

    // Highlight do bloco sendo arrastado
    const draggedDom = editor.view.nodeDOM(draggedBlockPos.current) as HTMLElement | null;
    if (draggedDom) {
      draggedDom.style.opacity = "0.4";
      draggedDom.style.transition = "opacity 0.15s";
    }

    const onMouseMove = (ev: MouseEvent) => {
      dropPos = showDropIndicator(ev.clientY);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      removeDropIndicator();
      isDragging.current = false;

      // Restaura opacidade
      if (draggedDom) {
        draggedDom.style.opacity = "";
        draggedDom.style.transition = "";
      }

      if (dropPos < 0) return;

      try {
        const resolved = editor.state.doc.resolve(draggedBlockPos.current);
        const node = resolved.nodeAfter;
        if (!node) return;

        const srcFrom = draggedBlockPos.current;
        const srcTo = srcFrom + node.nodeSize;

        // Não mover para a mesma posição
        if (dropPos >= srcFrom && dropPos <= srcTo) return;

        // Cria a transaction: delete do source e insert no destino
        const { tr } = editor.state;
        const nodeSlice = node.copy(node.content);

        // Ajusta posição de destino se está depois do source (porque vamos deletar primeiro)
        let insertPos = dropPos;
        if (dropPos > srcFrom) {
          insertPos = dropPos - node.nodeSize;
        }

        tr.delete(srcFrom, srcTo);
        tr.insert(insertPos, nodeSlice);
        editor.view.dispatch(tr);
      } catch { /* posição inválida */ }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [editor, showDropIndicator, removeDropIndicator]);

  return (
    <div
      ref={handleRef}
      className="absolute flex items-center gap-0.5 transition-opacity duration-150 z-10"
      style={{
        top: `${top}px`,
        left: "-54px",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleAddBlock(); }}
        className="w-6 h-6 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Adicionar bloco"
      >
        <Plus size={16} strokeWidth={2} />
      </button>

      <div
        onMouseDown={handleDragMouseDown}
        className="w-6 h-6 flex items-center justify-center rounded-[6px] cursor-grab active:cursor-grabbing transition-colors hover:bg-[var(--tf-surface-hover)]"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Arrastar bloco"
      >
        <GripVertical size={16} strokeWidth={2} />
      </div>
    </div>
  );
}
