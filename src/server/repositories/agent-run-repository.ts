import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentRun, WaaiAgentRunStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateAgentRunInput {
  workspaceId: string;
  agentId: string;
  conversationId?: string | null;
  promptVersionId?: string | null;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostCents?: number | null;
  status: WaaiAgentRunStatus;
  errorMessage?: string | null;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
}

export class AgentRunRepository {
  constructor(private readonly db: Client) {}

  async findByAgent(agentId: string, limit = 50): Promise<WaaiAgentRun[]> {
    const { data, error } = await this.db
      .from("waai_agent_runs")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(`AgentRunRepository.findByAgent: ${error.message}`);
    return data ?? [];
  }

  async findByConversation(
    conversationId: string
  ): Promise<WaaiAgentRun[]> {
    const { data, error } = await this.db
      .from("waai_agent_runs")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error)
      throw new Error(
        `AgentRunRepository.findByConversation: ${error.message}`
      );
    return data ?? [];
  }

  async create(input: CreateAgentRunInput): Promise<WaaiAgentRun> {
    const { data, error } = await this.db
      .from("waai_agent_runs")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId,
        conversation_id: input.conversationId ?? null,
        prompt_version_id: input.promptVersionId ?? null,
        provider: input.provider,
        model: input.model,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        total_tokens: input.totalTokens ?? null,
        estimated_cost_cents: input.estimatedCostCents ?? null,
        status: input.status,
        error_message: input.errorMessage ?? null,
        latency_ms: input.latencyMs ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error)
      throw new Error(`AgentRunRepository.create: ${error.message}`);
    return data;
  }
}
