import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentPromptVersion } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentConfigRepository } from "@/server/repositories/agent-config-repository";
import { AgentPermissionService } from "@/server/services/agent-permission-service";
import { AgentPromptBuilderService } from "@/server/services/agent-prompt-builder-service";

type Client = SupabaseClient<Database>;

type Result =
  | { promptVersion: WaaiAgentPromptVersion; error?: never }
  | { promptVersion?: never; error: string; code?: "FORBIDDEN" | "NOT_FOUND" };

export async function generateAgentSystemPromptUseCase(
  db: Client,
  userId: string,
  agentId: string
): Promise<Result> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "No workspace found", code: "NOT_FOUND" };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return { error: "Not a workspace member", code: "FORBIDDEN" };

  const permService = new AgentPermissionService();
  if (!permService.canPerformAction(membership.role, "generate_prompt")) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const agentRepo = new AgentRepository(db);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) {
    return { error: "Agent not found", code: "NOT_FOUND" };
  }

  const configRepo = new AgentConfigRepository(db);
  const config = await configRepo.findByAgent(agentId);
  if (!config) {
    return { error: "Agent configuration not found. Complete the wizard first." };
  }

  try {
    const promptBuilderService = new AgentPromptBuilderService(db);
    const promptVersion = await promptBuilderService.generateAndSave(agent, config, userId);
    return { promptVersion };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate prompt";
    return { error: message };
  }
}
