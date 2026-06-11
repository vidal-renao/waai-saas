import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiWhatsappMessage,
  WaaiWhatsappMessageDirection,
  WaaiWhatsappMessageType,
  WaaiWhatsappDeliveryStatus,
} from "@/types/database";

type MessageUpdateRow =
  Database["public"]["Tables"]["waai_whatsapp_messages"]["Update"];

type Client = SupabaseClient<Database>;

export interface CreateWhatsappMessageInput {
  workspaceId: string;
  connectionId: string;
  conversationId?: string | null;
  messageId?: string | null;
  externalMessageId?: string | null;
  externalChatId: string;
  fromNumber?: string | null;
  toNumber?: string | null;
  direction?: WaaiWhatsappMessageDirection;
  messageType?: WaaiWhatsappMessageType;
  textContent?: string | null;
  deliveryStatus?: WaaiWhatsappDeliveryStatus;
  providerMetadata?: Record<string, unknown>;
  sentAt?: string | null;
}

export class WhatsappMessageRepository {
  constructor(private readonly db: Client) {}

  async create(input: CreateWhatsappMessageInput): Promise<WaaiWhatsappMessage> {
    const { data, error } = await this.db
      .from("waai_whatsapp_messages")
      .insert({
        workspace_id: input.workspaceId,
        connection_id: input.connectionId,
        conversation_id: input.conversationId ?? null,
        message_id: input.messageId ?? null,
        external_message_id: input.externalMessageId ?? null,
        external_chat_id: input.externalChatId,
        from_number: input.fromNumber ?? null,
        to_number: input.toNumber ?? null,
        direction: input.direction ?? "inbound",
        message_type: input.messageType ?? "text",
        text_content: input.textContent ?? null,
        delivery_status: input.deliveryStatus ?? ((input.direction ?? "inbound") === "inbound" ? "received" : "pending"),
        provider_metadata: input.providerMetadata ?? {},
        sent_at: input.sentAt ?? null,
      })
      .select()
      .single();
    if (error)
      throw new Error(`WhatsappMessageRepository.create: ${error.message}`);
    return data;
  }

  async findByExternalMessageId(
    connectionId: string,
    externalMessageId: string
  ): Promise<WaaiWhatsappMessage | null> {
    const { data, error } = await this.db
      .from("waai_whatsapp_messages")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("external_message_id", externalMessageId)
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async updateDeliveryStatus(
    id: string,
    status: WaaiWhatsappDeliveryStatus,
    opts?: { errorMessage?: string; sentAt?: string; deliveredAt?: string; readAt?: string; failedAt?: string; messageId?: string; conversationId?: string }
  ): Promise<void> {
    const patch: MessageUpdateRow = {
      delivery_status: status,
      updated_at: new Date().toISOString(),
    };
    if (opts?.errorMessage !== undefined) patch.error_message = opts.errorMessage;
    if (opts?.sentAt !== undefined) patch.sent_at = opts.sentAt;
    if (opts?.deliveredAt !== undefined) patch.delivered_at = opts.deliveredAt;
    if (opts?.readAt !== undefined) patch.read_at = opts.readAt;
    if (opts?.failedAt !== undefined) patch.failed_at = opts.failedAt;
    if (opts?.messageId !== undefined) patch.message_id = opts.messageId;
    if (opts?.conversationId !== undefined) patch.conversation_id = opts.conversationId;

    const { error } = await this.db
      .from("waai_whatsapp_messages")
      .update(patch)
      .eq("id", id);
    if (error)
      throw new Error(`WhatsappMessageRepository.updateDeliveryStatus: ${error.message}`);
  }

  async findByConversation(
    conversationId: string,
    limit = 50
  ): Promise<WaaiWhatsappMessage[]> {
    const { data, error } = await this.db
      .from("waai_whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error)
      throw new Error(`WhatsappMessageRepository.findByConversation: ${error.message}`);
    return data ?? [];
  }
}
