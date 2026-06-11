import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { ConversationService, type ConversationWithMessages } from "@/server/services/conversation-service";

type Client = SupabaseClient<Database>;

export async function getSandboxConversationUseCase(
  db: Client,
  userId: string,
  conversationId: string
): Promise<ConversationWithMessages | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const convService = new ConversationService(db);
  return convService.getConversationWithMessages(conversationId, workspaceId);
}
