# Spec 12 — WhatsApp Integration Foundation (Fase 5)

## Scope

Fase 5 connects the WAAI agent to real WhatsApp numbers using Whapi.cloud as the MVP provider.  
The architecture is designed so Meta Cloud API can be swapped in without touching business logic.

**In scope:**
- WhatsAppProvider abstraction + MockWhatsAppProvider + WhapiCloudProvider
- Webhook receiver (`POST /api/webhooks/whatsapp`)
- WhatsApp connection management (CRUD + status lifecycle)
- Routing inbound WhatsApp messages through AgentRuntimeService
- Outbound reply via provider
- Persistence: connections, webhook events, whatsapp messages, connection events
- Simulator / test panel (no real credentials needed)
- Billing limit enforcement for connections
- Dashboard UI: list, create, test connections

**Out of scope (Fase 6+):**
- Lead capture automation
- Human handoff
- Meta Cloud API full onboarding wizard
- Streaming responses
- Rich media (images, audio, documents) — stored but not processed
- CRM integration

---

## User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| US-01 | Workspace owner | Connect my WhatsApp number | My customers can message the AI agent |
| US-02 | Workspace owner | Assign an agent to my WhatsApp connection | The right agent responds |
| US-03 | Workspace admin | See the webhook URL to configure in Whapi | Incoming messages reach our system |
| US-04 | Workspace admin | Test the connection with a simulated message | I can verify the flow before going live |
| US-05 | Customer (external) | Send a WhatsApp message and receive an AI reply | I get help without waiting for a human |
| US-06 | Agent manager | View WhatsApp conversations in the dashboard | I can monitor activity |
| US-07 | Platform | Enforce plan limits on WhatsApp connections | Billing remains correct |
| US-08 | Platform | Log all webhook events for audit | Issues can be debugged |
| US-09 | Developer | Simulate an inbound message without Whapi credentials | I can develop locally |

---

## Permissions

| Action | owner | admin | agent_manager | human_agent | viewer |
|--------|-------|-------|---------------|-------------|--------|
| List connections | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create connection | ✓ | ✓ | — | — | — |
| Update connection | ✓ | ✓ | — | — | — |
| Assign agent | ✓ | ✓ | ✓ | — | — |
| Test / simulate | ✓ | ✓ | ✓ | — | — |
| View webhook events | ✓ | ✓ | ✓ | — | — |
| Archive connection | ✓ | ✓ | — | — | — |
| Webhook (external) | N/A — validated by secret | | | | |

---

## Billing Rules

- Plan limit enforced via `waai_can_create_whatsapp_connection(workspace_id)` RPC.
- Count = non-archived connections (`status != 'archived'`).
- Free plan: 0 WhatsApp connections.
- Starter: 1, Pro: 3, Agency: 20, Enterprise: unlimited.
- Inbound + outbound WhatsApp messages consume the same monthly message quota as sandbox messages.
- `waai_increment_message_counter` called after each successful AI response, same as sandbox.

---

## Connection Status Lifecycle

```
draft ──► pending_verification ──► active
  │                │                  │
  │                ▼                  ▼
  │             failed           disconnected ──► archived
  │                                  │
  └─────────────── suspended ◄────────┘
```

- `draft` — created but webhook not yet configured
- `pending_verification` — webhook URL set, waiting first event
- `active` — receives and processes messages
- `failed` — error connecting or verifying
- `suspended` — manually or plan-limit paused
- `disconnected` — lost connectivity, requires re-auth
- `archived` — soft-deleted, excluded from billing count

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | SDD documentation for Fase 5 exists |
| 2 | WhatsApp provider architecture documented |
| 3 | Migration exists for 4 new tables |
| 4 | All new tables in `public` schema |
| 5 | All new tables have `waai_` prefix |
| 6 | No `CREATE SCHEMA` statement |
| 7 | RLS active on all new tables |
| 8 | No cross-workspace access possible |
| 9 | `WhatsAppProvider` interface exists |
| 10 | `MockWhatsAppProvider` implemented |
| 11 | `WhapiCloudProvider` implemented |
| 12 | `WHAPI_TOKEN` never exposed to frontend |
| 13 | `POST /api/webhooks/whatsapp` route exists |
| 14 | Webhook persists raw event |
| 15 | Webhook normalizes inbound message |
| 16 | Non-text messages handled without calling Claude |
| 17 | Webhook finds active connection |
| 18 | Webhook finds assigned agent |
| 19 | Webhook creates or reuses `whatsapp` conversation |
| 20 | Webhook calls `AgentRuntimeService` |
| 21 | Sandbox (Fase 3) continues working unchanged |
| 22 | RAG continues working inside runtime |
| 23 | Webhook sends reply via provider |
| 24 | Outbound message persisted |
| 25 | Errors handled without stack traces |
| 26 | UI for create/list connections |
| 27 | UI for test/simulate message |
| 28 | Billing limit checked before connection creation |
| 29 | Meta Cloud API NOT fully implemented |
| 30 | Lead capture NOT implemented |
| 31 | Human handoff NOT implemented |
| 32 | `npm run lint` passes (0 errors) |
| 33 | `npm run build` passes (clean) |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Whapi webhook payload format changes | Normalize in `WhapiCloudProvider.normalizeIncomingMessage()` — business logic never sees raw payload |
| Duplicate webhook delivery | Idempotency check on `external_message_id` before calling Claude |
| WHAPI_TOKEN missing in prod | Provider constructor throws → webhook returns 503 with no stack trace |
| Rate limit from Whapi | Detect 429, log error, return 429 to Whapi (it will retry) |
| Message loop (agent messages itself) | Check `direction === "inbound"` before processing |
| Cross-tenant data leak | All queries scoped by `workspace_id`; RLS as second defence |
| Large payloads (media) | Only `message_type === "text"` triggers Claude; others saved as `ignored` |
