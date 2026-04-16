/**
 * Storage client — usado pelo lado do browser pra fazer upload/download
 * de arquivos, agnostico ao driver de storage.
 *
 * No cloud default (STORAGE_DRIVER=supabase), isso bate nas rotas
 * /api/storage/* que delegam pro driver Supabase (que por sua vez
 * faz as chamadas HTTP pro Supabase Storage API).
 *
 * No self-hosted local-disk, as mesmas rotas delegam pro driver
 * LocalDisk que le/escreve no filesystem do container app.
 *
 * Cliente sempre fala com /api/storage/* — nunca com o SDK do Supabase
 * Storage diretamente. Isso permite trocar backend via env sem mexer
 * em codigo de UI.
 */

export interface UploadResponse {
  bucket: string;
  path: string;
  url: string;
}

/**
 * Upload de arquivo via /api/storage/upload. Usa multipart/form-data.
 * Autentica via cookie de sessao (nao precisa de token explicito quando
 * chamado do browser com user logado).
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string },
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const params = new URLSearchParams({ bucket, path });
  if (options?.upsert) params.set("upsert", "true");

  const res = await fetch(`/api/storage/upload?${params}`, {
    method: "POST",
    body: form,
    // cookies incluidos por default (same-origin)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "erro desconhecido" }));
    throw new Error(body.error ?? `Upload falhou: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * URL publica de um arquivo — usada quando o bucket e publico (wiki, anexos).
 * Returns URL que pode ser usada direto em <img src> ou download link.
 */
export function getPublicUrl(bucket: string, path: string): string {
  // Relativa ao site — API route serve o arquivo
  return `/api/storage/object/${bucket}/${encodeURI(path)}`;
}

/**
 * Deleta arquivo via DELETE /api/storage/object/<bucket>/<path>.
 * Requer sessao autenticada.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const res = await fetch(`/api/storage/object/${bucket}/${encodeURI(path)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({ error: "erro desconhecido" }));
    throw new Error(body.error ?? `Delete falhou: HTTP ${res.status}`);
  }
}
