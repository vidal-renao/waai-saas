# Architecture 24 — WhatsApp Webhook Processing

## Endpoint

`POST /api/webhooks/whatsapp`

No Supabase user auth — external call from Whapi.cloud.  
Auth = webhook secret / signature validation per provider.

Service role Supabase client used (bypasses RLS) because no user session.  
Business-level access control enforced manually in `WhatsAppWebhookService`.

---

## Full Processing Flow

```
POST /api/webhooks/whatsapp
        │
        ▼
1. Read raw body as text (needed for HMAC if applicable)
2. Parse JSON
3. createWhatsAppProvider()
4. provider.verifyWebhook(headers, rawBody, query)
        │ invalid ──► 401, no body
        ▼
5. Persist raw event in waai_whatsapp_webhook_events
   status = "received"
        │
        ▼
6. provider.normalizeIncomingMessage(payload)
        │ null ──► mark event "ignored", return 200
        ▼
7. If messageType != "text"
        │──► mark event "ignored", return 200
        ▼
8. Find active waai_whatsapp_connection
   WHERE provider = providerName
     AND (phone_number_id = toNumber OR external_instance_id matches)
     AND status = "active"
        │ not found ──► mark event "failed" (no connection), return 200
        ▼
9. Idempotency check: waai_whatsapp_messages WHERE external_message_id = msg.externalMessageId
        │ exists ──► mark event "ignored" (duplicate), return 200
        ▼
10. Validate agent assigned (connection.agent_id)
        │ null ──► mark event "failed" (no agent), return 200
        ▼
11. Load agent, verify status = "active"
        │ not active ──► mark event "ignored", return 200
        ▼
12. Find or create waai_conversations
   WHERE workspace_id = connection.workspace_id
     AND agent_id = connection.agent_id
     AND channel = "whatsapp"
     AND external_conversation_id = msg.externalChatId
        │ not found ──► create new conversation
        ▼
13. Persist inbound waai_whatsapp_messages (direction = "inbound")
        ▼
14. Call AgentRuntimeService.processMessage({
      workspaceId, agentId,
      conversationId: conv.id,
      userMessage: msg.text,
      channel: "whatsapp",
      userId: null,       // no internal user
      userRole: null,
    })
        │ error ──► mark event "failed", persist error, return 200
        ▼
15. provider.sendTextMessage({ connection, to: msg.fromNumber, text: reply })
        │ error ──► log, mark event "failed", return 200
        ▼
16. Persist outbound waai_whatsapp_messages (direction = "outbound")
17. Update inbound message delivery_status = "sent"
18. Mark webhook event "processed"
19. Log waai_whatsapp_connection_event "inbound_message_received"
20. return 200 OK
```

---

## Error Strategy

- Never return 4xx/5xx to Whapi for business logic errors (Whapi will retry, causing loops)
- Always return 200 after saving the event
- Only return 4xx for invalid webhook signature (401) and parse errors (400)
- All errors logged in `waai_whatsapp_webhook_events.error_message`
- Stack traces NEVER included in HTTP responses

---

## Idempotency

Every inbound message has an `external_message_id` from Whapi.  
Before calling Claude, check `waai_whatsapp_messages WHERE external_message_id = ?`.  
If found → mark event `ignored` and return 200 without calling Claude.

---

## Non-Text Messages

`messageType != "text"` → store in `waai_whatsapp_messages` with `text_content = null`, mark webhook event `ignored`, return 200.  
Claude is NOT called. A configurable "unsupported media" reply is a Fase 6 feature.

---

## Retry Strategy

Whapi retries unacknowledged events. Since we always return 200 (after event save), Whapi will not retry. Our retry logic is internal:
- If Claude fails: no retry in MVP. Error logged. Manual re-trigger via simulator.
- If send fails: no retry in MVP. Error logged in outbound message.

Fase 6 can add a dead-letter queue pattern.

---

## GET Endpoint (optional health check)

`GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...`

Meta Cloud API uses this pattern. WhapiCloudProvider returns `valid: false` for GET.  
Endpoint returns 200 with plain text challenge if `META_WEBHOOK_VERIFY_TOKEN` matches.  
Returns 403 if token mismatch.
