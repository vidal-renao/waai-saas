# Architecture 25 — Whapi.cloud MVP

## Why Whapi.cloud

- No Meta Business Verification required for MVP
- REST API, not Graph API
- Simple token-based auth
- Webhook delivery with token header
- Paid plans start at ~$30/month per instance
- Documented migration path to Meta Cloud API via adapter pattern

---

## Credentials

| Variable | Where | Description |
|----------|-------|-------------|
| `WHAPI_TOKEN` | Server only | Channel/instance token from Whapi dashboard |
| `WHAPI_BASE_URL` | Server only | e.g. `https://gate.whapi.cloud` |
| `WHATSAPP_WEBHOOK_SECRET` | Server only | Optional shared secret for header validation |

---

## Instance vs Channel

Whapi uses "Channels" (formerly instances). One Channel = one WhatsApp number.  
The `WHAPI_TOKEN` is per-channel. `external_instance_id` in `waai_whatsapp_connections` stores the Whapi channel ID.

---

## Webhook Configuration (Whapi side)

In Whapi dashboard → Channel → Webhooks:
1. Set URL: `https://yourdomain.com/api/webhooks/whatsapp`
2. Set Token (appears in `X-Whapi-Token` header on delivery)
3. Subscribe to events: `messages`

Our system stores this token as `webhook_secret_hash` on the connection.

---

## Inbound Payload (Whapi format)

```json
{
  "event": {
    "type": "messages",
    "data": {
      "messages": [
        {
          "id": "msg_id_123",
          "chatId": "34612345678@s.whatsapp.net",
          "from": "34612345678@s.whatsapp.net",
          "to": "34698765432@s.whatsapp.net",
          "type": "text",
          "body": "Hola, quiero información sobre vuestros precios",
          "timestamp": 1749556800,
          "fromMe": false
        }
      ]
    }
  },
  "channelId": "whapi-channel-id-xyz"
}
```

Key fields:
- `event.type` = `"messages"` — the relevant event
- `messages[0].fromMe = false` — only process inbound (fromMe = false)
- `messages[0].type` — `"text"` | `"image"` | `"audio"` | `"document"` | etc.
- `messages[0].body` — text content (only present for type = "text")
- `messages[0].chatId` — unique identifier for the conversation thread
- `channelId` — maps to our `external_instance_id`

---

## Outbound: Send Text Message

```
POST {WHAPI_BASE_URL}/messages/text
Authorization: Bearer {WHAPI_TOKEN}
Content-Type: application/json

{
  "to": "34612345678",
  "body": "Hola! Nuestros precios son..."
}
```

Response:
```json
{
  "sent": true,
  "id": "outbound_msg_id_456"
}
```

---

## WhapiCloudProvider.normalizeIncomingMessage — Logic

```
payload → extract event.data.messages[0]
if not exists → return null
if fromMe = true → return null (skip outbound echoes)
if type != "text" → return NormalizedWhatsAppMessage with text = null
map:
  externalMessageId = messages[0].id
  externalChatId    = messages[0].chatId
  fromNumber        = strip "@s.whatsapp.net" from messages[0].from
  toNumber          = strip "@s.whatsapp.net" from messages[0].to
  text              = messages[0].body ?? null
  messageType       = messages[0].type (map to our enum)
  timestamp         = new Date(messages[0].timestamp * 1000)
```

---

## Rate Limits

Whapi does not publish hard rate limits in free tiers. Conservative approach:
- Detect HTTP 429 response
- Return `success: false` with `errorMessage: "rate_limit"`
- Webhook service logs and marks event `failed`
- No automatic retry in MVP

---

## Setup Instructions (displayed in dashboard UI)

1. Create a Whapi.cloud account at https://whapi.cloud
2. Create a new Channel and scan QR code with your WhatsApp
3. Copy the Channel Token
4. In WAAI dashboard, create a new WhatsApp connection with provider = Whapi
5. Enter your phone number and token
6. Copy the webhook URL shown and paste it in Whapi → Channel → Webhooks
7. Set the Webhook Token (same as WHAPI_TOKEN or a separate secret)
8. Send a test message from another phone
