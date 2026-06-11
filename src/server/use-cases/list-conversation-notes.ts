import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiInternalNote } from "@/types/database";
import { InternalNoteService } from "@/server/services/internal-note-service";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function listConversationNotesUseCase(
  db: Client,
  userId: string,
  conversationId: string
): Promise<WaaiInternalNote[]> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return [];

  // Validate conversation belongs to workspace
  const convRepo = new ConversationRepository(db);
  const conv = await convRepo.findById(conversationId);
  if (!conv || conv.workspace_id !== workspaceId) return [];

  const noteService = new InternalNoteService(db);
  return noteService.listConversationNotes(conversationId);
}
