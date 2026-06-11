import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class WhatsappConnectionEventRepository {
  constructor(private readonly db: Client) {}

  async log(
    workspaceId: string,
    connectionId: string | null,
    actorUserId: string | null,
    eventType: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await this.db.rpc("waai_log_whatsapp_connection_event", {
      p_workspace_id: workspaceId,
      p_connection_id: connectionId,
      p_actor_user_id: actorUserId,
      p_event_type: eventType,
      p_metadata: metadata,
    });
  }
}
