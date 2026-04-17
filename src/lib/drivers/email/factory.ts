/**
 * Factory de email driver — seleciona via env, singleton por runtime.
 */

import { ConsoleEmailDriver } from "./console";
import { ResendEmailDriver } from "./resend";
import { SmtpEmailDriver } from "./smtp";
import type { EmailDriver } from "./types";
import { EmailDisabledError } from "./types";

let instance: EmailDriver | null = null;

/**
 * Retorna o driver de email. Lanca EmailDisabledError se driver for
 * "disabled" — caller deve checar features.email.enabled antes.
 */
export function getEmailDriver(): EmailDriver {
  if (instance) return instance;

  // Deriva igual ao features.ts: explicit driver OU auto-detect
  const explicit = process.env.EMAIL_DRIVER;
  const driver =
    explicit ?? (process.env.RESEND_API_KEY ? "resend" : "disabled");

  switch (driver) {
    case "resend":
      instance = new ResendEmailDriver();
      break;
    case "smtp":
      instance = new SmtpEmailDriver();
      break;
    case "console":
      instance = new ConsoleEmailDriver();
      break;
    case "postmark":
      // TODO: Fase 6+ — wrapper da API Postmark
      throw new Error("EMAIL_DRIVER=postmark ainda nao implementado.");
    case "disabled":
      throw new EmailDisabledError();
    default:
      throw new Error(`EMAIL_DRIVER desconhecido: ${driver}`);
  }

  return instance;
}
