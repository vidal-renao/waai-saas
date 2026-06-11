import type { WaaiWhatsappConnection, WaaiWhatsappMessageType } from "@/types/database";

// ── Normalized message from any provider ────────────────────────────────────

export interface NormalizedWhatsAppMessage {
  provider: string;
  externalMessageId: string;
  externalChatId: string;
  fromNumber: string;
  toNumber: string;
  text: string | null;
  messageType: WaaiWhatsappMessageType;
  timestamp: Date;
  rawPayload: unknown;
}

// ── Send text message ────────────────────────────────────────────────────────

export interface SendTextMessageInput {
  connection: WaaiWhatsappConnection;
  to: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SendTextMessageResult {
  success: boolean;
  externalMessageId: string | null;
  provider: string;
  rawResponse: unknown;
  errorMessage?: string;
}

// ── Webhook verification ─────────────────────────────────────────────────────

export interface VerifyWebhookInput {
  headers: Record<string, string>;
  rawBody: string;
  query?: Record<string, string>;
}

export interface VerifyWebhookResult {
  valid: boolean;
  challenge?: string;
  errorMessage?: string;
}

// ── Provider interface ───────────────────────────────────────────────────────

export interface WhatsAppProvider {
  getProviderName(): string;
  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult;
  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage | null;
  sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult>;
  getConnectionStatus(connection: WaaiWhatsappConnection): Promise<string>;
}
