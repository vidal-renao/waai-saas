import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiHandoff,
  WaaiHandoffTriggerType,
} from "@/types/database";
import { HandoffService } from "@/server/services/handoff-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function requestHandoffUseCase(
  db: Client,
  userId: string,
  conversationId: string,
  reason?: string | null,
  triggerType?: WaaiHandoffTriggerType | null
): Promise<WaaiHandoff | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const handoffService = new HandoffService(db);
  return handoffService.requestHandoff({
    workspaceId,
    conversationId,
    requestedBy: "user",
    reason: reason ?? null,
    triggerType: triggerType ?? "manual",
    userRole,
    actorUserId: userId,
  });
}
