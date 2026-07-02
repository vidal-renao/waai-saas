import * as Sentry from "@sentry/nextjs";

// Browser Sentry initialisation. Uses a public DSN and is disabled unless
// NEXT_PUBLIC_SENTRY_DSN is set, so no client telemetry runs by default.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
