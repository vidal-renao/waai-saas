import crypto from "node:crypto";
import type {
  WhatsAppProvider,
  NormalizedWhatsAppMessage,
  SendTextMessageInput,
  SendTextMessageResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "./types";
import type {
  WaaiWhatsappConnection,
  WaaiWhatsappMessageType,
} from "@/types/database";
import { decryptSecret } from "@/lib/security/encryption";

const DEFAULT_GRAPH_VERSION = "v21.0";
const GRAPH_BASE = "https://graph.facebook.com";
const TIMEOUT_MS = 15_000;

// ── Meta Cloud API webhook payload shapes (partial) ─────────────────────────

interface MetaTextBody {
  body?: string;
}

// Media objects share id/caption/mime_type; document adds filename.
interface MetaMediaObject {
  id?: string;
  caption?: string;
  mime_type?: string;
  filename?: string;
}

interface MetaMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: MetaTextBody;
  image?: MetaMediaObject;
  video?: MetaMediaObject;
  document?: MetaMediaObject;
  audio?: MetaMediaObject;
  sticker?: MetaMediaObject;
}

interface MetaValue {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  messages?: MetaMessage[];
  statuses?: unknown[];
}

interface MetaChange {
  value?: MetaValue;
  field?: string;
}

interface MetaEntry {
  id?: string;
  changes?: MetaChange[];
}

interface MetaPayload {
  object?: string;
  entry?: MetaEntry[];
}

export class MetaCloudApiProvider implements WhatsAppProvider {
  private readonly appSecret: string | undefined;
  private readonly envAccessToken: string | undefined;
  private readonly graphVersion: string;

  constructor() {
    this.appSecret = process.env.META_APP_SECRET;
    this.envAccessToken = process.env.META_ACCESS_TOKEN;
    this.graphVersion =
      process.env.META_GRAPH_API_VERSION ?? DEFAULT_GRAPH_VERSION;
  }

  getProviderName(): string {
    return "meta";
  }

  /**
   * Verify an inbound POST webhook using Meta's HMAC-SHA256 signature.
   * Meta signs the raw request body with the app secret and sends the digest
   * in `x-hub-signature-256: sha256=<hex>`. Comparison is constant-time.
   * (The GET hub.challenge handshake is handled by the webhook route.)
   */
  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
    if (!this.appSecret) {
      return { valid: false, errorMessage: "meta_app_secret_not_configured" };
    }

    const header =
      input.headers["x-hub-signature-256"] ??
      input.headers["X-Hub-Signature-256"] ??
      "";
    const provided = header.startsWith("sha256=") ? header.slice(7) : header;
    if (!provided) {
      return { valid: false, errorMessage: "missing_signature" };
    }

    const expected = crypto
      .createHmac("sha256", this.appSecret)
      .update(input.rawBody, "utf8")
      .digest("hex");

    const providedBuf = Buffer.from(provided, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return { valid: false, errorMessage: "invalid_webhook_signature" };
    }
    return { valid: true };
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage | null {
    const p = payload as MetaPayload;
    if (!p || typeof p !== "object") return null;

    const value = p.entry?.[0]?.changes?.[0]?.value;
    if (!value) return null;

    // Delivery/read receipts arrive as `statuses`, not `messages` — ignore.
    const msg = value.messages?.[0];
    if (!msg) return null;

    const from = msg.from ?? "";
    const to = value.metadata?.display_phone_number ?? "";
    const rawType = msg.type ?? "unknown";
    const messageType = this.mapMessageType(rawType);
    // Text messages carry their body; media messages surface their caption (if
    // any) so captioned images/videos/documents remain processable. The full
    // media object (id, mime_type, filename) is preserved in rawPayload.
    const text =
      rawType === "text"
        ? msg.text?.body ?? null
        : this.mediaCaption(msg, rawType);

    const tsSeconds = msg.timestamp ? Number(msg.timestamp) : NaN;
    const timestamp = Number.isFinite(tsSeconds)
      ? new Date(tsSeconds * 1000)
      : new Date();

    return {
      provider: "meta",
      externalMessageId: msg.id ?? `meta_${Date.now()}`,
      // Meta identifies a chat by the customer's phone number (wa_id).
      externalChatId: from,
      fromNumber: from,
      toNumber: to,
      text,
      messageType,
      timestamp,
      rawPayload: payload,
    };
  }

  async sendTextMessage(
    input: SendTextMessageInput
  ): Promise<SendTextMessageResult> {
    const phoneNumberId = input.connection.phone_number_id;
    if (!phoneNumberId) {
      return this.failure("meta_phone_number_id_missing");
    }

    let accessToken: string;
    try {
      accessToken = this.resolveAccessToken(input.connection);
    } catch (err) {
      return this.failure(
        err instanceof Error ? err.message : "meta_access_token_missing"
      );
    }

    const url = `${GRAPH_BASE}/${this.graphVersion}/${phoneNumberId}/messages`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to,
          type: "text",
          text: { body: input.text },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      return this.failure(err instanceof Error ? err.message : "Network error");
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse error — handled by status check below
    }

    if (!response.ok) {
      return {
        success: false,
        externalMessageId: null,
        provider: "meta",
        rawResponse: body,
        errorMessage: `Meta error ${response.status}`,
      };
    }

    const messages = body.messages as Array<{ id?: string }> | undefined;
    return {
      success: true,
      externalMessageId: messages?.[0]?.id ?? null,
      provider: "meta",
      rawResponse: body,
    };
  }

  async getConnectionStatus(
    connection: WaaiWhatsappConnection
  ): Promise<string> {
    const phoneNumberId = connection.phone_number_id;
    if (!phoneNumberId) return "failed";

    let accessToken: string;
    try {
      accessToken = this.resolveAccessToken(connection);
    } catch {
      return "failed";
    }

    try {
      const res = await fetch(
        `${GRAPH_BASE}/${this.graphVersion}/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(5_000),
        }
      );
      return res.ok ? "active" : "failed";
    } catch {
      return "failed";
    }
  }

  /**
   * Resolve the access token for a connection. Prefers the per-connection
   * token stored (encrypted) in provider_metadata.access_token, decrypting it;
   * falls back to the platform-wide META_ACCESS_TOKEN. Throws when neither is
   * available.
   */
  private resolveAccessToken(connection: WaaiWhatsappConnection): string {
    const meta = connection.provider_metadata as Record<string, unknown> | null;
    const stored = meta?.access_token;
    if (typeof stored === "string" && stored.length > 0) {
      return decryptSecret(stored);
    }
    if (this.envAccessToken) return this.envAccessToken;
    throw new Error("meta_access_token_missing");
  }

  private failure(errorMessage: string): SendTextMessageResult {
    return {
      success: false,
      externalMessageId: null,
      provider: "meta",
      rawResponse: null,
      errorMessage,
    };
  }

  /** Caption of a captionable media message (image/video/document), if present. */
  private mediaCaption(msg: MetaMessage, rawType: string): string | null {
    switch (rawType) {
      case "image":
        return msg.image?.caption ?? null;
      case "video":
        return msg.video?.caption ?? null;
      case "document":
        return msg.document?.caption ?? null;
      default:
        return null;
    }
  }

  private mapMessageType(raw: string): WaaiWhatsappMessageType {
    switch (raw) {
      case "text":
        return "text";
      case "image":
        return "image";
      case "audio":
      case "voice":
        return "audio";
      case "document":
        return "document";
      default:
        return "unknown";
    }
  }
}
