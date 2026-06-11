import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiConversationAssignment } from "@/types/database";
import { ConversationAssignmentService } from "@/server/services/conversation-assignment-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function assignConversationUseCase(
  db: Client,
  userId: string,
  conversationId: string,
  assignedTo: string,
  reason?: string | null
): Promise<WaaiConversationAssignment | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const assignService = new ConversationAssignmentService(db);
  return assignService.assignConversation(
    workspaceId,
    conversationId,
    assignedTo,
    userId,
    reason ?? null,
    userRole
  );
}
