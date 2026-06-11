import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiHandoff } from "@/types/database";
import { HandoffService } from "@/server/services/handoff-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function resolveHandoffUseCase(
  db: Client,
  userId: string,
  handoffId: string
): Promise<WaaiHandoff | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const handoffService = new HandoffService(db);
  return handoffService.resolveHandoff(handoffId, workspaceId, userId, userRole);
}
