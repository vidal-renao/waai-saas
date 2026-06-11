import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentPromptVersion } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreatePromptVersionInput {
  agentId: string;
  version: number;
  systemPrompt: string;
  promptMetadata?: Record<string, unknown>;
  generatedBy?: string | null;
}

export class AgentPromptVersionRepository {
  constructor(private readonly db: Client) {}

  async findByAgent(agentId: string): Promise<WaaiAgentPromptVersion[]> {
    const { data, error } = await this.db
      .from("waai_agent_prompt_versions")
      .select("*")
      .eq("agent_id", agentId)
      .order("version", { ascending: false });

    if (error) throw new Error(`AgentPromptVersionRepository.findByAgent: ${error.message}`);
    return data ?? [];
  }

  async findActiveByAgent(agentId: string): Promise<WaaiAgentPromptVersion | null> {
    const { data, error } = await this.db
      .from("waai_agent_prompt_versions")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }

  async getNextVersion(agentId: string): Promise<number> {
    const { data } = await this.db
      .from("waai_agent_prompt_versions")
      .select("version")
      .eq("agent_id", agentId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    return (data?.version ?? 0) + 1;
  }

  async create(input: CreatePromptVersionInput): Promise<WaaiAgentPromptVersion> {
    const { data, error } = await this.db
      .from("waai_agent_prompt_versions")
      .insert({
        agent_id: input.agentId,
        version: input.version,
        system_prompt: input.systemPrompt,
        prompt_metadata: input.promptMetadata ?? {},
        is_active: true,
        generated_by: input.generatedBy ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`AgentPromptVersionRepository.create: ${error.message}`);
    return data;
  }

  async deactivateAll(agentId: string): Promise<void> {
    const { error } = await this.db
      .from("waai_agent_prompt_versions")
      .update({ is_active: false })
      .eq("agent_id", agentId)
      .eq("is_active", true);

    if (error) throw new Error(`AgentPromptVersionRepository.deactivateAll: ${error.message}`);
  }
}
