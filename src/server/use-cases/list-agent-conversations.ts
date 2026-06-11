import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiConversation } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { ConversationService } from "@/server/services/conversation-service";

type Client = SupabaseClient<Database>;

export interface AgentConversationsResult {
  conversations: WaaiConversation[];
  workspaceId: string;
}

export async function listAgentConversationsUseCase(
  db: Client,
  userId: string,
  agentId: string
): Promise<AgentConversationsResult | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const convService = new ConversationService(db);
  const conversations = await convService.listByAgent(agentId, workspaceId, 20);

  return { conversations, workspaceId };
}
