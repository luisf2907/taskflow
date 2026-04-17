import * as Sentry from "@sentry/nextjs";

// Driver de observability (respeita OBS_DRIVER server-side OR o mirror
// NEXT_PUBLIC_). Sentry SDK e compat com GlitchTip — troca de backend e
// so mudar o DSN.
const driver = process.env.OBS_DRIVER ?? process.env.NEXT_PUBLIC_OBS_DRIVER ?? "sentry";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = (driver === "sentry" || driver === "glitchtip") && !!dsn;

Sentry.init({
  dsn,
  enabled,

  // Performance: sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
});
