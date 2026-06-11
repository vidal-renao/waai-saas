# WAAI SaaS — WhatsApp AI Agent Platform

A multi-tenant SaaS platform that lets businesses create, configure, and deploy intelligent WhatsApp agents without writing code. Each business connects their WhatsApp number, uploads their documents, configures their agent through a guided interview, and gets an AI-powered assistant that answers customers, captures leads, and escalates to humans when needed.

---

## Product Vision

Small businesses lose leads because they can't respond to WhatsApp fast enough. WAAI lets any PYME deploy a Claude-powered agent in minutes — trained on their real business data, connected to their WhatsApp, controlled from a professional dashboard.

**Core value:** Not just a bot. A business agent with context, commercial goals, RAG knowledge, lead capture, and human handoff.

**Target markets:** Switzerland, Spain, Latin America.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL (public schema, `waai_` prefix) |
| Vector search | pgvector (RAG) |
| Edge Functions | Supabase Edge Functions (Deno) |
| LLM | Claude API (Anthropic) — `claude-haiku-4-5-20251001` / `claude-sonnet-4-6` |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| WhatsApp MVP | Whapi.cloud |
| WhatsApp prod | Meta WhatsApp Cloud API |
| Deploy | Vercel + Supabase Cloud |
| CI/CD | GitHub Actions |

---

## Spec Driven Development (SDD) Workflow

This project follows **Spec Driven Development**. Before writing any feature code:

1. Write the spec in `docs/specs/<feature-name>.md`
2. Record architectural decisions in `docs/adr/ADR-XXXX-<title>.md`
3. Define the data model in `docs/specs/data-model.md`
4. Implement feature code after spec is approved
5. Run lint + build + tests before closing a phase

**Spec files are the source of truth** for what is being built and why.

---

## Database Conventions

> **Rule: all tables in the `public` schema, all objects prefixed with `waai_`.**

This project shares a Supabase project with other applications. To avoid conflicts:

- `waai_workspaces`, `waai_agents`, `waai_conversations`, `waai_messages`, `waai_leads`
- No custom schemas (no `CREATE SCHEMA waai`)
- No unprefixed tables

Every table must have:

- `workspace_id uuid` — for tenant isolation
- RLS enabled with workspace-scoped policies

See [ADR-0002](docs/adr/ADR-0002-supabase-public-schema-and-waai-prefix.md) for full rationale.

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
| Fase 9 | Deployment & Supabase Remote Migration | Complete | 0.9.0 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (shared project, `public` schema only)
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

See [`.env.example`](.env.example) for all required variables with descriptions.

---

## Architecture

See [`docs/architecture/overview.md`](docs/architecture/overview.md) for the full system architecture.

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
```

---

## Deployment

### Vercel

Deploy automatically from the `main` branch via GitHub integration, or manually with `vercel --prod`.

See [`docs/architecture/41-vercel-deployment-architecture.md`](docs/architecture/41-vercel-deployment-architecture.md) for full Vercel configuration.

### Supabase Migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push   # Applies all 9 migrations in order
```

See [`docs/architecture/42-supabase-remote-migration-execution.md`](docs/architecture/42-supabase-remote-migration-execution.md) for the full migration guide.

### Verification Scripts

```bash
# Verify environment variables (no values printed)
npx ts-node --skipProject scripts/verify-production-env.ts

# Verify health endpoints
APP_URL=https://your-domain.vercel.app \
  INTERNAL_API_SECRET=your-secret \
  npx ts-node --skipProject scripts/verify-health-endpoints.ts
```

### Runbook

Step-by-step production deployment: [`docs/prompts/08-production-deployment-runbook.md`](docs/prompts/08-production-deployment-runbook.md)

---

## Staging v0.9.0

WAAI SaaS v0.9.0 is feature-complete (Phases 1–9). The following guides cover the full staging execution process:

| Guide | Description |
| --- | --- |
| [Staging Execution Runbook](docs/operations/staging-execution-runbook.md) | Step-by-step: git → GitHub → Supabase → Vercel → smoke tests |
| [Supabase Staging Setup](docs/operations/supabase-staging-setup.md) | Create project, enable pgvector, apply 9 migrations, seed plans |
| [Vercel Staging Setup](docs/operations/vercel-staging-setup.md) | Connect repo, configure env vars, deploy, verify health endpoints |
| [Smoke Test Execution](docs/operations/staging-smoke-test-execution.md) | 96-test execution guide with results table and bug procedures |
| [Release Checklist](docs/operations/release-staging-v0.9.0-checklist.md) | Executive sign-off checklist (A–I blocks) |

**Environment template:** [`.env.staging.example`](.env.staging.example)

**SQL utilities:**

- [`docs/sql/waai-staging-seed-plans.sql`](docs/sql/waai-staging-seed-plans.sql) — Seed Free / Starter / Pro / Agency plans
- [`docs/sql/waai-staging-verification.sql`](docs/sql/waai-staging-verification.sql) — Post-migration verification queries
- [`docs/sql/waai-staging-rollback-notes.sql`](docs/sql/waai-staging-rollback-notes.sql) — Rollback notes and diagnostics

**Staging readiness script:**

```bash
npx ts-node --skipProject scripts/verify-staging-readiness.ts
```

---

## Contributing

This project uses Spec Driven Development. Before starting any feature:

1. Open an issue or spec doc
2. Get spec approved
3. Implement following the conventions in this README
4. Ensure lint + build pass before PR
