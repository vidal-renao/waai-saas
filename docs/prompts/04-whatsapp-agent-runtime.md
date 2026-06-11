# Prompt 04 — WhatsApp Agent Runtime

## AgentRuntimeService — Channel Awareness

`AgentRuntimeService.processMessage()` now accepts a `channel` field.  
The channel determines:
1. Whether role-based authorization applies (sandbox: yes; whatsapp: no)
2. How conversations are created/found (sandbox: by ID; whatsapp: by external_conversation_id)
3. What metadata is tagged on messages and runs

---

## Updated RuntimeInput

```typescript
export interface RuntimeInput {
  workspaceId: string;
  agentId: string;
  conversationId: string | null;           // existing conversation ID
  externalConversationId?: string | null;  // for WhatsApp: externalChatId
  userMessage: string;
  channel: WaaiConversationChannel;        // "sandbox" | "whatsapp" | "web"
  userId: string | null;                   // null for WhatsApp (no internal user)
  userRole: WaaiWorkspaceRole | null;      // null for WhatsApp
  metadata?: Record<string, unknown>;      // extra context (e.g. fromNumber)
}
```

---

## Authorization Logic

```
if channel === "sandbox":
  enforce SANDBOX_ALLOWED_ROLES check (userId + userRole required)
  return FORBIDDEN if role not in allowed list
else (whatsapp / web):
  skip role check — authorization handled by webhook service
  userId and userRole may be null
```

The webhook service already validated:
- Webhook secret
- Connection is active
- Agent is active and belongs to same workspace

---

## Conversation Lookup for WhatsApp

```
if conversationId is provided:
  use it directly (validate workspace + agent + channel match)
else if externalConversationId is provided:
  look up: workspace_id + agent_id + channel + external_conversation_id
  if found: use it
  if not found: create new with external_conversation_id set
else:
  create new conversation
```

---

## System Prompt — No Change

The WhatsApp agent uses the same system prompt as sandbox.  
RAG context injection works identically.

The system prompt template (Fase 2) already includes WhatsApp-appropriate tone from the agent wizard.  
No separate WhatsApp prompt template is needed in MVP.

---

## Message Metadata

For WhatsApp messages, `waai_messages.metadata` includes:
```json
{
  "channel": "whatsapp",
  "from_number": "34612345678",
  "external_message_id": "msg_id_123"
}
```

For agent runs via WhatsApp, `waai_agent_runs.metadata` includes:
```json
{
  "channel": "whatsapp",
  "rag_used": true,
  "retrieved_chunks_count": 3,
  ...
}
```

---

## Error Codes

`AgentRuntimeService` returns the same error codes as before.  
The webhook service maps these to log entries (never to HTTP 4xx/5xx responses to Whapi):

| Code | Webhook action |
|------|----------------|
| `FORBIDDEN` | Should not happen (webhook handles auth) — log warning |
| `MESSAGE_LIMIT` | Mark event `failed`, log — no Claude call |
| `NO_API_KEY` | Mark event `failed`, log — 503 but return 200 to Whapi |
| `NO_PROMPT` | Mark event `ignored` — agent not ready |
| `AGENT_NOT_FOUND` | Mark event `failed` |
| `CONVERSATION_NOT_FOUND` | Mark event `failed` |
| `CLAUDE_ERROR` | Mark event `failed`, log error |
