/**
 * Resend driver — wrap da API Resend (cloud default).
 */

import type { EmailDriver, SendParams, SendResult } from "./types";

const DEFAULT_FROM = "Taskflow <noreply@carrotcompany.com.br>";

export class ResendEmailDriver implements EmailDriver {
  private readonly apiKey: string;
  private readonly defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("ResendEmailDriver requer RESEND_API_KEY.");
    }
    this.apiKey = apiKey;
    this.defaultFrom = process.env.SMTP_FROM ?? DEFAULT_FROM;
  }

  async send(params: SendParams): Promise<SendResult> {
    // Import dinamico pra evitar carregar resend se driver e outro
    const { Resend } = await import("resend");
    const resend = new Resend(this.apiKey);

    const result = await resend.emails.send({
      from: params.from ?? this.defaultFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      throw new Error(`Resend: ${result.error.message}`);
    }

    return { id: result.data?.id };
  }
}
