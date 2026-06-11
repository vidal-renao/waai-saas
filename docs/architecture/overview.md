# Architecture Overview — WAAI SaaS

**Version:** 1.0  
**Date:** 2026-06-07

---

## System Architecture

```
Customer (WhatsApp)
      ↓
WhatsApp Provider API (Whapi.cloud / Meta Cloud API)
      ↓  [POST webhook]
/api/webhooks/whatsapp/[provider]   ← signature verified
      ↓
WebhookNormalizer                   ← provider-specific → canonical format
      ↓
ConversationService                 ← create/resume conversation, check plan limits
      ↓
KnowledgeRetrieval (RAG)            ← embed query → cosine search in waai_document_chunks
      ↓
LLMOrchestrator                     ← build prompt → call Claude API
      ↓
PolicyGuardrails                    ← check rules, tone, escalation triggers
      ↓
ResponseFormatter                   ← WhatsApp-friendly text (no markdown, ≤1600 chars)
      ↓
WhatsAppProvider.sendTextMessage()  ← provider adapter
      ↓
Customer receives reply
```

---

## Multi-tenancy

Every request is scoped to a `workspace_id`. RLS policies on all `waai_*` tables enforce this at the database level. The application layer also checks `workspace_id` in every service method as a defense-in-depth measure.

---

## Modules

| Module | Path | Responsibility |
|---|---|---|
| Auth | `src/features/auth` | Login, registration, session |
| Workspaces | `src/features/workspaces` | Tenant management |
| Agents | `src/features/agents` | Agent builder, wizard, prompts |
| Knowledge | `src/features/knowledge` | Document upload, RAG |
| WhatsApp | `src/features/whatsapp` | Provider connection, webhook |
| Conversations | `src/features/conversations` | Message history, state machine |
| Leads | `src/features/leads` | Lead capture, CRM-lite |
| Analytics | `src/features/analytics` | Metrics, dashboard |
| Billing | `src/features/billing` | Plans, limits, Stripe |

---

## Database Schema (public, prefix waai_)

See [ADR-0002](../adr/ADR-0002-supabase-public-schema-and-waai-prefix.md) for conventions.

Full table definitions in `docs/specs/data-model.md`.

---

## Security

- Supabase RLS on every table — enforced at DB level
- All WhatsApp tokens stored encrypted in `access_token_encrypted`
- Webhook signatures verified before processing
- Rate limiting per workspace at Edge Function level
- No PII in application logs

---

## Deployment

```
GitHub → GitHub Actions (lint + build) → Vercel (frontend + API routes)
                                       → Supabase (migrations, Edge Functions)
```
