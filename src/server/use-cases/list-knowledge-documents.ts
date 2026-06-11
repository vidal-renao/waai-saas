import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeDocumentService } from "@/server/services/knowledge-document-service";

type Client = SupabaseClient<Database>;

export async function listKnowledgeDocumentsUseCase(db: Client, userId: string) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { documents: [], workspaceId: null };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return { documents: [], workspaceId: null };

  const service = new KnowledgeDocumentService(db);
  const [documents, documentCount] = await Promise.all([
    service.listDocuments(workspaceId),
    service.getDocumentCount(workspaceId),
  ]);

  return { documents, workspaceId, documentCount };
}
