import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeDocumentService } from "@/server/services/knowledge-document-service";

type Client = SupabaseClient<Database>;

const ALLOWED_ROLES = ["owner", "admin"] as const;

export async function archiveKnowledgeDocumentUseCase(
  db: Client,
  userId: string,
  documentId: string
) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace not found.", code: "FORBIDDEN" as const };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !(ALLOWED_ROLES as readonly string[]).includes(membership.role)) {
    return { error: "Solo owner/admin pueden archivar documentos.", code: "FORBIDDEN" as const };
  }

  const service = new KnowledgeDocumentService(db);
  const result = await service.archiveDocument(documentId, workspaceId, userId);
  if (result && "code" in result) return result;
  return { success: true };
}
