/**
 * Email driver — contrato server-side.
 *
 * Impls: resend (cloud default), smtp (self-hosted com SMTP server),
 * console (dev, loga em stdout), disabled (no-op).
 *
 * Caller tipicamente faz fire-and-forget via enviarEmail() de
 * src/lib/email.ts que checa features.email.enabled antes.
 */

export interface EmailDriver {
  send(params: SendParams): Promise<SendResult>;
}

export interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override do from default do driver. */
  from?: string;
}

export interface SendResult {
  /** ID interno da mensagem (Resend message ID, SMTP queue id, etc). */
  id?: string;
}

export class EmailDisabledError extends Error {
  constructor() {
    super(
      "EMAIL_DRIVER=disabled — convites devem usar link copiavel, notificacoes so in-app.",
    );
    this.name = "EmailDisabledError";
  }
}
