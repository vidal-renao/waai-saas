import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiMessage } from "@/types/database";
import { MessageRepository } from "@/server/repositories/message-repository";

type Client = SupabaseClient<Database>;

export class MessageService {
  private readonly msgRepo: MessageRepository;

  constructor(private readonly db: Client) {
    this.msgRepo = new MessageRepository(db);
  }

  async getConversationMessages(
    conversationId: string,
    limit = 100
  ): Promise<WaaiMessage[]> {
    return this.msgRepo.findByConversation(conversationId, limit);
  }
}
