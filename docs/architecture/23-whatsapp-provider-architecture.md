# Architecture 23 — WhatsApp Provider Architecture

## Design Goal

Decouple business logic from WhatsApp API specifics. Any provider (Whapi, Meta, Twilio) is swappable by changing `WHATSAPP_PROVIDER` env var without touching webhook or runtime code.

---

## Interface

```typescript
// src/lib/whatsapp/types.ts (extended)

export interface NormalizedWhatsAppMessage {
  provider: string;
  externalMessageId: string;
  externalChatId: string;       // phone number or chat ID of the remote party
  fromNumber: string;
  toNumber: string;
  text: string | null;
  messageType: "text" | "image" | "audio" | "document" | "unknown";
  timestamp: Date;
  rawPayload: unknown;
}

export interface SendTextMessageInput {
  connection: WaaiWhatsappConnection;  // contains credentials
  to: string;                          // recipient phone number
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

export interface VerifyWebhookInput {
  headers: Record<string, string>;
  rawBody: string;
  query?: Record<string, string>;
}

export interface VerifyWebhookResult {
  valid: boolean;
  challenge?: string;   // for GET verification (Meta-style)
  errorMessage?: string;
}

export interface WhatsAppProvider {
  getProviderName(): string;
  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult;
  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage | null;
  sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult>;
  getConnectionStatus(connection: WaaiWhatsappConnection): Promise<string>;
}
```

---

## Provider Implementations

### MockWhatsAppProvider
- Always returns `valid: true` for `verifyWebhook`
- `normalizeIncomingMessage` parses a standard test payload `{ from, text, chatId }`
- `sendTextMessage` logs to console, returns fake `externalMessageId`
- Used in: local development, CI, simulate endpoint
- Env: `WHATSAPP_PROVIDER=mock` (or absent)

### WhapiCloudProvider
- `verifyWebhook`: checks `X-Whapi-Token` header against `WHAPI_TOKEN`
- `normalizeIncomingMessage`: maps Whapi `messages` event to `NormalizedWhatsAppMessage`
- `sendTextMessage`: `POST {WHAPI_BASE_URL}/messages/text` with `Bearer WHAPI_TOKEN`
- Handles 429 (rate limit) by throwing `RateLimitError`
- Handles non-2xx by throwing `ProviderError` with status + message
- Env: `WHATSAPP_PROVIDER=whapi`, `WHAPI_TOKEN`, `WHAPI_BASE_URL`

### MetaCloudProvider (stub — Fase 6+)
- Placeholder class, throws `NotImplementedError` on all methods
- `verifyWebhook` handles GET hub challenge verification (documented for later)

---

## Factory

```typescript
// src/lib/whatsapp/whatsapp-provider-factory.ts
export function createWhatsAppProvider(): WhatsAppProvider {
  const name = process.env.WHATSAPP_PROVIDER ?? "mock";
  switch (name) {
    case "whapi": return new WhapiCloudProvider();
    case "mock":  return new MockWhatsAppProvider();
    default:      return new MockWhatsAppProvider();
  }
}
```

---

## Credential Security

- `WHAPI_TOKEN` read only in `WhapiCloudProvider` constructor (server-side only)
- Never serialized to JSON responses or logged
- `provider_metadata` in DB stores non-sensitive config (base URL, instance ID, phone)
- Webhook secret stored as `webhook_secret_hash` (hashed with bcrypt, not plain text) in the DB
  - For MVP: stored as plain text hash for comparison; upgrade to proper HMAC in Fase 6

---

## Adding a New Provider (future)

1. Implement `WhatsAppProvider` interface
2. Add case to `createWhatsAppProvider()`
3. Add env vars to `.env.example`
4. Write tests for `normalizeIncomingMessage` with real payload samples
