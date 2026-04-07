import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimit } from "@/lib/api-utils";
import { enviarEmail } from "@/lib/email";
import {
  templateConviteWorkspace,
  templateCardAtribuido,
} from "@/lib/email-templates";

const schema = z.object({
  tipo: z.enum(["convite", "card_atribuido"]),
  destinatario: z.string().email(),
  dados: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  // Rate limit: 20 emails per minute per IP
  const limited = applyRateLimit(request, "email-send", { maxRequests: 20 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { tipo, destinatario, dados } = parsed.data;

  // Verificar preferencias do destinatario
  const service = createServiceClient();
  const { data: perfil } = await service
    .from("perfis")
    .select("notif_preferences, nome")
    .eq("email", destinatario)
    .maybeSingle();

  const prefs = (perfil?.notif_preferences || {}) as Record<string, boolean>;

  // Mapear tipo → preferencia
  const prefMap: Record<string, string> = {
    convite: "email_convite",
    card_atribuido: "email_card_atribuido",
  };

  const prefKey = prefMap[tipo];
  if (prefKey && prefs[prefKey] === false) {
    return NextResponse.json({ ok: true, skipped: true, reason: "preference_disabled" });
  }

  // Buscar nome do remetente
  const { data: remetente } = await service
    .from("perfis")
    .select("nome")
    .eq("id", user.id)
    .single();

  const nomeRemetente = remetente?.nome || user.email || "Alguem";

  // Gerar email baseado no tipo
  let email: { subject: string; html: string } | null = null;

  switch (tipo) {
    case "convite":
      email = templateConviteWorkspace({
        nomeConvidado: perfil?.nome || destinatario,
        nomeWorkspace: (dados.nomeWorkspace as string) || "Workspace",
        nomeConvidador: nomeRemetente,
      });
      break;

    case "card_atribuido":
      email = templateCardAtribuido({
        nomeUsuario: perfil?.nome || destinatario,
        tituloCard: (dados.tituloCard as string) || "Card",
        nomeWorkspace: (dados.nomeWorkspace as string) || "Workspace",
        quadroId: (dados.quadroId as string) || undefined,
      });
      break;
  }

  if (email) {
    enviarEmail({ to: destinatario, ...email });
  }

  return NextResponse.json({ ok: true });
}
