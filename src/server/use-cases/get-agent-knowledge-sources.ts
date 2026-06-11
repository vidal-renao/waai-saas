import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentKnowledgeService } from "@/server/services/agent-knowledge-service";
import { KnowledgeDocumentRepository } from "@/server/repositories/knowledge-document-repository";
import { AgentRepository } from "@/server/repositories/agent-repository";

type Client = SupabaseClient<Database>;

export async function getAgentKnowledgeSourcesUseCase(
  db: Client,
  userId: string,
  agentId: string
) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return null;

  const agentRepo = new AgentRepository(db);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) return null;

  const service = new AgentKnowledgeService(db);
  const sources = await service.listSources(agentId);

  // Load document details for each source
  const docRepo = new KnowledgeDocumentRepository(db);
  const documentsAll = await docRepo.findByWorkspace(workspaceId, 100);

  return {
    agent,
    sources,
    workspaceDocuments: documentsAll,
    workspaceId,
    userRole: membership.role,
  };
}
