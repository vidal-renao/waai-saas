import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PeriodUsage } from "@/lib/billing/types";

type Client = SupabaseClient<Database>;

export class UsageAccountingService {
  constructor(private readonly db: Client) {}

  // Only outbound (agent-generated) messages count toward the plan limit.
  // channel param reserved for future per-channel tracking.
  async incrementMessageSent(workspaceId: string, channel?: string): Promise<void> {
    void channel; // reserved for future per-channel breakdown
    await this.db.rpc("waai_increment_usage_counter" as never, {
      p_workspace_id: workspaceId,
      p_period_month: this.currentMonth(),
      p_field: "messages_sent",
    } as never);
  }

  async incrementDocumentUploaded(workspaceId: string): Promise<void> {
    await this.db.rpc("waai_increment_usage_counter" as never, {
      p_workspace_id: workspaceId,
      p_period_month: this.currentMonth(),
      p_field: "documents_uploaded",
    } as never);
  }

  async incrementAgentCreated(workspaceId: string): Promise<void> {
    await this.db.rpc("waai_increment_usage_counter" as never, {
      p_workspace_id: workspaceId,
      p_period_month: this.currentMonth(),
      p_field: "agents_created",
    } as never);
  }

  async getCurrentPeriodUsage(workspaceId: string): Promise<PeriodUsage> {
    const periodMonth = this.currentMonth();
    const { data, error } = await this.db
      .from("waai_usage_counters")
      .select("messages_sent, documents_uploaded, agents_created")
      .eq("workspace_id", workspaceId)
      .eq("period_month", periodMonth)
      .single();

    if (error || !data) {
      return { messages_sent: 0, documents_uploaded: 0, agents_created: 0 };
    }
    return data;
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  }
}
