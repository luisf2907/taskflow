import { logger } from "@/lib/logger";

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia email via Resend (fire-and-forget).
 * Silencioso se RESEND_API_KEY nao estiver configurado.
 * Nunca bloqueia a operacao principal.
 */
export function enviarEmail(params: EnviarEmailParams): void {
  enviarEmailAsync(params).catch(() => {});
}

async function enviarEmailAsync({ to, subject, html }: EnviarEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Silencioso se nao configurado

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Taskflow <noreply@taskflow.app>",
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error(
      err instanceof Error ? err.message : String(err),
      "Email",
      { to, subject }
    );
  }
}
