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
    await supabase.rpc("criar_notificacao", {
      p_user_id: params.userId,
      p_titulo: params.titulo,
      p_mensagem: params.mensagem ?? null,
      p_tipo: params.tipo ?? "info",
      p_link: params.link ?? null,
    });
  } catch {
    // Silent fail
  }
}
