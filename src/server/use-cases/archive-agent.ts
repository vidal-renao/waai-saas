import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentService } from "@/server/services/agent-service";

type Client = SupabaseClient<Database>;

type Result =
  | { success: true; error?: never }
  | { success?: never; error: string; code?: "FORBIDDEN" | "NOT_FOUND" };

export async function archiveAgentUseCase(
  db: Client,
  userId: string,
  agentId: string
): Promise<Result> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "No workspace found", code: "NOT_FOUND" };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return { error: "Not a workspace member", code: "FORBIDDEN" };

  const agentRepo = new AgentRepository(db);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) {
    return { error: "Agent not found", code: "NOT_FOUND" };
  }

  if (agent.status === "archived") {
    return { error: "Agent is already archived" };
  }

  const service = new AgentService(db);
  try {
    await service.archiveAgent(agentId, workspaceId, userId, membership.role);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to archive agent";
    if (message.startsWith("FORBIDDEN")) return { error: message, code: "FORBIDDEN" };
    return { error: message };
  }
}
