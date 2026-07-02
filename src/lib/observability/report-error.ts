import * as Sentry from "@sentry/nextjs";
import { redactSecrets } from "@/lib/security/redact-secrets";

/**
 * Single integration point for reporting server-side exceptions.
 *
 * Catch blocks call this instead of importing Sentry directly, so error
 * reporting stays consistent and centrally controllable. When SENTRY_DSN is
 * unset the SDK is disabled and this becomes a no-op (a console.error is kept
 * as a local fallback so failures are never fully silent in dev).
 *
 * Any structured context is passed through `redactSecrets` before leaving the
 * process, so tokens, keys and PII never reach the telemetry backend.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const safeContext = context ? redactSecrets(context) : undefined;

  Sentry.captureException(error, safeContext ? { extra: safeContext } : undefined);

  if (!process.env.SENTRY_DSN) {
    // Local fallback — keeps errors visible when telemetry is disabled.
    console.error("[reportError]", error, safeContext ?? "");
  }
}
