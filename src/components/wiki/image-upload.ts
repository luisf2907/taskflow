import { supabase } from "@/lib/supabase/client";
import type { Editor } from "@tiptap/react";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface UploadOptions {
  workspaceId: string;
  paginaId: string;
}

/**
 * Upload de imagem para Supabase Storage (bucket "wiki").
 * Retorna URL pública ou null em caso de erro.
 */
export async function uploadImagemWiki(
  file: File,
  options: UploadOptions,
): Promise<string | null> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    console.warn("[wiki] Tipo de arquivo não aceito:", file.type);
    return null;
  }

  if (file.size > MAX_SIZE) {
    console.warn("[wiki] Arquivo muito grande:", file.size);
    return null;
  }

  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "png";
  const safeName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);
  const path = `${options.workspaceId}/${options.paginaId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from("wiki")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("[wiki] Erro no upload:", error.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("wiki")
    .getPublicUrl(path);

  return publicUrl.publicUrl;
}

/**
 * Handler para inserir imagem no editor após upload.
 */
export async function inserirImagemNoEditor(
  editor: Editor,
  file: File,
  options: UploadOptions,
  pos?: number,
): Promise<void> {
  const url = await uploadImagemWiki(file, options);
  if (!url) return;

  if (pos !== undefined) {
    editor
      .chain()
      .focus()
      .insertContentAt(pos, {
        type: "image",
        attrs: { src: url, alt: file.name },
      })
      .run();
  } else {
    editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  }
}
