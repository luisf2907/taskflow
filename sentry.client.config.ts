import * as Sentry from "@sentry/nextjs";

// Driver de observability (NEXT_PUBLIC_OBS_DRIVER mirror do OBS_DRIVER):
//   - "sentry" (default) → envia pro Sentry.io ou Sentry self-hosted
//   - "glitchtip"        → mesma config; Sentry SDK e 100% compat com GlitchTip
//   - "console"          → loga no console do browser, nao envia
//   - "noop"             → desabilita totalmente
const driver = process.env.NEXT_PUBLIC_OBS_DRIVER ?? "sentry";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = (driver === "sentry" || driver === "glitchtip") && !!dsn;

Sentry.init({
  dsn,
  enabled,

  // Performance: sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Session Replay: capture 1% normal, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
