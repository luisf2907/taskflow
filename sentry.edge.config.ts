import * as Sentry from "@sentry/nextjs";

const driver = process.env.OBS_DRIVER ?? process.env.NEXT_PUBLIC_OBS_DRIVER ?? "sentry";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = (driver === "sentry" || driver === "glitchtip") && !!dsn;

Sentry.init({
  dsn,
  enabled,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
});
