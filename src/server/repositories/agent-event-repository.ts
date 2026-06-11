import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentEvent } from "@/types/database";

type Client = SupabaseClient<Database>;

export type AgentEventType =
  | "agent_created"
  | "agent_updated"
  | "agent_activated"
  | "agent_paused"
  | "agent_archived"
  | "prompt_generated"
  | "wizard_completed";

export interface LogAgentEventInput {
  workspaceId: string;
  agentId?: string | null;
  actorUserId?: string | null;
  eventType: AgentEventType;
  metadata?: Record<string, unknown>;
}

export class AgentEventRepository {
  constructor(private readonly db: Client) {}

  async log(input: LogAgentEventInput): Promise<void> {
    const { error } = await this.db.from("waai_agent_events").insert({
      workspace_id: input.workspaceId,
      agent_id: input.agentId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
    });

    if (error) throw new Error(`AgentEventRepository.log: ${error.message}`);
  }

  async findByAgent(agentId: string, limit = 50): Promise<WaaiAgentEvent[]> {
    const { data, error } = await this.db
      .from("waai_agent_events")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`AgentEventRepository.findByAgent: ${error.message}`);
    return data ?? [];
  }

  async findByWorkspace(workspaceId: string, limit = 50): Promise<WaaiAgentEvent[]> {
    const { data, error } = await this.db
      .from("waai_agent_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`AgentEventRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }
}
