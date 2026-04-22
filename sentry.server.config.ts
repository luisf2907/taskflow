import * as Sentry from "@sentry/nextjs";

// Driver de observability (respeita OBS_DRIVER server-side OR o mirror
// NEXT_PUBLIC_). Sentry SDK e compat com GlitchTip — troca de backend e
// so mudar o DSN.
const driver = process.env.OBS_DRIVER ?? process.env.NEXT_PUBLIC_OBS_DRIVER ?? "sentry";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = (driver === "sentry" || driver === "glitchtip") && !!dsn;

// Redacta substrings que parecem secret (API keys, tokens, JWTs, etc.) em
// strings arbitrarias. Best-effort — se um secret nao bater nenhum padrao,
// ele pode vazar; manter os filtros atualizados conforme novos providers.
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,                  // OpenAI
  /\bre_[A-Za-z0-9_-]{20,}\b/g,                  // Resend
  /\bAIza[0-9A-Za-z_-]{35}\b/g,                  // Google/Gemini
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,             // GitHub PAT
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,           // Slack
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
  /\bBearer\s+[A-Za-z0-9._-]{20,}/gi,            // Authorization header
];

const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "set-cookie",
  "gemini_api_key",
  "resend_api_key",
  "voice_worker_api_key",
  "supabase_service_role_key",
  "encryption_key",
  "smtp_password",
]);

function redactString(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redactDeep(v: any, depth = 0): any {
  if (depth > 6) return v;
  if (v == null) return v;
  if (typeof v === "string") return redactString(v);
  if (Array.isArray(v)) return v.map((x) => redactDeep(x, depth + 1));
  if (typeof v === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {};
    for (const [k, val] of Object.entries(v)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactDeep(val, depth + 1);
      }
    }
    return out;
  }
  return v;
}

Sentry.init({
  dsn,
  enabled,

  // Performance: sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Nao mandar PII default do Sentry (IP, etc). Ainda podemos anexar user
  // id manualmente quando relevante.
  sendDefaultPii: false,

  // Filtro final antes de enviar — redacta secrets em message, extra,
  // breadcrumbs, e request data.
  beforeSend(event) {
    if (event.message) event.message = redactString(event.message);
    if (event.extra) event.extra = redactDeep(event.extra);
    if (event.contexts) event.contexts = redactDeep(event.contexts);
    if (event.request) event.request = redactDeep(event.request);
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redactString(ex.value);
      }
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message) breadcrumb.message = redactString(breadcrumb.message);
    if (breadcrumb.data) breadcrumb.data = redactDeep(breadcrumb.data);
    return breadcrumb;
  },
});
