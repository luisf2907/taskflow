"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { FileHandler } from "@tiptap/extension-file-handler";
import { useEffect, useCallback, useRef, useState } from "react";

import { FloatingToolbar } from "./floating-toolbar";
import { BlockHandle } from "./block-handle";
import { TableControls } from "./table-controls";
import { SlashCommand } from "./slash-command";
import { getWikiSchemaExtensions } from "./wiki-extensions";
import { inserirImagemNoEditor } from "./image-upload";

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
      ...getWikiSchemaExtensions(),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
          return 'Digite "/" para comandos...';
        },
        includeChildren: true,
      }),
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
