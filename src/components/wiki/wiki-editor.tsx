"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image as ImageExt } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { FileHandler } from "@tiptap/extension-file-handler";
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef, useState } from "react";

import { FloatingToolbar } from "./floating-toolbar";
import { BlockHandle } from "./block-handle";
import { TableControls } from "./table-controls";
import { SlashCommand } from "./slash-command";
import { CardEmbed } from "./card-embed";
import { inserirImagemNoEditor } from "./image-upload";

const lowlight = createLowlight(common);

interface WikiEditorProps {
  conteudo: Record<string, unknown> | null;
  onSave: (conteudo: Record<string, unknown>) => void;
  workspaceId: string;
  paginaId: string;
  editavel?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function WikiEditor({
  conteudo,
  onSave,
  workspaceId,
  paginaId,
  editavel = true,
  onEditorReady,
}: WikiEditorProps) {
  const isInternalUpdate = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const uploadOptions = { workspaceId, paginaId };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, HTMLAttributes: { class: "wiki-link" } },
        dropcursor: { color: "var(--tf-accent)", width: 2 },
      }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
          return 'Digite "/" para comandos...';
        },
        includeChildren: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        onDrop: (currentEditor, files, pos) => {
          for (const file of files) {
            inserirImagemNoEditor(currentEditor, file, uploadOptions, pos);
          }
        },
        onPaste: (currentEditor, files) => {
          for (const file of files) {
            inserirImagemNoEditor(currentEditor, file, uploadOptions);
          }
        },
      }),
      SlashCommand,
      CardEmbed,
    ],
    content: conteudo || undefined,
    editable: editavel,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "wiki-content wiki-blocks outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      if (!isInternalUpdate.current) {
        onSave(e.getJSON() as Record<string, unknown>);
      }
    },
  });

  // Notifica pai quando editor está pronto
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Listener para image upload via slash command
  useEffect(() => {
    const handleSlashImage = (e: Event) => {
      const file = (e as CustomEvent).detail?.file;
      if (file && editor) {
        inserirImagemNoEditor(editor, file, uploadOptions);
      }
    };
    window.addEventListener("wiki-image-upload", handleSlashImage);
    return () => window.removeEventListener("wiki-image-upload", handleSlashImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, workspaceId, paginaId]);

  // Atualiza conteúdo quando muda a página selecionada
  // Nota: o componente usa key={paginaId} no pai, então normalmente é
  // remontado. Este effect é um fallback para mudanças sem remontagem.
  useEffect(() => {
    if (!editor) return;
    isInternalUpdate.current = true;
    if (conteudo) {
      editor.commands.setContent(conteudo);
    } else {
      editor.commands.clearContent();
    }
    isInternalUpdate.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaId]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[300px]" style={{ color: "var(--tf-text-tertiary)" }} role="status" aria-label="Carregando editor">
        <div className="flex items-center gap-2 text-[13px]">
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--tf-border)", borderTopColor: "transparent" }}
          />
          Carregando editor...
        </div>
      </div>
    );
  }

  return (
    <div ref={editorContainerRef} className="wiki-editor-wrapper relative">
      {editavel && <FloatingToolbar editor={editor} />}
      {editavel && <BlockHandle editor={editor} containerRef={editorContainerRef} />}
      {editavel && <TableControls editor={editor} containerRef={editorContainerRef} />}
      <EditorContent editor={editor} />
    </div>
  );
}
