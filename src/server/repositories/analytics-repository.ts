import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface AnalyticsDateRange {
  from: string; // ISO timestamptz
  to: string;   // ISO timestamptz
}

export interface WorkspaceAnalyticsData {
  total_conversations: number;
  open_conversations: number;
  total_messages: number;
  total_leads: number;
  active_agents: number;
  active_whatsapp_connections: number;
  open_handoffs: number;
  conversations_in_period: number;
  messages_in_period: number;
  user_messages_in_period: number;
  assistant_messages_in_period: number;
  leads_in_period: number;
  handoffs_in_period: number;
  conversations_by_channel: Record<string, number>;
  conversations_by_status: Record<string, number>;
  total_runs: number;
  success_runs: number;
  error_runs: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_cents: number;
  avg_latency_ms: number | null;
  rag_runs: number;
  docs_ready: number;
  docs_processing: number;
  docs_failed: number;
  wa_inbound: number;
  wa_outbound: number;
  wa_failed: number;
}

export interface AgentPerformanceRow {
  agent_id: string;
  agent_name: string;
  agent_status: string;
  primary_language: string;
  conversations_count: number;
  messages_count: number;
  leads_count: number;
  handoffs_count: number;
  total_runs: number;
  error_count: number;
  rag_runs: number;
  avg_latency_ms: number | null;
}

export interface LeadFunnelData {
  new_count: number;
  qualified_count: number;
  contacted_count: number;
  won_count: number;
  lost_count: number;
  archived_count: number;
  active_total: number;
  urgent_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  from_whatsapp: number;
  from_sandbox: number;
  from_manual: number;
}

export interface UsageLimitsData {
  plan_id: string;
  plan_name: string;
  agents_limit: number;
  messages_limit: number;
  documents_limit: number;
  whatsapp_numbers_limit: number;
  human_handoff_enabled: boolean;
  messages_used: number;
  agents_used: number;
  documents_used: number;
  whatsapp_connections_used: number;
  members_count: number;
}

export interface OperationalAlert {
  // entity_id serves as the stable per-alert identifier (alerts are computed, not persisted)
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  conversation_id?: string | null;
  created_at: string;
  action_href?: string | null;
}

export interface HandoffMetricsData {
  active_count: number;
  resolved_count: number;
  canceled_count: number;
  trigger_manual: number;
  trigger_customer_request: number;
  trigger_low_confidence: number;
  trigger_angry_customer: number;
  trigger_urgent_request: number;
  trigger_sensitive_topic: number;
  trigger_system_rule: number;
  avg_resolution_minutes: number | null;
}

export class AnalyticsRepository {
  constructor(private readonly db: Client) {}

  async getWorkspaceAnalytics(
    workspaceId: string,
    range: AnalyticsDateRange
  ): Promise<WorkspaceAnalyticsData | null> {
    const { data, error } = await this.db.rpc("waai_get_workspace_analytics", {
      p_workspace_id: workspaceId,
      p_from: range.from,
      p_to: range.to,
    });
    if (error) return null;
    return data as unknown as WorkspaceAnalyticsData;
  }

  async getAgentPerformance(
    workspaceId: string,
    range: AnalyticsDateRange
  ): Promise<AgentPerformanceRow[]> {
    const { data, error } = await this.db.rpc("waai_get_agent_performance", {
      p_workspace_id: workspaceId,
      p_from: range.from,
      p_to: range.to,
    });
    if (error) return [];
    return (data as unknown as AgentPerformanceRow[]) ?? [];
  }

  async getLeadFunnel(workspaceId: string): Promise<LeadFunnelData> {
    const zero: LeadFunnelData = {
      new_count: 0, qualified_count: 0, contacted_count: 0, won_count: 0,
      lost_count: 0, archived_count: 0, active_total: 0,
      urgent_count: 0, high_count: 0, medium_count: 0, low_count: 0,
      from_whatsapp: 0, from_sandbox: 0, from_manual: 0,
    };
    const { data, error } = await this.db
      .from("waai_analytics_lead_funnel" as never)
      .select("*")
      .eq("workspace_id" as never, workspaceId)
      .single();
    if (error || !data) return zero;
    return data as unknown as LeadFunnelData;
  }

  async getHandoffMetrics(workspaceId: string): Promise<HandoffMetricsData> {
    const zero: HandoffMetricsData = {
      active_count: 0, resolved_count: 0, canceled_count: 0,
      trigger_manual: 0, trigger_customer_request: 0, trigger_low_confidence: 0,
      trigger_angry_customer: 0, trigger_urgent_request: 0, trigger_sensitive_topic: 0,
      trigger_system_rule: 0, avg_resolution_minutes: null,
    };
    const { data, error } = await this.db
      .from("waai_analytics_handoff_metrics" as never)
      .select("*")
      .eq("workspace_id" as never, workspaceId)
      .single();
    if (error || !data) return zero;
    return data as unknown as HandoffMetricsData;
  }

  async getUsageLimits(workspaceId: string): Promise<UsageLimitsData | null> {
    const { data, error } = await this.db
      .from("waai_analytics_usage_limits" as never)
      .select("*")
      .eq("workspace_id" as never, workspaceId)
      .single();
    if (error || !data) return null;
    return data as unknown as UsageLimitsData;
  }

  async getOperationalAlerts(workspaceId: string): Promise<OperationalAlert[]> {
    const { data, error } = await this.db.rpc("waai_get_operational_alerts", {
      p_workspace_id: workspaceId,
    });
    if (error || !data) return [];
    return (data as unknown as OperationalAlert[]) ?? [];
  }
}
