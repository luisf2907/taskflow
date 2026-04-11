"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image as ImageExt } from "@tiptap/extension-image";
import { Link as LinkExt } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline as UnderlineExt } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { FileHandler } from "@tiptap/extension-file-handler";
import { Dropcursor } from "@tiptap/extension-dropcursor";
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
}

export function WikiEditor({
  conteudo,
  onSave,
  workspaceId,
  paginaId,
  editavel = true,
}: WikiEditorProps) {
  const isInternalUpdate = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const uploadOptions = { workspaceId, paginaId };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      ImageExt.configure({
        inline: false,
        allowBase64: false,
      }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "wiki-link" },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = node.attrs.level;
            return `Heading ${level}`;
          }
          return 'Digite "/" para comandos...';
        },
        includeChildren: true,
      }),
      UnderlineExt,
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
      Dropcursor.configure({ color: "var(--tf-accent)", width: 2 }),
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
  useEffect(() => {
    if (editor && conteudo) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(conteudo);
      if (currentJSON !== newJSON) {
        isInternalUpdate.current = true;
        editor.commands.setContent(conteudo);
        isInternalUpdate.current = false;
      }
    } else if (editor && !conteudo) {
      isInternalUpdate.current = true;
      editor.commands.clearContent();
      isInternalUpdate.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaId]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[300px]" style={{ color: "var(--tf-text-tertiary)" }}>
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
