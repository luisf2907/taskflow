"use client";

import { supabase } from "@/lib/supabase/client";
import { ChecklistComItens, ChecklistItem } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useState } from "react";

function chave(cartaoId: string | null) {
  return cartaoId ? `checklists-${cartaoId}` : null;
}

export function useChecklists(cartaoId: string | null) {
  const key = chave(cartaoId);
  const [localData, setLocalData] = useState<ChecklistComItens[] | null>(null);

  const { data: swrData = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [];
    const { data } = await supabase
      .from("checklists")
      .select("*, checklist_itens(*)")
      .eq("cartao_id", cartaoId)
      .order("posicao");
    if (!data) return [];
    return data.map((cl) => ({
      ...cl,
      checklist_itens: (cl.checklist_itens as ChecklistItem[]).sort((a, b) => a.posicao - b.posicao),
    })) as ChecklistComItens[];
  });

  const checklists = localData ?? swrData;

  function update(dados: ChecklistComItens[]) {
    setLocalData(dados);
    if (key) globalMutate(key, dados, false);
  }

  async function criarChecklist(titulo: string = "Checklist") {
    if (!cartaoId) return;
    const posicao = checklists.length;
    const { data } = await supabase.from("checklists").insert({ cartao_id: cartaoId, titulo, posicao }).select().single();
    if (data) update([...checklists, { ...data, checklist_itens: [] }]);
    return data;
  }

  async function excluirChecklist(checklistId: string) {
    update(checklists.filter((cl) => cl.id !== checklistId));
    await supabase.from("checklists").delete().eq("id", checklistId);
  }

  async function criarItem(checklistId: string, texto: string) {
    const checklist = checklists.find((cl) => cl.id === checklistId);
    const posicao = checklist?.checklist_itens.length || 0;
    const { data } = await supabase.from("checklist_itens").insert({ checklist_id: checklistId, texto, posicao }).select().single();
    if (data) {
      update(checklists.map((cl) => cl.id === checklistId ? { ...cl, checklist_itens: [...cl.checklist_itens, data] } : cl));
    }
    return data;
  }

  async function toggleItem(itemId: string, concluido: boolean) {
    update(checklists.map((cl) => ({
      ...cl,
      checklist_itens: cl.checklist_itens.map((item) => item.id === itemId ? { ...item, concluido } : item),
    })));
    await supabase.from("checklist_itens").update({ concluido }).eq("id", itemId);
  }

  async function atualizarItem(itemId: string, campos: Partial<Pick<ChecklistItem, "texto" | "posicao">>) {
    update(checklists.map((cl) => ({
      ...cl,
      checklist_itens: cl.checklist_itens.map((item) => item.id === itemId ? { ...item, ...campos } : item),
    })));
    await supabase.from("checklist_itens").update(campos).eq("id", itemId);
  }

  async function excluirItem(itemId: string) {
    update(checklists.map((cl) => ({
      ...cl,
      checklist_itens: cl.checklist_itens.filter((item) => item.id !== itemId),
    })));
    await supabase.from("checklist_itens").delete().eq("id", itemId);
  }

  function buscar() { if (key) globalMutate(key); }

  return { checklists, carregando, criarChecklist, excluirChecklist, criarItem, toggleItem, atualizarItem, excluirItem, buscar };
}
