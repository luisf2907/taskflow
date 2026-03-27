"use client";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Notificacao } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useEffect } from "react";

export function useNotificacoes() {
  const { user } = useAuth();
  const key = user ? `notificacoes-${user.id}` : null;

  const { data: notificacoes = [], isLoading: carregando } = useSWR(key, async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(30);
    return (data || []) as Notificacao[];
  });

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarComoLida(id: string) {
    globalMutate(key, notificacoes.map((n) => n.id === id ? { ...n, lida: true } : n), false);
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  }

  async function marcarTodasComoLidas() {
    if (!user) return;
    globalMutate(key, notificacoes.map((n) => ({ ...n, lida: true })), false);
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
  }

  async function apagar(id: string) {
    globalMutate(key, notificacoes.filter((n) => n.id !== id), false);
    await supabase.from("notificacoes").delete().eq("id", id);
  }

  async function limparTodas() {
    if (!user) return;
    globalMutate(key, [], false);
    await supabase.from("notificacoes").delete().eq("user_id", user.id);
  }

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notificacoes-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` }, () => {
        globalMutate(key);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, key]);

  return { notificacoes, naoLidas, carregando, marcarComoLida, marcarTodasComoLidas, apagar, limparTodas };
}
