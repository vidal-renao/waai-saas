import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappMessage } from "@/types/database";
import { WhatsappMessageRepository } from "@/server/repositories/whatsapp-message-repository";
import type { CreateWhatsappMessageInput } from "@/server/repositories/whatsapp-message-repository";

type Client = SupabaseClient<Database>;

export class WhatsappMessageService {
  private readonly msgRepo: WhatsappMessageRepository;

  constructor(db: Client) {
    this.msgRepo = new WhatsappMessageRepository(db);
  }

  async createInbound(input: CreateWhatsappMessageInput): Promise<WaaiWhatsappMessage> {
    return this.msgRepo.create({ ...input, direction: "inbound", deliveryStatus: "received" });
  }

  async createOutbound(input: CreateWhatsappMessageInput): Promise<WaaiWhatsappMessage> {
    return this.msgRepo.create({ ...input, direction: "outbound", deliveryStatus: "pending" });
  }

  async markOutboundSent(id: string, externalMessageId?: string | null): Promise<void> {
    await this.msgRepo.updateDeliveryStatus(id, "sent", {
      sentAt: new Date().toISOString(),
    });
    void externalMessageId; // stored in provider_metadata on create
  }

  async markOutboundFailed(id: string, errorMessage: string): Promise<void> {
    await this.msgRepo.updateDeliveryStatus(id, "failed", {
      failedAt: new Date().toISOString(),
      errorMessage,
    });
  }

  async isDuplicate(connectionId: string, externalMessageId: string): Promise<boolean> {
    const existing = await this.msgRepo.findByExternalMessageId(connectionId, externalMessageId);
    return existing !== null;
  }
}
