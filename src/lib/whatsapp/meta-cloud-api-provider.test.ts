import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { MetaCloudApiProvider } from "./meta-cloud-api-provider";
import { encryptSecret } from "@/lib/security/encryption";
import type { WaaiWhatsappConnection } from "@/types/database";

const APP_SECRET = "test_app_secret_abc123";
// 32-byte key (64 hex chars) for encryption round-trips.
const ENC_KEY = "a".repeat(64);

function makeConnection(
  overrides: Partial<WaaiWhatsappConnection> = {}
): WaaiWhatsappConnection {
  return {
    id: "conn_1",
    workspace_id: "ws_1",
    agent_id: "agent_1",
    provider: "meta",
    display_name: "Test",
    phone_number: "41791112233",
    phone_number_id: "PHONE_NUM_ID",
    external_instance_id: null,
    status: "active",
    webhook_url: null,
    webhook_secret_hash: null,
    provider_metadata: {},
    last_connected_at: null,
    last_error_message: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function signBody(body: string, secret = APP_SECRET): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")
  );
}

const textPayload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { display_phone_number: "41780000000", phone_number_id: "PHONE_NUM_ID" },
            messages: [
              {
                from: "41794445566",
                id: "wamid.TEXT1",
                timestamp: "1719900000",
                type: "text",
                text: { body: "Hola" },
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
});

describe("MetaCloudApiProvider", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.META_APP_SECRET = APP_SECRET;
    process.env.ENCRYPTION_KEY = ENC_KEY;
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_GRAPH_API_VERSION;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("reports its provider name", () => {
    expect(new MetaCloudApiProvider().getProviderName()).toBe("meta");
  });

  // ── verifyWebhook ──────────────────────────────────────────────────────────

  it("accepts a valid HMAC-SHA256 signature", () => {
    const p = new MetaCloudApiProvider();
    const res = p.verifyWebhook({
      headers: { "x-hub-signature-256": signBody(textPayload) },
      rawBody: textPayload,
    });
    expect(res.valid).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const p = new MetaCloudApiProvider();
    const res = p.verifyWebhook({
      headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) },
      rawBody: textPayload,
    });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe("invalid_webhook_signature");
  });

  it("rejects a tampered body", () => {
    const p = new MetaCloudApiProvider();
    const res = p.verifyWebhook({
      headers: { "x-hub-signature-256": signBody(textPayload) },
      rawBody: textPayload + " ",
    });
    expect(res.valid).toBe(false);
  });

  it("rejects a missing signature", () => {
    const p = new MetaCloudApiProvider();
    const res = p.verifyWebhook({ headers: {}, rawBody: textPayload });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe("missing_signature");
  });

  it("fails closed when the app secret is not configured", () => {
    delete process.env.META_APP_SECRET;
    const p = new MetaCloudApiProvider();
    const res = p.verifyWebhook({
      headers: { "x-hub-signature-256": signBody(textPayload) },
      rawBody: textPayload,
    });
    expect(res.valid).toBe(false);
    expect(res.errorMessage).toBe("meta_app_secret_not_configured");
  });

  // ── normalizeIncomingMessage ────────────────────────────────────────────────

  it("normalizes a text message", () => {
    const p = new MetaCloudApiProvider();
    const n = p.normalizeIncomingMessage(JSON.parse(textPayload));
    expect(n).not.toBeNull();
    expect(n?.provider).toBe("meta");
    expect(n?.externalMessageId).toBe("wamid.TEXT1");
    expect(n?.fromNumber).toBe("41794445566");
    expect(n?.externalChatId).toBe("41794445566");
    expect(n?.toNumber).toBe("41780000000");
    expect(n?.messageType).toBe("text");
    expect(n?.text).toBe("Hola");
    expect(n?.timestamp.getTime()).toBe(1719900000 * 1000);
  });

  it("ignores delivery-status webhooks (no messages)", () => {
    const p = new MetaCloudApiProvider();
    const statusPayload = {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { statuses: [{ status: "delivered" }] } }] }],
    };
    expect(p.normalizeIncomingMessage(statusPayload)).toBeNull();
  });

  it("returns null for malformed payloads", () => {
    const p = new MetaCloudApiProvider();
    expect(p.normalizeIncomingMessage(null)).toBeNull();
    expect(p.normalizeIncomingMessage({})).toBeNull();
    expect(p.normalizeIncomingMessage({ entry: [] })).toBeNull();
  });

  // ── media messages ──────────────────────────────────────────────────────────

  function mediaPayload(type: string, media: Record<string, unknown>) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { display_phone_number: "41780000000" },
                messages: [
                  {
                    from: "41794445566",
                    id: `wamid.${type.toUpperCase()}`,
                    timestamp: "1719900000",
                    type,
                    [type]: media,
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  }

  it("surfaces the caption of a captioned image", () => {
    const p = new MetaCloudApiProvider();
    const n = p.normalizeIncomingMessage(
      mediaPayload("image", { id: "media_1", mime_type: "image/jpeg", caption: "mira esto" })
    );
    expect(n?.messageType).toBe("image");
    expect(n?.text).toBe("mira esto");
  });

  it("surfaces the caption of a document", () => {
    const p = new MetaCloudApiProvider();
    const n = p.normalizeIncomingMessage(
      mediaPayload("document", { id: "media_2", filename: "factura.pdf", caption: "la factura" })
    );
    expect(n?.messageType).toBe("document");
    expect(n?.text).toBe("la factura");
  });

  it("maps voice notes to audio with no caption text", () => {
    const p = new MetaCloudApiProvider();
    const n = p.normalizeIncomingMessage(
      mediaPayload("audio", { id: "media_3", mime_type: "audio/ogg", voice: true })
    );
    expect(n?.messageType).toBe("audio");
    expect(n?.text).toBeNull();
  });

  it("keeps an uncaptioned image as image with null text", () => {
    const p = new MetaCloudApiProvider();
    const n = p.normalizeIncomingMessage(
      mediaPayload("image", { id: "media_4", mime_type: "image/png" })
    );
    expect(n?.messageType).toBe("image");
    expect(n?.text).toBeNull();
  });

  // ── sendTextMessage ─────────────────────────────────────────────────────────

  it("fails when phone_number_id is missing", async () => {
    process.env.META_ACCESS_TOKEN = "ENV_TOKEN";
    const p = new MetaCloudApiProvider();
    const res = await p.sendTextMessage({
      connection: makeConnection({ phone_number_id: null }),
      to: "41794445566",
      text: "hi",
    });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("meta_phone_number_id_missing");
  });

  it("fails closed when no access token is available", async () => {
    const p = new MetaCloudApiProvider();
    const res = await p.sendTextMessage({
      connection: makeConnection(),
      to: "41794445566",
      text: "hi",
    });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("meta_access_token_missing");
  });

  it("sends via the Graph API and returns the message id (env token)", async () => {
    process.env.META_ACCESS_TOKEN = "ENV_TOKEN";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: "wamid.OUT1" }] }), {
          status: 200,
        })
      );
    const p = new MetaCloudApiProvider();
    const res = await p.sendTextMessage({
      connection: makeConnection(),
      to: "41794445566",
      text: "hello",
    });

    expect(res.success).toBe(true);
    expect(res.externalMessageId).toBe("wamid.OUT1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/PHONE_NUM_ID/messages");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ENV_TOKEN");
  });

  it("prefers the encrypted per-connection token over the env token", async () => {
    process.env.META_ACCESS_TOKEN = "ENV_TOKEN";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: "wamid.OUT2" }] }), {
          status: 200,
        })
      );
    const connection = makeConnection({
      provider_metadata: { access_token: encryptSecret("PER_CONN_TOKEN") },
    });
    const p = new MetaCloudApiProvider();
    await p.sendTextMessage({ connection, to: "41794445566", text: "hey" });

    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer PER_CONN_TOKEN");
  });

  it("returns failure on a non-ok Graph API response", async () => {
    process.env.META_ACCESS_TOKEN = "ENV_TOKEN";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad" } }), {
        status: 400,
      })
    );
    const p = new MetaCloudApiProvider();
    const res = await p.sendTextMessage({
      connection: makeConnection(),
      to: "41794445566",
      text: "hi",
    });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("Meta error 400");
  });
});
