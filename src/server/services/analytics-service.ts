import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  AnalyticsRepository,
  type AnalyticsDateRange,
  type WorkspaceAnalyticsData,
  type AgentPerformanceRow,
  type LeadFunnelData,
  type HandoffMetricsData,
  type UsageLimitsData,
  type OperationalAlert,
} from "@/server/repositories/analytics-repository";

export type { AnalyticsDateRange, WorkspaceAnalyticsData, AgentPerformanceRow, LeadFunnelData, HandoffMetricsData, UsageLimitsData, OperationalAlert };

type Client = SupabaseClient<Database>;

export type DatePreset = "today" | "7d" | "30d" | "month" | "custom";

export function resolveDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string
): AnalyticsDateRange {
  const now = new Date();
  const to = now.toISOString();

  switch (preset) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to };
    }
    case "7d": {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to };
    }
    case "30d": {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString(), to };
    }
    case "custom":
      return {
        from: customFrom ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: customTo ?? to,
      };
    default:
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to };
  }
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export interface UsageLimitWithPct extends UsageLimitsData {
  messages_pct: number | null;
  agents_pct: number | null;
  documents_pct: number | null;
  connections_pct: number | null;
  messages_severity: "ok" | "warning" | "critical";
}

function toUsagePct(used: number, limit: number): number | null {
  if (limit === -1) return null;
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.round((used / limit) * 100);
}

function toSeverity(pct: number | null): "ok" | "warning" | "critical" {
  if (pct === null) return "ok";
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warning";
  return "ok";
}

const ALERT_TYPE_HREFS: Record<string, string> = {
  active_handoff: "/dashboard/conversations",
  whatsapp_send_failed: "/dashboard/whatsapp",
  claude_error: "/dashboard/analytics",
  knowledge_doc_failed: "/dashboard/knowledge",
  whatsapp_connection_failed: "/dashboard/whatsapp",
  plan_usage_warning: "/dashboard/analytics/usage",
  plan_usage_critical: "/dashboard/analytics/usage",
};

export class AnalyticsService {
  private readonly repo: AnalyticsRepository;

  constructor(private readonly db: Client) {
    this.repo = new AnalyticsRepository(db);
  }

  async getWorkspaceOverview(
    workspaceId: string,
    range: AnalyticsDateRange
  ): Promise<WorkspaceAnalyticsData | null> {
    return this.repo.getWorkspaceAnalytics(workspaceId, range);
  }

  async getAgentPerformance(
    workspaceId: string,
    range: AnalyticsDateRange
  ): Promise<AgentPerformanceRow[]> {
    return this.repo.getAgentPerformance(workspaceId, range);
  }

  async getLeadFunnel(workspaceId: string): Promise<LeadFunnelData> {
    return this.repo.getLeadFunnel(workspaceId);
  }

  async getHandoffMetrics(workspaceId: string): Promise<HandoffMetricsData> {
    return this.repo.getHandoffMetrics(workspaceId);
  }

  async getUsageLimits(workspaceId: string): Promise<UsageLimitWithPct | null> {
    const raw = await this.repo.getUsageLimits(workspaceId);
    if (!raw) return null;
    const messages_pct = toUsagePct(raw.messages_used, raw.messages_limit);
    return {
      ...raw,
      messages_pct,
      agents_pct: toUsagePct(raw.agents_used, raw.agents_limit),
      documents_pct: toUsagePct(raw.documents_used, raw.documents_limit),
      connections_pct: toUsagePct(raw.whatsapp_connections_used, raw.whatsapp_numbers_limit),
      messages_severity: toSeverity(messages_pct),
    };
  }

  async getOperationalAlerts(workspaceId: string): Promise<OperationalAlert[]> {
    const alerts = await this.repo.getOperationalAlerts(workspaceId);
    return alerts.map((a) => ({
      ...a,
      action_href: a.action_href ?? ALERT_TYPE_HREFS[a.type] ?? "/dashboard",
    }));
  }
}
