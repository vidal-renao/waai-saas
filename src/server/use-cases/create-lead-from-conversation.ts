import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiLead } from "@/types/database";
import { LeadService } from "@/server/services/lead-service";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";

type Client = SupabaseClient<Database>;

export async function createLeadFromConversationUseCase(
  db: Client,
  userId: string,
  conversationId: string
): Promise<WaaiLead | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const membership = await membersRepo.findByUser(userId);
  if (!membership.length) return null;

  const workspaceId = membership[0].workspace_id;
  const userRole = membership[0].role;

  const convRepo = new ConversationRepository(db);
  const conv = await convRepo.findById(conversationId);
  if (!conv || conv.workspace_id !== workspaceId) return null;

  const channel = conv.channel === "sandbox" ? "sandbox" : "whatsapp";

  const leadService = new LeadService(db);
  return leadService.createLeadFromConversation(
    workspaceId,
    conversationId,
    conv.agent_id,
    channel,
    userId,
    userRole
  );
}
