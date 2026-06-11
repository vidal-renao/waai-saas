import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentService } from "@/server/services/agent-service";
import { updateAgentConfigSchema } from "@/lib/validators/agent";

type Client = SupabaseClient<Database>;

type Result =
  | { success: true; error?: never }
  | { success?: never; error: string; code?: "FORBIDDEN" | "NOT_FOUND" };

export async function updateAgentConfigUseCase(
  db: Client,
  userId: string,
  agentId: string,
  input: unknown
): Promise<Result> {
  const parsed = updateAgentConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

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

  const service = new AgentService(db);
  try {
    await service.updateAgentConfig(agentId, workspaceId, userId, membership.role, parsed.data);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update config";
    if (message.startsWith("FORBIDDEN")) return { error: message, code: "FORBIDDEN" };
    return { error: message };
  }
}
