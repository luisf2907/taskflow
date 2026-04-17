/**
 * SMTP driver — nodemailer. Usado quando operador tem SMTP server
 * (interno, Gmail relay, Mailgun, Postmark SMTP, etc.).
 */

import type { EmailDriver, SendParams, SendResult } from "./types";

const DEFAULT_FROM = "Taskflow <noreply@localhost>";

export class SmtpEmailDriver implements EmailDriver {
  private readonly config: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  };
  private readonly defaultFrom: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    if (!host || !Number.isFinite(port)) {
      throw new Error("SmtpEmailDriver requer SMTP_HOST e SMTP_PORT.");
    }

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === "true";

    this.config = {
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    };
    this.defaultFrom = process.env.SMTP_FROM ?? user ?? DEFAULT_FROM;
  }

  async send(params: SendParams): Promise<SendResult> {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport(this.config);

    const result = await transporter.sendMail({
      from: params.from ?? this.defaultFrom,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { id: result.messageId };
  }
}
