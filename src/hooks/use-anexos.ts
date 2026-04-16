"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { uploadFile } from "@/lib/storage-client";
import { Anexo } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useState } from "react";

function chave(cartaoId: string | null) {
  return cartaoId ? `anexos-${cartaoId}` : null;
}

export function useAnexos(cartaoId: string | null) {
  const key = chave(cartaoId);
  const [enviando, setEnviando] = useState(false);

  const { data: anexos = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [];
    const { data } = await supabase
      .from("anexos")
      .select("*")
      .eq("cartao_id", cartaoId)
      .order("criado_em", { ascending: false });
    return (data || []) as Anexo[];
  });

  async function upload(file: File) {
    if (!cartaoId) return;
    setEnviando(true);

    const timestamp = Date.now();
    const path = `${cartaoId}/${timestamp}_${file.name}`;

    // Upload via storage-client — agnostico ao driver (supabase/local-disk/s3)
    let url: string;
    try {
      const result = await uploadFile("anexos", path, file);
      url = result.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "upload falhou";
      logger.error(msg, "useAnexos");
      toast.error(`Erro ao enviar arquivo: ${msg}`);
      setEnviando(false);
      return;
    }

    const { data } = await supabase
      .from("anexos")
      .insert({ cartao_id: cartaoId, nome: file.name, url, tipo: file.type, tamanho: file.size })
      .select()
      .single();

    if (data && key) globalMutate(key, [data, ...anexos], false);
    setEnviando(false);
    return data;
  }

  async function excluir(id: string) {
    const anexo = anexos.find((a) => a.id === id);
    if (key) globalMutate(key, anexos.filter((a) => a.id !== id), false);

    // Best-effort: tenta deletar o arquivo do storage tambem. Funciona
    // pra URLs do formato /api/storage/object/anexos/<path> (local-disk)
    // ou https://<supabase>/storage/v1/object/public/anexos/<path> (cloud).
    if (anexo?.url) {
      try {
        const path = extrairPathDoAnexo(anexo.url);
        if (path) {
          await fetch(`/api/storage/object/anexos/${encodeURI(path)}`, {
            method: "DELETE",
          }).catch(() => {});
        }
      } catch {
        // silencioso — orfao no storage e aceitavel
      }
    }

    await supabase.from("anexos").delete().eq("id", id);
  }

  function buscar() { if (key) globalMutate(key); }

  return { anexos, carregando, enviando, upload, excluir, buscar };
}

/**
 * Extrai o path relativo ao bucket a partir da URL. Suporta dois formatos:
 *   1. /api/storage/object/anexos/<path>            (self-hosted)
 *   2. .../storage/v1/object/public/anexos/<path>   (Supabase cloud)
 */
function extrairPathDoAnexo(url: string): string | null {
  // Tenta padrao self-hosted primeiro
  const selfMatch = url.match(/\/api\/storage\/object\/anexos\/(.+?)(?:\?.*)?$/);
  if (selfMatch) return decodeURIComponent(selfMatch[1]);

  // Padrao Supabase (publico)
  const supaMatch = url.match(/\/anexos\/(.+?)(?:\?.*)?$/);
  if (supaMatch) return decodeURIComponent(supaMatch[1]);

  return null;
}
