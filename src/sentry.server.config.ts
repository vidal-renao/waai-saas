import * as Sentry from "@sentry/nextjs";
import { APP_VERSION } from "@/lib/app-version";

// Server-side (Node.js runtime) Sentry initialisation.
// Disabled automatically when SENTRY_DSN is not set — safe in dev and preview.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  release: APP_VERSION,
  tracesSampleRate: 0.1,
});
