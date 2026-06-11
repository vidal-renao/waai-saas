import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAiCostSnapshot } from "@/types/database";

type Client = SupabaseClient<Database>;

export class AiCostSnapshotsRepository {
  constructor(private readonly db: Client) {}

  async findByWorkspace(
    workspaceId: string,
    limit = 12
  ): Promise<WaaiAiCostSnapshot[]> {
    const { data, error } = await this.db
      .from("waai_ai_cost_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }

  async getAiCostSnapshot(
    workspaceId: string,
    from: string,
    to: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.db.rpc("waai_get_ai_cost_snapshot", {
      p_workspace_id: workspaceId,
      p_from: from,
      p_to: to,
    });
    if (error) return null;
    return data as unknown as Record<string, unknown>;
  }
}
