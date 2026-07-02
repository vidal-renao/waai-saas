import * as Sentry from "@sentry/nextjs";
import { APP_VERSION } from "@/lib/app-version";

// Edge runtime (middleware / edge routes) Sentry initialisation.
// Disabled automatically when SENTRY_DSN is not set.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  release: APP_VERSION,
  tracesSampleRate: 0.1,
});
