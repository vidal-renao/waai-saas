import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiSandboxSession } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateSandboxSessionInput {
  workspaceId: string;
  agentId: string;
  conversationId: string;
  createdBy?: string | null;
}

export class SandboxSessionRepository {
  constructor(private readonly db: Client) {}

  async findByAgent(agentId: string): Promise<WaaiSandboxSession[]> {
    const { data, error } = await this.db
      .from("waai_sandbox_sessions")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(
        `SandboxSessionRepository.findByAgent: ${error.message}`
      );
    return data ?? [];
  }

  async create(input: CreateSandboxSessionInput): Promise<WaaiSandboxSession> {
    const { data, error } = await this.db
      .from("waai_sandbox_sessions")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId,
        conversation_id: input.conversationId,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();

    if (error)
      throw new Error(`SandboxSessionRepository.create: ${error.message}`);
    return data;
  }
}
