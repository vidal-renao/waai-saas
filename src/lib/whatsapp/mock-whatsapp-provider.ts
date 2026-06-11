import type {
  WhatsAppProvider,
  NormalizedWhatsAppMessage,
  SendTextMessageInput,
  SendTextMessageResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "./types";
import type { WaaiWhatsappConnection } from "@/types/database";

// Mock payload shape for simulate endpoint:
// { from: "34612345678", text: "Hello", chatId: "34612345678@s.whatsapp.net" }
interface MockInboundPayload {
  from?: string;
  text?: string;
  chatId?: string;
  externalMessageId?: string;
  toNumber?: string;
  timestamp?: number;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  private static msgCounter = 0;

  getProviderName(): string {
    return "mock";
  }

  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
    void input;
    return { valid: true };
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage | null {
    const p = payload as MockInboundPayload;
    if (!p || typeof p !== "object") return null;

    const from = p.from ?? "0000000000";
    const chatId = p.chatId ?? `${from}@s.whatsapp.net`;
    const text = typeof p.text === "string" ? p.text : null;
    const msgId = p.externalMessageId ?? `mock_msg_${Date.now()}_${++MockWhatsAppProvider.msgCounter}`;

    return {
      provider: "mock",
      externalMessageId: msgId,
      externalChatId: chatId,
      fromNumber: from,
      toNumber: p.toNumber ?? "MOCK_NUMBER",
      text,
      messageType: text !== null ? "text" : "unknown",
      timestamp: p.timestamp ? new Date(p.timestamp * 1000) : new Date(),
      rawPayload: payload,
    };
  }

  async sendTextMessage(
    input: SendTextMessageInput
  ): Promise<SendTextMessageResult> {
    const fakeId = `mock_out_${Date.now()}_${++MockWhatsAppProvider.msgCounter}`;
    console.log(`[MockWhatsApp] sendTextMessage to=${input.to}: ${input.text.substring(0, 80)}…`);
    return {
      success: true,
      externalMessageId: fakeId,
      provider: "mock",
      rawResponse: { sent: true, id: fakeId },
    };
  }

  async getConnectionStatus(connection: WaaiWhatsappConnection): Promise<string> {
    void connection;
    return "active";
  }
}
