import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeDocumentService } from "@/server/services/knowledge-document-service";
import type { CreateKnowledgeDocument } from "@/lib/validators/knowledge";

type Client = SupabaseClient<Database>;

const ALLOWED_ROLES = ["owner", "admin", "agent_manager"] as const;

export async function createKnowledgeDocumentUseCase(
  db: Client,
  userId: string,
  data: CreateKnowledgeDocument
) {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace not found.", code: "FORBIDDEN" as const };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !(ALLOWED_ROLES as readonly string[]).includes(membership.role)) {
    return { error: "No tienes permisos para crear documentos.", code: "FORBIDDEN" as const };
  }

  const service = new KnowledgeDocumentService(db);
  return service.createDocument({
    workspaceId,
    userId,
    title: data.title,
    description: data.description,
    sourceType: data.source_type,
    textContent: data.text_content,
  });
}
