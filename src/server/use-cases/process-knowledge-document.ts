import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeProcessingService } from "@/server/services/knowledge-processing-service";

type Client = SupabaseClient<Database>;

const ALLOWED_ROLES = ["owner", "admin", "agent_manager"] as const;

export async function processKnowledgeDocumentUseCase(
  db: Client,
  userId: string,
  documentId: string
) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { success: false as const, code: "FORBIDDEN", error: "Workspace not found." };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !(ALLOWED_ROLES as readonly string[]).includes(membership.role)) {
    return { success: false as const, code: "FORBIDDEN", error: "No tienes permisos para procesar documentos." };
  }

  const service = new KnowledgeProcessingService(db);
  return service.processDocument(documentId, workspaceId, userId);
}
