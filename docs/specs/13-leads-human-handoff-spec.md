# Spec 13 — Leads & Human Handoff

## Fase 6 Scope

Convert WhatsApp/Sandbox conversations into trackable commercial opportunities and allow a human agent to take control when AI automation should not continue.

**In scope:**
- Lead detection (rule-based + optional LLM extraction)
- Lead CRUD with lifecycle management
- Lead events audit trail
- Human handoff request/resolve
- Automation pause during active handoff
- Conversation assignment to workspace members
- Internal notes (never visible to external customers)
- Lead detection run logs

**Out of scope (Fase 7+):**
- Full CRM pipeline (Kanban, custom fields, multi-stage)
- Email / SMS notifications to assigned agents
- Stripe-gated handoff (plan enforcement minimal: human_handoff_enabled check)
- Automatic lead scoring ML model
- Meta Cloud API onboarding
- Real-time push notifications

---

## User Stories

### Leads
- US-6.1: As an **owner/admin**, I can view all leads captured for my workspace.
- US-6.2: As an **agent_manager**, I can update lead status and priority.
- US-6.3: As a **human_agent**, I can update lead status on conversations assigned to me.
- US-6.4: As any member, I can view lead details and extracted data.
- US-6.5: As any member, I can manually create a lead from a conversation.
- US-6.6: As the system, I can automatically detect and create a lead from a WhatsApp conversation without blocking the AI response.

### Handoff
- US-6.7: As an **owner/admin/agent_manager**, I can request handoff for any conversation.
- US-6.8: As a **human_agent**, I can request handoff on conversations assigned to me.
- US-6.9: As an **owner/admin/agent_manager/human_agent**, I can resolve an active handoff.
- US-6.10: When handoff is active, AI must not auto-respond on WhatsApp.
- US-6.11: Inbound WhatsApp messages during handoff are stored but Claude is NOT called.
- US-6.12: When handoff is resolved, automation resumes.

### Conversation Assignment
- US-6.13: As an **owner/admin/agent_manager**, I can assign a conversation to a workspace member.
- US-6.14: Only one active assignment per conversation at a time.
- US-6.15: Assigning to a different person closes the previous assignment.

### Internal Notes
- US-6.16: As an **owner/admin/agent_manager/human_agent**, I can add internal notes to a conversation.
- US-6.17: Internal notes are NEVER sent to the WhatsApp customer.
- US-6.18: Internal notes can reference a lead or just a conversation.
- US-6.19: As a **viewer**, I cannot create internal notes but can read them.

---

## Lead Lifecycle

```
new → qualified → contacted → won
                            → lost
any → archived
```

### Status Definitions
| Status    | Description                                                       |
|-----------|-------------------------------------------------------------------|
| new       | Freshly detected or created, not yet reviewed                    |
| qualified | Reviewed and confirmed as a real opportunity                     |
| contacted | Human has contacted the customer                                 |
| won       | Deal closed / appointment confirmed                              |
| lost      | Opportunity lost / customer unresponsive                         |
| archived  | Removed from active view                                         |

### Priority Definitions
| Priority | Description                   |
|----------|-------------------------------|
| low      | Non-urgent, low value         |
| medium   | Normal opportunity (default) |
| high     | High value or time-sensitive  |
| urgent   | Requires immediate attention  |

---

## Handoff Lifecycle

```
requested → active → resolved
         → canceled
```

| Status    | Description                                          |
|-----------|------------------------------------------------------|
| requested | Handoff initiated (agent/user/customer/system)      |
| active    | Human agent has taken over the conversation         |
| resolved  | Human closed the handoff — automation may resume    |
| canceled  | Handoff was canceled before being accepted          |

When `status = active` or `status = requested`:
- `automation_paused = true`
- WhatsApp inbound messages stored but Claude NOT called

When `status = resolved` or `status = canceled`:
- Automation can resume
- Conversation status updated to `open`

---

## Assignment Model

- One active assignment per conversation (`status = 'active'`).
- Creating a new assignment resolves the previous one (`status = 'transferred'`).
- Resolution of a handoff does NOT automatically close the assignment.
- Assignments are append-only for audit trail.

---

## Internal Notes Model

- Notes are workspace-scoped and never sent externally.
- `visibility = 'internal'` → all workspace members can read.
- `visibility = 'owner_admin'` → only owner/admin can read.
- MVP: only `internal` visibility enforced.
- Max note length: 2000 characters.
- Viewers can read but not create notes.

---

## Permissions Matrix

| Action                     | owner | admin | agent_manager | human_agent | viewer |
|----------------------------|-------|-------|---------------|-------------|--------|
| View leads                 | ✓     | ✓     | ✓             | ✓           | ✓      |
| Create lead                | ✓     | ✓     | ✓             | ✓           | ✗      |
| Update lead status         | ✓     | ✓     | ✓             | ✓*          | ✗      |
| Assign lead                | ✓     | ✓     | ✓             | ✗           | ✗      |
| Archive lead               | ✓     | ✓     | ✓             | ✗           | ✗      |
| Request handoff            | ✓     | ✓     | ✓             | ✓*          | ✗      |
| Resolve handoff            | ✓     | ✓     | ✓             | ✓*          | ✗      |
| Assign conversation        | ✓     | ✓     | ✓             | ✗           | ✗      |
| Add internal note          | ✓     | ✓     | ✓             | ✓           | ✗      |
| Read internal notes        | ✓     | ✓     | ✓             | ✓           | ✓      |
| View lead detection runs   | ✓     | ✓     | ✓             | ✓           | ✗      |

*human_agent: restricted to conversations they are assigned to or where they requested the handoff

---

## Lead Detection Strategy

### MVP Approach (Hybrid)
1. **Rule-based detector** — always available, no external API needed.
2. **LLM extraction** — optional, runs if `ANTHROPIC_API_KEY` is present.
3. Fallback: if LLM fails, rule-based minimal lead is created.
4. Detection runs AFTER the AI response is sent — never blocks customer reply.

### Rule-Based Signals (multilingual: ES/EN/DE/FR)
- Quote/budget: presupuesto, quote, offerte, devis, budget
- Appointment/booking: cita, appointment, termin, rendez-vous, booking, reserva
- Contact intent: contactarme, call me, llamar, rufen, rappeler
- Service need: necesito, quiero, I need, ich möchte, je voudrais
- Urgency signals: urgente, urgent, sofort, d'urgence, asap
- Data provided: phone number patterns, email patterns

### LLM Extraction Output Schema
```json
{
  "is_lead": true,
  "confidence_score": 0.82,
  "detected_intent": "quote_request",
  "priority": "high",
  "customer_name": null,
  "customer_phone": "+41...",
  "customer_email": null,
  "requested_service": "Umzugsreinigung",
  "location": "Basel",
  "desired_date": "next Friday",
  "budget": null,
  "urgency": "soon",
  "summary": "Customer requests a move-out cleaning quote in Basel.",
  "handoff_recommended": false,
  "handoff_reason": null
}
```

---

## Acceptance Criteria

1. Documentation for Fase 6 exists (this file + arch docs)
2. Lead architecture documented
3. Human handoff architecture documented
4. Migration for leads/handoff tables exists
5. All new tables in public schema with waai_ prefix
6. No CREATE SCHEMA
7. RLS enabled on all new tables
8. No cross-workspace access
9. User can list leads
10. User can view lead detail
11. User can update lead status
12. User can assign lead
13. User can create lead from conversation
14. Lead events are logged
15. Conversation can request handoff
16. Conversation can resolve handoff
17. Active handoff pauses WhatsApp automation
18. Inbound WhatsApp messages during handoff are stored but do not trigger Claude
19. Internal notes can be added to conversations
20. Internal notes are never sent to WhatsApp customers
21. Conversation can be assigned to a human
22. Lead detection service exists
23. Lead extraction service exists
24. Lead detection does not block customer response
25. WhatsAppWebhookService integrates lead detection safely
26. AgentRuntimeService or webhook respects handoff
27. Sandbox still works
28. WhatsApp webhook still works
29. RAG still works
30. Claude integration still works
31. No Stripe checkout real
32. No Meta Cloud API full onboarding
33. Lint passes
34. Build passes

---

## Risks and Mitigations

| Risk                                   | Mitigation                                                        |
|----------------------------------------|-------------------------------------------------------------------|
| Lead detection blocks AI response     | Run detection inline AFTER response is sent; wrap in try/catch   |
| LLM extraction fails / hallucination  | Zod validation of JSON output; fallback to rule-based           |
| Duplicate leads per conversation       | Unique constraint check in service; upsert logic                 |
| Handoff check adds latency to webhook  | DB index on (conversation_id) + SECURITY DEFINER RPC            |
| Internal notes leaked to WhatsApp      | Notes table has no path to WhatsApp send logic                   |
| Cross-workspace access                 | RLS policies enforce workspace_id isolation                      |
| Partial unique constraint (assignment) | Enforce via service logic — close previous before creating new   |
