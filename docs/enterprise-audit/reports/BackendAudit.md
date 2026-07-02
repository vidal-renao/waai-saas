# WAAI SaaS — Backend & API Audit
**Audit Date:** 2026-06-30 | Evidence: Source code analysis

---

## API Route Inventory

| Route Group | Endpoints | Auth | Notes |
|---|---|---|---|
| `/api/agents` | CRUD + archive + knowledge + prompt + sandbox | Session | Well-structured |
| `/api/conversations` | GET + handoff + assign + notes + lead | Session | Complete |
| `/api/knowledge/documents` | CRUD + process + archive | Session | Complete |
| `/api/leads` | CRUD + assign + status | Session | Complete |
| `/api/whatsapp/connections` | CRUD + test | Session | Complete |
| `/api/analytics` | overview + agents + leads + usage + alerts + channels | Session | Complete |
| `/api/billing` | costs + readiness + usage | Session | Complete |
| `/api/workspaces` | GET (list user workspaces) | Session | Limited |
| `/api/health` | GET (public) + /db + /ai + /whatsapp | None | Good |
| `/api/auth/logout` | POST | Session | Correct |
| `/api/webhooks/whatsapp` | GET (verify) + POST (events) | None (service role) | Correct |

---

## Authentication Pattern in API Routes

All non-webhook, non-health routes follow this pattern:

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
```

This uses `@supabase/ssr`'s server client — reads session from HTTP-only cookie, validates JWT server-side. Correct pattern. ✅

**Workspace resolution:** Routes then resolve the workspace from the authenticated user:
```typescript
const membersRepo = new WorkspaceMembersRepository(supabase);
const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
if (!workspaceId) return Response.json({ error: "No workspace" }, { status: 403 });
```

This is repeated across many routes — functional but repetitive. No shared middleware to inject workspace context.

---

## Webhook Handler (`/api/webhooks/whatsapp`)

**File:** `src/app/api/webhooks/whatsapp/route.ts`

Key security decisions:
1. `maxDuration = 60` — extended timeout for Vercel Edge ✅
2. Uses `createServiceRoleClient()` — no user session in webhook context ✅
3. Returns `200 OK` for all valid events to prevent provider retries ✅
4. Returns `401` only for invalid signatures ✅
5. Raw body read for signature validation ✅

```typescript
if (result.status === "invalid") {
  return new Response(null, { status: 401 });
}
return Response.json({ status: result.status, eventId: result.eventId });
```

**Gap:** Meta Cloud API webhook verification not wired — `WHATSAPP_PROVIDER=meta` would use mock provider which accepts all webhooks without validation.

---

## Agent Runtime Pipeline (14-step flow)

Verified in `AgentRuntimeService.processMessage()`:

1. Role check (sandbox only: owner/admin/agent_manager/human_agent) ✅
2. Message limit check via `waai_can_use_message` RPC ✅
3. Agent load + workspace ownership validation ✅
4. Active prompt version check ✅
5. LLM provider instantiation (fails fast if API key missing) ✅
6. Conversation resolution (create or find existing) ✅
7. Conversation scope validation (workspace + agent + channel match) ✅
8. User message saved to DB ✅
9. RAG retrieval (non-blocking, fallback to no context) ✅
10. System prompt built with RAG context ✅
11. Conversation history fetched (last 20 messages) ✅
12. Claude API called ✅
13. Assistant message saved ✅
14. Agent run saved (tokens, latency, model, metadata) ✅
15. `waai_update_conversation_last_message` RPC ✅
16. `waai_increment_message_counter` RPC ✅

**14-step pipeline is complete and correctly ordered.** ✅

**Gap:** `estimated_cost_cents` not passed to step 14 (see AIAudit.md).

---

## Billing Enforcement

`BillingEnforcementService` enforces:
- `assertCanCreateAgent()` — checks `agents_limit` from subscription
- `assertCanSendMessage()` — checks `messages_limit` via `getCurrentMonthUsage()`
- `assertCanCreateKnowledgeDocument()` — checks `documents_limit` (counts non-archived)
- `assertCanCreateWhatsappConnection()` — checks `whatsapp_numbers_limit`
- `assertHumanHandoffEnabled()` — checks `human_handoff_enabled` flag

Unlimited is represented as `-1` in DB, checked with `if (limit === -1) return;` ✅

**Gap:** `assertCanSendMessage()` uses `getCurrentMonthUsage()` from the subscriptions repository while the runtime uses `waai_can_use_message` RPC — two separate checks. They should be equivalent but minor divergence is possible if caching differs.

---

## Input Validation

All API routes use Zod validators from `src/lib/validators/`:

```
agent.ts / analytics.ts / auth.ts / billing.ts / conversation.ts
handoff.ts / health.ts / internal-note.ts / knowledge.ts / lead.ts
message.ts / sandbox.ts / whatsapp.ts / workspace.ts
```

Validators are centralized — single source of truth. ✅  
Zod v4 used — latest, tree-shakeable. ✅

---

## Service Role Client

**File:** `src/lib/supabase/service-role.ts` (inferred from usage)  
Used in: webhook handler, internal service operations.

Service role bypasses RLS — appropriate for webhook processing and counter increments. Risk is managed by limiting usage to server-side contexts only. No `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` env vars. ✅

---

## Error Handling Consistency

All repositories follow:
```typescript
if (error) throw new Error(`RepositoryName.methodName: ${error.message}`);
```

All use cases catch errors and return `{ error: string }` instead of throwing to routes:
```typescript
} catch (err) {
  return { error: err instanceof Error ? err.message : "Failed" };
}
```

Routes return appropriate HTTP status codes. ✅

**Gap:** No centralized error handler or error factory — HTTP status codes are manually set per route. Inconsistencies possible as codebase grows.

---

## Backend Risk Summary

| Finding | Severity |
|---|---|
| No rate limiting on API routes | 🔴 High |
| `estimated_cost_cents` not computed in runtime | 🔴 High |
| Meta WhatsApp webhook path uses mock validation | 🔴 High |
| Workspace resolution repeated in every route | 🟡 Low (tech debt) |
| Two parallel message-limit check paths | 🟡 Low (correctness risk) |
| No centralized error handler | 🟡 Low |
