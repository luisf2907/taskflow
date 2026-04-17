/**
 * Envio de email — facade fire-and-forget em cima do driver.
 *
 * Uso mantido backward-compat com callsite anteriores (resend/cloud).
 * Driver e selecionado via EMAIL_DRIVER env:
 *   - resend (default cloud)
 *   - smtp (self-hosted)
 *   - console (dev)
 *   - disabled (no-op silencioso)
 *
 * Nunca bloqueia a operacao principal. Se driver esta disabled OU
 * falha, loga o erro e continua.
 */

import { getEmailDriver } from "@/lib/drivers/email/factory";
import { EmailDisabledError } from "@/lib/drivers/email/types";
import { features } from "@/lib/features";
import { logger } from "@/lib/logger";

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia email via driver configurado (fire-and-forget).
 * Silencioso se EMAIL_DRIVER=disabled.
 */
export function enviarEmail(params: EnviarEmailParams): void {
  // Early return: se email esta desligado, nao perde tempo tentando
  if (!features.email.enabled && features.email.driver !== "console") return;

  enviarEmailAsync(params).catch(() => {});
}

async function enviarEmailAsync(params: EnviarEmailParams): Promise<void> {
  try {
    const driver = getEmailDriver();
    await driver.send({
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    if (err instanceof EmailDisabledError) {
      // Nao e erro — driver configurado como disabled.
      return;
    }
    logger.error(
      err instanceof Error ? err.message : String(err),
      "Email",
      { to: params.to, subject: params.subject },
    );
  }
}
