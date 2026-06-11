import { observability } from "@/server/services/observability-service";

type Severity = "info" | "warning" | "error";

export class ErrorReportingService {
  captureException(error: Error, context?: Record<string, unknown>): void {
    observability.logError("exception_captured", error, context);

    // future: if (process.env.SENTRY_DSN) { Sentry.captureException(error, { extra: context }); }
  }

  captureMessage(
    message: string,
    level: Severity = "error",
    context?: Record<string, unknown>
  ): void {
    const logLevel = level === "warning" ? "warn" : level;
    observability.log(logLevel, "message_captured", { message, ...context });

    // future: if (process.env.SENTRY_DSN) { Sentry.captureMessage(message, level); }
  }
}

export const errorReporting = new ErrorReportingService();
