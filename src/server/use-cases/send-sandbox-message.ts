import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import {
  AgentRuntimeService,
  type RuntimeOutput,
  type RuntimeError,
} from "@/server/services/agent-runtime-service";

type Client = SupabaseClient<Database>;

export async function sendSandboxMessageUseCase(
  db: Client,
  userId: string,
  agentId: string,
  data: { conversationId: string; content: string }
): Promise<RuntimeOutput | RuntimeError> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) {
    return { error: "Workspace not found.", code: "FORBIDDEN" };
  }

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) {
    return { error: "Not a workspace member.", code: "FORBIDDEN" };
  }

  const runtimeService = new AgentRuntimeService(db);
  return runtimeService.processMessage({
    workspaceId,
    agentId,
    conversationId: data.conversationId,
    userMessage: data.content,
    channel: "sandbox",
    userId,
    userRole: membership.role,
  });
}
