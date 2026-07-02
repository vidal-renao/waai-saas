import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook. Loads the runtime-appropriate Sentry config
// once at server start. Both configs no-op when SENTRY_DSN is unset.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown while rendering App Router routes / route handlers.
export const onRequestError = Sentry.captureRequestError;
