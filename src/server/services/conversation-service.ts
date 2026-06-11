import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiConversation, WaaiMessage } from "@/types/database";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { MessageRepository } from "@/server/repositories/message-repository";

type Client = SupabaseClient<Database>;

export interface ConversationWithMessages extends WaaiConversation {
  messages: WaaiMessage[];
}

export class ConversationService {
  private readonly convRepo: ConversationRepository;
  private readonly msgRepo: MessageRepository;

  constructor(private readonly db: Client) {
    this.convRepo = new ConversationRepository(db);
    this.msgRepo = new MessageRepository(db);
  }

  async getConversationWithMessages(
    conversationId: string,
    workspaceId: string
  ): Promise<ConversationWithMessages | null> {
    const conv = await this.convRepo.findById(conversationId);
    if (!conv || conv.workspace_id !== workspaceId) return null;

    const messages = await this.msgRepo.findByConversation(conversationId, 100);
    return { ...conv, messages };
  }

  async listByAgent(
    agentId: string,
    workspaceId: string,
    limit = 20
  ): Promise<WaaiConversation[]> {
    const conversations = await this.convRepo.findByAgent(agentId, limit);
    return conversations.filter((c) => c.workspace_id === workspaceId);
  }
}
