# ADR-0006 — Plan Limits and Usage Enforcement

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

The platform has tiered plans (Free, Starter, Pro, Agency, Enterprise). Without hard enforcement at the application layer, free-tier users can consume unlimited messages, agents, and documents — making the product financially unsustainable. Enforcement must happen server-side (not just UI) to prevent API abuse.

## Decision

### Plan definitions

| Plan | Agents | WhatsApp numbers | Messages/month | Docs | Human handoff |
|---|---|---|---|---|---|
| Free / Sandbox | 1 | 0 (sandbox only) | 100 | 3 | No |
| Starter | 1 | 1 | 1,000 | 10 | No |
| Pro | 3 | 3 | 10,000 | 50 | Yes |
| Agency | 20 | 20 | 100,000 | 500 | Yes |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Yes |

### Storage table: `waai_subscriptions`

```sql
waai_subscriptions (
  id uuid primary key,
  workspace_id uuid unique references waai_workspaces(id),
  plan text not null default 'free',       -- free | starter | pro | agency | enterprise
  messages_used_this_month int default 0,
  messages_reset_at timestamptz,           -- first day of billing cycle
  agents_limit int not null default 1,
  messages_limit int not null default 100,
  documents_limit int not null default 3,
  whatsapp_numbers_limit int not null default 0,
  human_handoff_enabled bool default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### Enforcement points

Enforcement happens in **server-side service layer** (`src/server/services/`), never in the client.

| Action | Enforcement check |
|---|---|
| Create agent | `agents count < agents_limit` |
| Send message (outbound) | `messages_used_this_month < messages_limit` |
| Upload document | `documents count < documents_limit` |
| Connect WhatsApp number | `numbers count < whatsapp_numbers_limit` |
| Enable human handoff | `human_handoff_enabled = true` |

On limit breach: return HTTP 402 with a structured error (`{ code: "PLAN_LIMIT_REACHED", resource: "messages", limit: 1000, current: 1000 }`).

### Usage tracking

Message counter incremented via Supabase RPC `waai_increment_message_usage(workspace_id)` called after each successful outbound message. Monthly reset via a scheduled Edge Function (cron job) on the 1st of each month.

### Stripe integration (post-MVP)

- `stripe_customer_id` and `stripe_subscription_id` stored in `waai_subscriptions`
- Plan upgrades handled via Stripe Checkout
- Stripe webhook updates `plan` column on subscription events
- In MVP: plan is set manually by platform admin; Stripe wired in Fase 7

## Consequences

- **Positive:** No surprise infrastructure bills from free-tier abuse.
- **Positive:** 402 response gives clients a clear upgrade prompt.
- **Negative:** `messages_used_this_month` counter can drift under race conditions. Mitigation: use Supabase RPC with `FOR UPDATE` lock on the row.

## Related ADRs

- [ADR-0001](ADR-0001-tech-stack.md) — Tech stack
