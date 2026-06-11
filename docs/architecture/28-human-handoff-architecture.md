# Architecture 28 — Human Handoff Architecture

## Concept

Human handoff is an automation pause mechanism. When active for a conversation, the AI agent stops responding automatically on WhatsApp. A human takes over.

## Handoff States

```
requested ──→ active ──→ resolved
     │
     └──→ canceled
```

## Automation Pause Contract

When `waai_handoffs.status IN ('requested', 'active')` AND `automation_paused = true`:

1. WhatsApp inbound messages ARE stored in `waai_whatsapp_messages`
2. Claude is NOT called
3. No AI reply is sent to the customer
4. Webhook returns `status: "processed"` (no retry from Whapi)
5. Conversation status is set to `handoff_required`

When handoff is resolved or canceled:
1. `automation_paused = false`
2. Conversation status returns to `open`
3. Next inbound message will trigger AI again

## waai_has_active_handoff RPC

```sql
CREATE OR REPLACE FUNCTION waai_has_active_handoff(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM waai_handoffs
    WHERE conversation_id = p_conversation_id
      AND status IN ('requested', 'active')
      AND automation_paused = true
  );
$$;
```

## Webhook Integration

```
POST /api/webhooks/whatsapp
  ↓
WhatsappWebhookService.processWebhook()
  ↓
[... existing steps 1-10: verify, parse, find connection, find/create conversation ...]
  ↓
Step 10b: CHECK HANDOFF
  waai_has_active_handoff(conversation.id)
  ├── true:
  │   store inbound message (already done in step 11)
  │   skip Claude
  │   mark webhook processed
  │   log connection event: automation_paused
  │   return { status: "processed" }
  └── false:
      continue to step 12: call AgentRuntimeService
```

## Trigger Types

MVP supports manual only from dashboard. System may detect:
- `customer_request`: customer says "human", "person", "agent", "real person"
- `manual`: dashboard button
- `system_rule`: future rule engine

## HandoffService

```typescript
requestHandoff(input: RequestHandoffInput): Promise<WaaiHandoff>
resolveHandoff(id: string, resolvedBy: string, workspaceId: string): Promise<WaaiHandoff>
cancelHandoff(id: string, workspaceId: string): Promise<WaaiHandoff>
getActiveHandoff(conversationId: string): Promise<WaaiHandoff | null>
hasActiveHandoff(conversationId: string): Promise<boolean>
```

requestHandoff:
1. Check if active handoff exists → throw if already active
2. Create waai_handoff record with `status: 'requested'` + `automation_paused: true`
3. Update conversation status to `handoff_required`
4. Log handoff event

resolveHandoff:
1. Find active handoff
2. Update `status: 'resolved'`, `resolved_by`, `resolved_at`, `automation_paused: false`
3. Update conversation status to `open`
4. Log handoff event

## API Routes

```
POST /api/conversations/[conversationId]/handoff/request
POST /api/conversations/[conversationId]/handoff/resolve
```

## Dashboard Integration

- Conversation detail shows handoff panel when status = handoff_required
- "Request Handoff" button → calls request API
- "Resolve Handoff" button → calls resolve API
- Badge "Automation paused" shown in conversation list

## Error Handling

| Error                    | Response                                        |
|--------------------------|-------------------------------------------------|
| Handoff already active   | 409 CONFLICT, message: handoff_already_active   |
| Handoff not found        | 404 NOT FOUND                                   |
| No active handoff        | 400 BAD REQUEST for resolve                     |
| Workspace mismatch       | 403 FORBIDDEN                                   |
| Unauthorized role        | 403 FORBIDDEN                                   |
