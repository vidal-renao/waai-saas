import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgent, WaaiAgentStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateAgentInput {
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  primaryLanguage?: string;
  channel?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string | null;
  status?: WaaiAgentStatus;
  primaryLanguage?: string;
}

export class AgentRepository {
  constructor(private readonly db: Client) {}

  async findById(agentId: string): Promise<WaaiAgent | null> {
    const { data, error } = await this.db
      .from("waai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (error) return null;
    return data;
  }

  async findByWorkspace(workspaceId: string): Promise<WaaiAgent[]> {
    const { data, error } = await this.db
      .from("waai_agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`AgentRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }

  async create(input: CreateAgentInput): Promise<WaaiAgent> {
    const { data, error } = await this.db
      .from("waai_agents")
      .insert({
        workspace_id: input.workspaceId,
        created_by: input.createdBy,
        name: input.name,
        description: input.description ?? null,
        primary_language: input.primaryLanguage ?? "es",
        channel: input.channel ?? "whatsapp",
      })
      .select()
      .single();

    if (error) throw new Error(`AgentRepository.create: ${error.message}`);
    return data;
  }

  async update(agentId: string, input: UpdateAgentInput): Promise<WaaiAgent> {
    const { data, error } = await this.db
      .from("waai_agents")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.primaryLanguage !== undefined && { primary_language: input.primaryLanguage }),
      })
      .eq("id", agentId)
      .select()
      .single();

    if (error) throw new Error(`AgentRepository.update: ${error.message}`);
    return data;
  }

  async updateStatus(agentId: string, status: WaaiAgentStatus): Promise<void> {
    const { error } = await this.db
      .from("waai_agents")
      .update({ status })
      .eq("id", agentId);

    if (error) throw new Error(`AgentRepository.updateStatus: ${error.message}`);
  }

  async countActiveByWorkspace(workspaceId: string): Promise<number> {
    const { count, error } = await this.db
      .from("waai_agents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");

    if (error) return 0;
    return count ?? 0;
  }
}
