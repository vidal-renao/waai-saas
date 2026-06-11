import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiHandoff,
  WaaiHandoffStatus,
  WaaiHandoffRequestedBy,
  WaaiHandoffTriggerType,
} from "@/types/database";

type HandoffUpdateRow = Database["public"]["Tables"]["waai_handoffs"]["Update"];
type Client = SupabaseClient<Database>;

export interface CreateHandoffInput {
  workspaceId: string;
  conversationId: string;
  agentId?: string | null;
  requestedBy?: WaaiHandoffRequestedBy;
  reason?: string | null;
  triggerType?: WaaiHandoffTriggerType | null;
  assignedTo?: string | null;
}

export class HandoffRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string, workspaceId: string): Promise<WaaiHandoff | null> {
    const { data, error } = await this.db
      .from("waai_handoffs")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) return null;
    return data;
  }

  async findActiveByConversation(conversationId: string): Promise<WaaiHandoff | null> {
    const { data, error } = await this.db
      .from("waai_handoffs")
      .select("*")
      .eq("conversation_id", conversationId)
      .in("status", ["requested", "active"])
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async findByConversation(conversationId: string, limit = 20): Promise<WaaiHandoff[]> {
    const { data, error } = await this.db
      .from("waai_handoffs")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`HandoffRepository.findByConversation: ${error.message}`);
    return data ?? [];
  }

  async create(input: CreateHandoffInput): Promise<WaaiHandoff> {
    const { data, error } = await this.db
      .from("waai_handoffs")
      .insert({
        workspace_id: input.workspaceId,
        conversation_id: input.conversationId,
        agent_id: input.agentId ?? null,
        requested_by: input.requestedBy ?? "user",
        status: "requested",
        reason: input.reason ?? null,
        trigger_type: input.triggerType ?? null,
        automation_paused: true,
        assigned_to: input.assignedTo ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`HandoffRepository.create: ${error.message}`);
    return data;
  }

  async update(id: string, workspaceId: string, patch: HandoffUpdateRow): Promise<WaaiHandoff> {
    const { data, error } = await this.db
      .from("waai_handoffs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw new Error(`HandoffRepository.update: ${error.message}`);
    return data;
  }

  async resolveHandoff(id: string, workspaceId: string, resolvedBy: string): Promise<WaaiHandoff> {
    return this.update(id, workspaceId, {
      status: "resolved" as WaaiHandoffStatus,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      automation_paused: false,
    });
  }

  async cancelHandoff(id: string, workspaceId: string): Promise<WaaiHandoff> {
    return this.update(id, workspaceId, {
      status: "canceled" as WaaiHandoffStatus,
      automation_paused: false,
    });
  }
}
