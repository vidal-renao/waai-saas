import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLead, WaaiLeadStatus } from "@/types/database";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function listLeadsUseCase(
  db: Client,
  userId: string,
  filters?: { status?: WaaiLeadStatus; assignedTo?: string; limit?: number }
): Promise<WaaiLead[]> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return [];

  const leadRepo = new LeadRepository(db);
  return leadRepo.findByWorkspace(workspaceId, {
    status: filters?.status,
    assignedTo: filters?.assignedTo,
    limit: filters?.limit ?? 50,
  });
}
