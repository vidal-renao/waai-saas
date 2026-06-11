import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiBillingEvent } from "@/types/database";

type Client = SupabaseClient<Database>;

export class BillingEventsRepository {
  constructor(private readonly db: Client) {}

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiBillingEvent[]> {
    const { data, error } = await this.db
      .from("waai_billing_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }

  async getBillingReadinessSnapshot(
    workspaceId: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.db.rpc(
      "waai_get_billing_readiness_snapshot",
      { p_workspace_id: workspaceId }
    );
    if (error) return null;
    return data as unknown as Record<string, unknown>;
  }
}
