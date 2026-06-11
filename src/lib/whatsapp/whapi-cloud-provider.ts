import type {
  WhatsAppProvider,
  NormalizedWhatsAppMessage,
  SendTextMessageInput,
  SendTextMessageResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "./types";
import type { WaaiWhatsappConnection } from "@/types/database";

const DEFAULT_BASE_URL = "https://gate.whapi.cloud";
const TIMEOUT_MS = 15_000;

// Whapi message event payload shape (partial)
interface WhapiMessage {
  id?: string;
  chatId?: string;
  from?: string;
  to?: string;
  type?: string;
  body?: string;
  text?: { body?: string };
  timestamp?: number;
  fromMe?: boolean;
}

interface WhapiPayload {
  event?: {
    type?: string;
    data?: { messages?: WhapiMessage[] };
  };
  messages?: WhapiMessage[];
  channelId?: string;
}

export class WhapiCloudProvider implements WhatsAppProvider {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor() {
    const token = process.env.WHAPI_TOKEN;
    if (!token) throw new Error("WHAPI_TOKEN is not configured");
    this.token = token;
    this.baseUrl = (process.env.WHAPI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  getProviderName(): string {
    return "whapi";
  }

  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
    // Whapi sends the channel token in X-Whapi-Token header
    const incomingToken =
      input.headers["x-whapi-token"] ??
      input.headers["X-Whapi-Token"] ??
      "";

    if (!incomingToken || incomingToken !== this.token) {
      return { valid: false, errorMessage: "Invalid webhook token" };
    }
    return { valid: true };
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage | null {
    const p = payload as WhapiPayload;
    if (!p || typeof p !== "object") return null;

    // Support both wrapped (event.data.messages) and flat (messages) payloads
    const messages: WhapiMessage[] =
      p.event?.data?.messages ?? p.messages ?? [];

    const msg = messages[0];
    if (!msg) return null;

    // Skip messages sent by us (echo prevention)
    if (msg.fromMe === true) return null;

    const from = this.stripSuffix(msg.from ?? "");
    const to = this.stripSuffix(msg.to ?? "");
    const chatId = msg.chatId ?? `${from}@s.whatsapp.net`;
    const rawType = msg.type ?? "unknown";
    const messageType = this.mapMessageType(rawType);

    // Whapi puts text in body (for type=text) or text.body
    const text: string | null =
      messageType === "text"
        ? (msg.body ?? msg.text?.body ?? null)
        : null;

    return {
      provider: "whapi",
      externalMessageId: msg.id ?? `whapi_${Date.now()}`,
      externalChatId: chatId,
      fromNumber: from,
      toNumber: to,
      text,
      messageType,
      timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
      rawPayload: payload,
    };
  }

  async sendTextMessage(
    input: SendTextMessageInput
  ): Promise<SendTextMessageResult> {
    const url = `${this.baseUrl}/messages/text`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: input.to, body: input.text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      return {
        success: false,
        externalMessageId: null,
        provider: "whapi",
        rawResponse: null,
        errorMessage: err instanceof Error ? err.message : "Network error",
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        externalMessageId: null,
        provider: "whapi",
        rawResponse: null,
        errorMessage: "rate_limit",
      };
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse error
    }

    if (!response.ok) {
      return {
        success: false,
        externalMessageId: null,
        provider: "whapi",
        rawResponse: body,
        errorMessage: `Whapi error ${response.status}`,
      };
    }

    return {
      success: true,
      externalMessageId: (body.id as string) ?? null,
      provider: "whapi",
      rawResponse: body,
    };
  }

  async getConnectionStatus(connection: WaaiWhatsappConnection): Promise<string> {
    void connection;
    // Basic health check — try to fetch channel info
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok ? "active" : "failed";
    } catch {
      return "failed";
    }
  }

  private stripSuffix(value: string): string {
    return value.replace(/@[^@]+$/, "");
  }

  private mapMessageType(raw: string): NormalizedWhatsAppMessage["messageType"] {
    switch (raw) {
      case "text":     return "text";
      case "image":    return "image";
      case "audio":
      case "voice":    return "audio";
      case "document":
      case "file":     return "document";
      default:         return "unknown";
    }
  }
}
