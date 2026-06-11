import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiInternalNote } from "@/types/database";
import { InternalNoteService } from "@/server/services/internal-note-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function addInternalNoteUseCase(
  db: Client,
  userId: string,
  conversationId: string | null,
  leadId: string | null,
  note: string
): Promise<WaaiInternalNote | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const noteService = new InternalNoteService(db);
  return noteService.addNote(workspaceId, conversationId, leadId, note, userId, userRole);
}
