import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgent } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentService } from "@/server/services/agent-service";
import type { AgentLimitCheck } from "@/server/services/agent-service";

type Client = SupabaseClient<Database>;

export interface ListAgentsResult {
  agents: WaaiAgent[];
  limitCheck: AgentLimitCheck;
  workspaceId: string;
}

export async function listAgentsUseCase(
  db: Client,
  userId: string
): Promise<ListAgentsResult | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const agentRepo = new AgentRepository(db);
  const agentService = new AgentService(db);

  const [agents, limitCheck] = await Promise.all([
    agentRepo.findByWorkspace(workspaceId),
    agentService.checkAgentLimit(workspaceId),
  ]);

  return { agents, limitCheck, workspaceId };
}
