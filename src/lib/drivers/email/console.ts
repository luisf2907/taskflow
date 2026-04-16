/**
 * Console driver — loga email em stdout em vez de enviar. Util em dev
 * e pra debugar convites sem mandar email de verdade.
 */

import type { EmailDriver, SendParams, SendResult } from "./types";

export class ConsoleEmailDriver implements EmailDriver {
  async send(params: SendParams): Promise<SendResult> {
    const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;
    // eslint-disable-next-line no-console
    console.log(`
╔═══════════════════════════════════════════════════════════════════════
║  📧 EMAIL (console driver — nao enviado)
╠═══════════════════════════════════════════════════════════════════════
║  To:      ${to}
║  From:    ${params.from ?? "Taskflow <noreply@localhost>"}
║  Subject: ${params.subject}
╠═══════════════════════════════════════════════════════════════════════
║  HTML:
${params.html
  .split("\n")
  .map((l) => `║  ${l}`)
  .join("\n")}
╚═══════════════════════════════════════════════════════════════════════
`);
    return { id: `console-${Date.now()}` };
  }
}
