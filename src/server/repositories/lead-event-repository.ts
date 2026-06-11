import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLeadEvent } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateLeadEventInput {
  workspaceId: string;
  leadId: string;
  actorUserId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export class LeadEventRepository {
  constructor(private readonly db: Client) {}

  async log(input: CreateLeadEventInput): Promise<WaaiLeadEvent> {
    const { data, error } = await this.db
      .from("waai_lead_events")
      .insert({
        workspace_id: input.workspaceId,
        lead_id: input.leadId,
        actor_user_id: input.actorUserId ?? null,
        event_type: input.eventType,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(`LeadEventRepository.log: ${error.message}`);
    return data;
  }

  async findByLead(leadId: string, limit = 50): Promise<WaaiLeadEvent[]> {
    const { data, error } = await this.db
      .from("waai_lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`LeadEventRepository.findByLead: ${error.message}`);
    return data ?? [];
  }
}
