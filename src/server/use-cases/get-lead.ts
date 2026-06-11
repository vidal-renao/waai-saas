import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLead, WaaiLeadEvent } from "@/types/database";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { LeadEventRepository } from "@/server/repositories/lead-event-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export interface GetLeadResult {
  lead: WaaiLead;
  events: WaaiLeadEvent[];
}

export async function getLeadUseCase(
  db: Client,
  userId: string,
  leadId: string
): Promise<GetLeadResult | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const leadRepo = new LeadRepository(db);
  const lead = await leadRepo.findById(leadId, workspaceId);
  if (!lead) return null;

  const eventRepo = new LeadEventRepository(db);
  const events = await eventRepo.findByLead(leadId);

  return { lead, events };
}
