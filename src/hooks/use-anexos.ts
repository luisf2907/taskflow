"use client";

import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
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

    const { error: uploadError } = await supabase.storage.from("anexos").upload(path, file);
    if (uploadError) {
      logger.error(uploadError.message, "useAnexos");
      toast.error(`Erro ao enviar arquivo: ${uploadError.message}`);
      setEnviando(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("anexos").getPublicUrl(path);
    const { data } = await supabase
      .from("anexos")
      .insert({ cartao_id: cartaoId, nome: file.name, url: urlData.publicUrl, tipo: file.type, tamanho: file.size })
      .select()
      .single();

    if (data && key) globalMutate(key, [data, ...anexos], false);
    setEnviando(false);
    return data;
  }

  async function excluir(id: string) {
    const anexo = anexos.find((a) => a.id === id);
    if (key) globalMutate(key, anexos.filter((a) => a.id !== id), false);

    if (anexo) {
      const urlParts = anexo.url.split("/anexos/");
      if (urlParts[1]) await supabase.storage.from("anexos").remove([decodeURIComponent(urlParts[1])]);
    }
    await supabase.from("anexos").delete().eq("id", id);
  }

  function buscar() { if (key) globalMutate(key); }

  return { anexos, carregando, enviando, upload, excluir, buscar };
}
