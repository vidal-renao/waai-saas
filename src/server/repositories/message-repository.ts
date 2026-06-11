import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiMessage,
  WaaiMessageRole,
  WaaiConversationChannel,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateMessageInput {
  conversationId: string;
  workspaceId: string;
  agentId?: string | null;
  role: WaaiMessageRole;
  content: string;
  channel?: WaaiConversationChannel;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

export class MessageRepository {
  constructor(private readonly db: Client) {}

  async findByConversation(
    conversationId: string,
    limit = 50
  ): Promise<WaaiMessage[]> {
    const { data, error } = await this.db
      .from("waai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error)
      throw new Error(
        `MessageRepository.findByConversation: ${error.message}`
      );
    return data ?? [];
  }

  async create(input: CreateMessageInput): Promise<WaaiMessage> {
    const { data, error } = await this.db
      .from("waai_messages")
      .insert({
        conversation_id: input.conversationId,
        workspace_id: input.workspaceId,
        agent_id: input.agentId ?? null,
        role: input.role,
        content: input.content,
        channel: input.channel ?? "sandbox",
        provider_message_id: input.providerMessageId ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error)
      throw new Error(`MessageRepository.create: ${error.message}`);
    return data;
  }
}
