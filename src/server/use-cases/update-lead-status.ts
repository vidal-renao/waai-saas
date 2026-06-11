import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLead, WaaiLeadStatus } from "@/types/database";
import { LeadService } from "@/server/services/lead-service";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function updateLeadStatusUseCase(
  db: Client,
  userId: string,
  leadId: string,
  newStatus: WaaiLeadStatus
): Promise<WaaiLead | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const leadService = new LeadService(db);
  return leadService.updateStatus(leadId, workspaceId, newStatus, userId, userRole);
}
