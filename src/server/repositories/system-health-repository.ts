import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiSystemHealthEvent } from "@/types/database";

type Client = SupabaseClient<Database>;

export class SystemHealthRepository {
  constructor(private readonly db: Client) {}

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiSystemHealthEvent[]> {
    const { data, error } = await this.db
      .from("waai_system_health_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }

  async findUnresolved(
    workspaceId: string,
    limit = 20
  ): Promise<WaaiSystemHealthEvent[]> {
    const { data, error } = await this.db
      .from("waai_system_health_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("resolved_at", null)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }

  async getProductionHealth(
    workspaceId: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.db.rpc("waai_get_production_health", {
      p_workspace_id: workspaceId,
    });
    if (error) return null;
    return data as unknown as Record<string, unknown>;
  }
}
