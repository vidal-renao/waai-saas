import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentKnowledgeService } from "@/server/services/agent-knowledge-service";

type Client = SupabaseClient<Database>;

const ALLOWED_ROLES = ["owner", "admin", "agent_manager"] as const;

export async function unlinkDocumentFromAgentUseCase(
  db: Client,
  userId: string,
  agentId: string,
  documentId: string
) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace not found.", code: "FORBIDDEN" as const };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !(ALLOWED_ROLES as readonly string[]).includes(membership.role)) {
    return { error: "No tienes permisos para desvincular documentos.", code: "FORBIDDEN" as const };
  }

  const service = new AgentKnowledgeService(db);
  const result = await service.unlinkDocument({ workspaceId, agentId, documentId, userId });
  if (result && "code" in result) return result;
  return { success: true };
}
