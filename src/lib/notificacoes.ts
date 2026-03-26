import { supabase } from "@/lib/supabase/client";

interface CriarNotificacaoParams {
  userId: string;
  titulo: string;
  mensagem?: string;
  tipo?: string;
  link?: string;
}

export async function criarNotificacao(params: CriarNotificacaoParams): Promise<void> {
  try {
    await supabase.from("notificacoes").insert({
      user_id: params.userId,
      titulo: params.titulo,
      mensagem: params.mensagem || null,
      tipo: params.tipo || "info",
      link: params.link || null,
    });
  } catch {
    // Silent fail
  }
}
