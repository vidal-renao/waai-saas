import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class KnowledgeEventRepository {
  constructor(private readonly db: Client) {}

  async log(input: {
    workspaceId: string;
    documentId?: string | null;
    agentId?: string | null;
    actorUserId?: string | null;
    eventType: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.rpc("waai_log_knowledge_event", {
      p_workspace_id: input.workspaceId,
      p_document_id: input.documentId ?? null,
      p_agent_id: input.agentId ?? null,
      p_actor_user_id: input.actorUserId ?? null,
      p_event_type: input.eventType,
      p_metadata: input.metadata ?? {},
    });
  }
}
