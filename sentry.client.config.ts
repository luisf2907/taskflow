import * as Sentry from "@sentry/nextjs";

// Driver de observability (NEXT_PUBLIC_OBS_DRIVER mirror do OBS_DRIVER):
//   - "sentry" (default) → envia pro Sentry.io ou Sentry self-hosted
//   - "glitchtip"        → mesma config; Sentry SDK e 100% compat com GlitchTip
//   - "console"          → loga no console do browser, nao envia
//   - "noop"             → desabilita totalmente
const driver = process.env.NEXT_PUBLIC_OBS_DRIVER ?? "sentry";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = (driver === "sentry" || driver === "glitchtip") && !!dsn;

// Mesmas patterns do server-side — redacta secrets que eventualmente
// apareçam em logs/breadcrumbs do browser (ex: fetch() pra rota com
// Authorization header, dump de response de IA).
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bre_[A-Za-z0-9_-]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{20,}/gi,
];

function redactString(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

Sentry.init({
  dsn,
  enabled,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: false,

  integrations: [
    Sentry.replayIntegration({
      // Nao grava texto de inputs/textarea — previne vazamento de senhas,
      // conteudo de wiki privado, etc. Masca tambem todas as imagens.
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event) {
    if (event.message) event.message = redactString(event.message);
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redactString(ex.value);
      }
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message) breadcrumb.message = redactString(breadcrumb.message);
    return breadcrumb;
  },
});
