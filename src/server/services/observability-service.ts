import { redactSecrets } from "@/lib/security/redact-secrets";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  event: string;
  ts: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";
const minLevel = (process.env.LOG_LEVEL ?? "info") as LogLevel;
const debugEnabled = process.env.ENABLE_DEBUG_LOGS === "true";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level: LogLevel): boolean {
  if (level === "debug" && !debugEnabled) return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function emit(level: LogLevel, event: string, metadata?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const safe = metadata ? redactSecrets(metadata) : {};
  const entry: LogEntry = { level, event, ts: new Date().toISOString(), ...safe };

  if (isDev) {
    const prefix = `[WAAI][${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, event, safe);
    } else if (level === "warn") {
      console.warn(prefix, event, safe);
    } else {
      console.log(prefix, event, safe);
    }
  } else {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }
}

export class ObservabilityService {
  log(level: LogLevel, event: string, metadata?: Record<string, unknown>): void {
    emit(level, event, metadata);
  }

  logError(event: string, error: Error, metadata?: Record<string, unknown>): void {
    emit("error", event, {
      ...metadata,
      error_message: error.message,
      error_name: error.name,
    });
  }

  logBillingLimitExceeded(
    workspaceId: string,
    resource: string,
    current: number,
    limit: number
  ): void {
    emit("warn", "billing_limit_exceeded", { workspaceId, resource, current, limit });
  }

  logHandoffActivated(workspaceId: string, conversationId: string, triggeredBy: string): void {
    emit("info", "handoff_activated", { workspaceId, conversationId, triggeredBy });
  }

  logClaudeError(workspaceId: string, agentId: string, errorMessage: string): void {
    emit("error", "agent_run_error", { workspaceId, agentId, error_message: errorMessage });
  }

  logWebhookFailed(workspaceId: string, provider: string, errorMessage: string): void {
    emit("error", "webhook_failed", { workspaceId, provider, error_message: errorMessage });
  }

  logRagFailed(workspaceId: string, agentId: string, errorMessage: string): void {
    emit("warn", "rag_failed", { workspaceId, agentId, error_message: errorMessage });
  }

  logDocumentProcessingFailed(workspaceId: string, documentId: string, reason: string): void {
    emit("error", "document_processing_failed", { workspaceId, documentId, reason });
  }

  logEmbeddingError(workspaceId: string, documentId: string, errorMessage: string): void {
    emit("error", "embedding_error", { workspaceId, documentId, error_message: errorMessage });
  }

  logWhatsappSendFailed(workspaceId: string, connectionId: string, errorMessage: string): void {
    emit("error", "whatsapp_send_failed", { workspaceId, connectionId, error_message: errorMessage });
  }

  logPlanUsageWarning(workspaceId: string, resource: string, pct: number): void {
    const level: LogLevel = pct >= 95 ? "error" : "warn";
    const event = pct >= 95 ? "plan_usage_critical" : "plan_usage_warning";
    emit(level, event, { workspaceId, resource, usage_pct: pct });
  }
}

// Singleton for use across server services
export const observability = new ObservabilityService();
