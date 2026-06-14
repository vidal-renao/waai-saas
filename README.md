# WAAI SaaS — WhatsApp AI Agent Platform

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-RLS%20enforced-3ECF8E?style=flat-square&logo=supabase)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204.6-D4A017?style=flat-square)
![pgvector](https://img.shields.io/badge/pgvector-RAG-336791?style=flat-square&logo=postgresql)
![Vercel](https://img.shields.io/badge/Vercel-production-000000?style=flat-square&logo=vercel)
![Swiss DSG](https://img.shields.io/badge/Swiss%20DSG-Compliant-DC143C?style=flat-square)
![Version](https://img.shields.io/badge/version-v0.9.0-22c55e?style=flat-square)

A multi-tenant SaaS platform that lets businesses create, configure, and deploy intelligent WhatsApp agents without writing code. Each business connects their WhatsApp number, uploads their documents, configures their agent through a guided wizard, and gets an AI-powered assistant that answers customers, captures leads, and escalates to humans when needed.

---

## Product Vision

Small businesses lose leads because they can't respond to WhatsApp fast enough. WAAI lets any PYME deploy a Claude-powered agent in minutes — trained on their real business data, connected to their WhatsApp, controlled from a professional dashboard.

**Core value:** Not just a bot. A business agent with context, commercial goals, RAG knowledge, lead capture, and human handoff.

**Target markets:** Switzerland, Spain, Latin America.

---

## Production Status — v0.9.0

> **Production deployment verified and stable as of 2026-06-14.**

### Confirmed operational

| Component | Status | Notes |
| --- | --- | --- |
| `waai-saas.vercel.app` | **Live** | Deployment `dpl_7UpK6186Jv6Msrjfjq3PMexZ5rk3` promoted to production |
| Register → Onboarding → Dashboard | **100% operational** | Full flow verified end-to-end |
| `POST /api/workspaces` RLS | **Resolved** | Service role client pattern — JWT forwarding issue eliminated |
| `/api/agents/[id]/sandbox` | **Validated** | Async streaming + dynamic System Prompt injection confirmed |
| Claude Sonnet 4.6 (streaming) | **Stable** | Consistent responses after Anthropic Billing Org unblock |
| `/api/health` | **200 OK** | All health endpoints responding |
| Supabase RLS | **Enforced** | All `waai_*` tables — no cross-workspace access |
| pgvector RAG | **Active** | Cosine similarity search on `waai_document_chunks` |

### Production constraints (intentional)

| Guard | State |
| --- | --- |
| Stripe | Inactive — no real charges |
| Meta WhatsApp Cloud API | Inactive — `WHATSAPP_PROVIDER=mock` |
| Real WhatsApp delivery | Disabled |

---

## Changelog — v0.9.0 (2026-06-14)

### Infrastructure
- **Promoted `dpl_7UpK6186Jv6Msrjfjq3PMexZ5rk3` to production** — `waai-saas.vercel.app` now serves the stable v0.9.0 build
- Supabase remote migrations applied (9 migrations, `focgfmhgfmhmcbywwsej`, eu-west-1)

### Backend fixes
- **`fix(workspaces): service role client for POST /api/workspaces`** (`54a073e`) — Auth verification uses user client; DB operations use service role to bypass PostgREST JWT forwarding gap in Vercel serverless Route Handlers. Eliminates `new row violates row-level security policy for table "waai_workspaces"` error permanently.
- **`fix(onboarding): move /onboarding outside (dashboard) group`** (`37447c6`) — Standalone route with own auth + workspace check. Eliminates redirect loop and blank page at `/onboarding`.
- **`fix(scripts): HealthResponseBody type for verify-health-endpoints`** (`0ae4e10`) — TS2339 resolved without `any`; `Response.json()` cast safely to typed interface.

### Sandbox validation
- `/api/agents/[id]/sandbox` end-to-end verified: async streaming engine + dynamic context injection (System Prompt + RAG chunks) responds consistently with Claude Sonnet 4.6
- Anthropic Billing Org unblocked — real API calls active in staging and production environments

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL (public schema, `waai_` prefix) |
| Vector search | pgvector — `text-embedding-3-small`, 1536d, cosine similarity |
| Edge Functions | Supabase Edge Functions (Deno) |
| LLM | Claude Sonnet 4.6 — sandbox + WhatsApp responses |
| LLM (fast) | Claude Haiku 4.5 — lead detection extraction |
| Embeddings | OpenAI `text-embedding-3-small` |
| WhatsApp MVP | Whapi.cloud |
| WhatsApp prod | Meta WhatsApp Cloud API |
| Deploy | Vercel (frontend + API routes) |
| CI/CD | GitHub Actions |

---

## Architecture

```
Customer (WhatsApp)
      ↓
WhatsApp Provider (Whapi.cloud / Meta Cloud API)
      ↓  POST /api/webhooks/whatsapp  [signature verified]
WebhookNormalizer      ← provider-specific → canonical format
      ↓
ConversationService    ← create/resume, check plan limits, check handoff state
      ↓
KnowledgeRetrieval     ← embed query → cosine search waai_document_chunks (pgvector)
      ↓
LLMOrchestrator        ← system prompt + RAG context → Claude Sonnet 4.6
      ↓
PolicyGuardrails       ← rules, tone, escalation triggers
      ↓
ResponseFormatter      ← WhatsApp-safe text (≤1600 chars, no markdown)
      ↓
WhatsAppProvider.sendTextMessage()
      ↓
Customer receives reply
```

**Sandbox path** (`/api/agents/[id]/sandbox/message`):

```
Browser → POST /api/agents/[id]/sandbox/message
             ↓
         Auth check (Supabase user client)
             ↓
         AgentRuntimeService
           ├── load agent config + active prompt version
           ├── KnowledgeRetrieval (pgvector RAG)
           └── Claude Sonnet 4.6 (streaming)
             ↓
         SSE stream → browser
```

**WhatsApp handoff guard:**

```
Inbound message → check waai_handoffs (automation_paused)
  ├── paused=true  → store message, DO NOT call Claude
  └── paused=false → full ConversationService → Claude → send reply
```

### Multi-tenancy

Every request is scoped to a `workspace_id`. RLS policies on all `waai_*` tables enforce isolation at the PostgreSQL level. The application layer also validates `workspace_id` in every service method as defense-in-depth.

### Auth pattern in Route Handlers

```ts
// Verify identity: user client (reads JWT from cookie via @supabase/ssr)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// DB operations: service role client (bypasses PostgREST JWT gap in serverless)
const serviceClient = createServiceRoleClient();
```

See [ADR-0002](docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md) and [Architecture Overview](docs/architecture/overview.md).

---

## Project Phases

| Phase | Name | Status | Version |
| --- | --- | --- | --- |
| Fase 0 | Setup & Conventions | Complete | 0.0.x |
| Fase 1 | Core SaaS Multi-tenant | Complete | 0.1.x |
| Fase 2 | Agent Builder (Wizard) | Complete | 0.2.x |
| Fase 3 | Chat Sandbox | Complete | 0.3.x |
| Fase 4 | Knowledge Base / RAG | Complete | 0.4.x |
| Fase 5 | WhatsApp Integration | Complete | 0.5.x |
| Fase 6 | Leads & Human Handoff | Complete | 0.6.x |
| Fase 7 | Analytics & Dashboard | Complete | 0.7.x |
| Fase 8 | Production Hardening & Billing Readiness | Complete | 0.8.0 |
| Fase 9 | Deployment & Production Stabilisation | **Complete** | **0.9.0** |

---

## Plans

| Plan | Agents | WhatsApp numbers | Messages/month | Documents | Human handoff |
| --- | --- | --- | --- | --- | --- |
| Free | 1 | 0 (sandbox only) | 100 | 3 | No |
| Starter | 1 | 1 | 1,000 | 10 | No |
| Pro | 3 | 3 | 10,000 | 50 | Yes |
| Agency | 20 | 20 | 100,000 | 500 | Yes |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Yes |

Plan limits are enforced server-side (service layer) with HTTP 402 on breach. Never client-side only.

---

## Database Conventions

> **Rule: all tables in the `public` schema, all objects prefixed with `waai_`.**

This project shares a Supabase project (`focgfmhgfmhmcbywwsej`) with other applications. To avoid conflicts:

- All tables: `waai_workspaces`, `waai_agents`, `waai_conversations`, `waai_messages`, `waai_leads`, `waai_knowledge_documents`, `waai_knowledge_chunks`, `waai_subscriptions`, …
- No custom schemas — no `CREATE SCHEMA waai`
- No unprefixed tables

Every table has `workspace_id uuid` and RLS enabled with workspace-scoped policies.

See [ADR-0002](docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md) for full rationale.

---

## Security

- **RLS on every table** — enforced at PostgreSQL level, not just application
- **WhatsApp tokens encrypted** at rest (`access_token_encrypted`)
- **Webhook signature verification** before processing any inbound payload
- **No PII in application logs**
- **Audit logs immutable** — INSERT-only, no UPDATE/DELETE on `waai_audit_logs`
- **Swiss DSG / nDSG compliant** — data residency, retention policies, PII detection before persistence

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (`public` schema, `waai_` prefix tables)
- Anthropic API key
- OpenAI API key (embeddings only)

### Installation

```bash
git clone <repo-url>
cd waai-saas
npm install
cp .env.example .env.local
# Fill in .env.local with your values
npm run dev
```

### Environment variables

See [`.env.example`](.env.example) for all required variables.  
Staging template: [`.env.staging.example`](.env.staging.example)

---

## ADRs (Architecture Decision Records)

| ADR | Decision |
| --- | --- |
| [ADR-0001](docs/adr/ADR-0001-tech-stack.md) | Tech stack selection |
| [ADR-0002](docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md) | Supabase public schema + `waai_` prefix |
| [ADR-0003](docs/adr/ADR-0003-whatsapp-provider-abstraction.md) | WhatsApp provider abstraction |
| [ADR-0004](docs/adr/ADR-0004-llm-provider-abstraction.md) | LLM provider abstraction |
| [ADR-0005](docs/adr/ADR-0005-embedding-model-and-rag-strategy.md) | Embedding model and RAG strategy |
| [ADR-0006](docs/adr/ADR-0006-plan-limits-and-usage-enforcement.md) | Plan limits and usage enforcement |
| [ADR-0007](docs/adr/ADR-0007-whatsapp-business-api-onboarding.md) | WhatsApp Business API onboarding flow |

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # ESLint

# Verify env vars are present (no values printed)
npx ts-node --skipProject scripts/verify-production-env.ts

# Verify all health endpoints
APP_URL=https://waai-saas.vercel.app \
  INTERNAL_API_SECRET=<secret> \
  npx ts-node --skipProject scripts/verify-health-endpoints.ts

# Verify staging readiness
npx ts-node --skipProject scripts/verify-staging-readiness.ts
```

---

## Deployment

### Vercel

Automatic deploy from `main` via GitHub integration.  
Preview deploys from any branch — promote to production via Vercel dashboard or CLI.

See [`docs/architecture/41-vercel-deployment-architecture.md`](docs/architecture/41-vercel-deployment-architecture.md).

### Supabase Migrations

```bash
supabase link --project-ref focgfmhgfmhmcbywwsej
supabase db push   # Applies all 9 migrations in order
```

See [`docs/architecture/42-supabase-remote-migration-execution.md`](docs/architecture/42-supabase-remote-migration-execution.md).

### Spec Driven Development (SDD)

Before writing any feature code:

1. Write spec in `docs/specs/<feature-name>.md`
2. Record architectural decision in `docs/adr/ADR-XXXX-<title>.md`
3. Define data model in `docs/specs/data-model.md`
4. Implement after spec is approved
5. `npm run lint && npm run build` must pass before closing any phase

---

## Operations — v0.9.0

| Guide | Description |
| --- | --- |
| [Staging Execution Runbook](docs/operations/staging-execution-runbook.md) | git → GitHub → Supabase → Vercel → smoke tests |
| [Supabase Staging Setup](docs/operations/supabase-staging-setup.md) | Create project, enable pgvector, apply migrations, seed plans |
| [Vercel Staging Setup](docs/operations/vercel-staging-setup.md) | Connect repo, configure env vars, deploy, verify health |
| [Smoke Test Execution](docs/operations/staging-smoke-test-execution.md) | 96-test execution guide (90/96 PASS minimum, 0 critical failures) |
| [Release Checklist](docs/operations/release-staging-v0.9.0-checklist.md) | Executive sign-off checklist (blocks A–I) |

**SQL utilities:**

- [`docs/sql/waai-staging-seed-plans.sql`](docs/sql/waai-staging-seed-plans.sql) — Seed Free / Starter / Pro / Agency plans
- [`docs/sql/waai-staging-verification.sql`](docs/sql/waai-staging-verification.sql) — Post-migration verification queries
- [`docs/sql/waai-staging-rollback-notes.sql`](docs/sql/waai-staging-rollback-notes.sql) — Rollback diagnostics

---

## Contributing

1. Open an issue or spec doc
2. Get spec approved
3. Implement following conventions in this README and `CLAUDE.md`
4. `npm run lint && npm run build` must pass before any PR
