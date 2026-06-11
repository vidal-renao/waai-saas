import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { SandboxSessionRepository } from "@/server/repositories/sandbox-session-repository";
type Client = SupabaseClient<Database>;

export interface StartSandboxResult {
  conversationId: string;
}

export interface StartSandboxError {
  error: string;
  code: "FORBIDDEN" | "NOT_FOUND";
}

export async function startSandboxConversationUseCase(
  db: Client,
  userId: string,
  agentId: string,
  title?: string
): Promise<StartSandboxResult | StartSandboxError> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace not found.", code: "NOT_FOUND" };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return { error: "Not a workspace member.", code: "FORBIDDEN" };

  const SANDBOX_ALLOWED_ROLES = ["owner", "admin", "agent_manager", "human_agent"];
  if (!SANDBOX_ALLOWED_ROLES.includes(membership.role)) {
    return { error: "No tienes permisos para usar el sandbox.", code: "FORBIDDEN" };
  }

  const agentRepo = new AgentRepository(db);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) {
    return { error: "Agente no encontrado.", code: "NOT_FOUND" };
  }

  const convRepo = new ConversationRepository(db);
  const conversation = await convRepo.create({
    workspaceId,
    agentId,
    channel: "sandbox",
    createdBy: userId,
    title: title ?? `Test - ${agent.name}`,
  });

  const sessionRepo = new SandboxSessionRepository(db);
  await sessionRepo.create({
    workspaceId,
    agentId,
    conversationId: conversation.id,
    createdBy: userId,
  });

  return { conversationId: conversation.id };
}
