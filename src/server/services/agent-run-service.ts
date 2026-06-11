import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentRun } from "@/types/database";
import { AgentRunRepository } from "@/server/repositories/agent-run-repository";

type Client = SupabaseClient<Database>;

export class AgentRunService {
  private readonly runRepo: AgentRunRepository;

  constructor(private readonly db: Client) {
    this.runRepo = new AgentRunRepository(db);
  }

  async getRunsForConversation(conversationId: string): Promise<WaaiAgentRun[]> {
    return this.runRepo.findByConversation(conversationId);
  }

  async getRunsForAgent(agentId: string, limit = 50): Promise<WaaiAgentRun[]> {
    return this.runRepo.findByAgent(agentId, limit);
  }
}
