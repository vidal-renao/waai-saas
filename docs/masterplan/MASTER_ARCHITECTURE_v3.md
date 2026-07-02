# WAAI v3 — Master Architecture Plan
**Document Type:** Principal Architecture Decision  
**Date:** 2026-06-30  
**Authors:** CTO Office / Principal Architecture  
**Status:** APPROVED — Strategic Direction  
**Horizon:** 3–5 years (2026–2031)

---

## Executive Summary

WAAI is evolving from a WhatsApp AI SaaS tool into an **Enterprise AI Agent Platform** — a horizontal infrastructure layer on which businesses run intelligent, policy-governed, multi-channel agents. This document is the authoritative architecture plan for that evolution.

The existing v0.9.0 codebase represents approximately 18 months of disciplined engineering. The architecture is clean, the data model is enterprise-grade, and the security foundation is solid. **This plan evolves WAAI — it does not replace it.**

---

## Section 1 — Current State Assessment

### Architecture Maturity: 7.2 / 10

WAAI v0.9.0 is a production-capable MVP with clear, disciplined architecture:

```
Next.js 16.2.7 (App Router)
├── src/features/          ← 10 feature modules, clean separation
├── src/server/services/   ← 30 services, single responsibility
├── src/server/use-cases/  ← 46 use cases, one action each
├── src/server/repos/      ← 30+ repositories, one table each
└── src/lib/               ← LLM, WhatsApp, embedding abstractions (interfaced)
Supabase (PostgreSQL + RLS + pgvector)
├── 8 migrations applied, clean versioning
├── RLS on 100% of tables — enterprise-grade
└── Immutable audit_logs — DSG/nDSG compliant
```

### Proven Strengths
- **Layered architecture** — no business logic leaks into routes or components
- **Provider abstraction** — LLM, WhatsApp, and embedding providers are all interfaced (ADR-0003, ADR-0004)
- **Data security** — RLS on every table, SECURITY DEFINER helpers, immutable audit logs
- **Billing infrastructure** — plans, limits, enforcement, and Stripe columns already in DB
- **RAG pipeline** — pgvector with workspace+agent isolation, similarity threshold, source attribution
- **14-step agent pipeline** — complete, correctly ordered, handles edge cases

### Active Technical Debt

| Debt Item | Severity | Effort to Fix |
|---|---|---|
| Stripe: stub, never returns true | 🔴 Critical | 2 weeks |
| Meta WhatsApp: no backend implementation | 🔴 Critical | 1 week |
| next.config.ts empty — no security headers | 🔴 Critical | 1 day |
| AiCostService never called from runtime | 🔴 High | 30 min |
| Zero test coverage | 🔴 High | 4–6 weeks to baseline |
| No streaming responses | 🟠 Medium | 1 week |
| No retries on Anthropic API | 🟠 Medium | 1 day |
| LLM factory hardcoded — no provider routing | 🟡 Low | 1 day |
| /api/health version mismatch (0.8.0 vs 0.9.0) | 🟡 Low | 5 min |
| No pg_cron for monthly counter resets | 🟡 Low | 1 day |

### Engineering Decisions to Preserve (ADR-Protected)
- `waai_` prefix on all DB tables (ADR-0002) — namespace isolation
- Provider interfaces for LLM, WhatsApp, Embedding (ADR-0003, -0004, -0005)
- Plan enforcement at service layer, never client (ADR-0006)
- Supabase RLS as primary isolation mechanism

---

## Section 2 — Target Product Definition

### What WAAI Should Become

**WAAI v3 is an Enterprise AI Agent Operating System.**

Not a chatbot builder. Not a WhatsApp tool. An operating system for enterprise-grade intelligent agents that:

1. **Operate across channels** — WhatsApp, Teams, Email, Slack, Telegram, API
2. **Execute structured workflows** — multi-step, conditional, human-in-the-loop
3. **Learn from enterprise knowledge** — RAG, memory, feedback loops
4. **Enforce business policies** — approval chains, risk gates, compliance
5. **Integrate with enterprise systems** — CRM, ERP, Calendar, SharePoint, MCP
6. **Prove their value** — cost tracking, performance metrics, ROI dashboards
7. **Run at enterprise scale** — multi-org, SSO, SCIM, audit, residency

### Product Differentiation

| Competitor | What they do | WAAI advantage |
|---|---|---|
| Intercom / Zendesk AI | Customer support AI | WAAI is multi-domain, not support-only |
| Copilot Studio | Microsoft-stack agents | WAAI is provider-agnostic, WhatsApp-native |
| n8n + LangChain | Developer workflow tools | WAAI ships enterprise UI + security out of the box |
| Botpress | Bot builder | WAAI has enterprise AI (RAG, multi-agent, approvals) |

### Strategic Positioning
**"The AI Agent Platform built for enterprises that need compliance, control, and WhatsApp."**  
Swiss/DACH market first → EU → global enterprise.

---

## Section 3 — Domain Architecture

See [DOMAIN_MODEL.md](DOMAIN_MODEL.md) for full specifications.

### Domain Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAAI Enterprise Platform                      │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   Identity   │  Workspace   │    Agent     │    Knowledge       │
│   Platform   │  Platform    │   Platform   │    Platform        │
├──────────────┼──────────────┼──────────────┼────────────────────┤
│  Connector   │  Workflow    │  Execution   │    Billing         │
│  Platform    │  Platform    │  Platform    │    Platform        │
├──────────────┼──────────────┼──────────────┼────────────────────┤
│  Analytics   │    Audit     │Observability │   Developer        │
│  Platform    │   Platform   │  Platform    │   Platform         │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

### Domain Summary

| Domain | Current State | v3 Target |
|---|---|---|
| Identity | Supabase Auth + 5 roles | + SSO, SCIM, MFA, Org hierarchy |
| Workspace | Single workspace/user | + Multi-workspace, Org → Dept → WS |
| Agent | Prompt + Knowledge | + Goals, Tools, Workflows, Memory, Policies |
| Knowledge | pgvector RAG | + Multi-modal, HNSW, feedback loop, auto-refresh |
| Connector | WhatsApp (Whapi) | + Meta, Email, Teams, Slack, CRM, ERP, MCP |
| Workflow | Manual triggers only | + Visual engine, conditions, loops, approvals |
| Execution | Single-threaded pipeline | + Queue-based, parallel, retryable |
| Billing | Stripe stub | + Full Stripe, usage-based, enterprise agreements |
| Analytics | Usage metrics | + ROI dashboards, A/B testing, business intelligence |
| Audit | INSERT-only logs | + Export, compliance reports, SIEM integration |
| Observability | Structured logging | + Sentry, alerting, distributed tracing |
| Developer | None | + REST API, webhooks, SDK, MCP server |

---

## Section 4 — AI Platform

See [AI_PLATFORM.md](AI_PLATFORM.md) for full design.

### Core Subsystems

```
LLM Router ──→ Model Evaluator ──→ Cost Tracker
     ↓                                    ↓
Provider Pool                      Budget Enforcer
(Anthropic/OpenAI/Azure)                 ↓
     ↓                            Analytics Sink
Prompt Engine ──→ Context Engine
     ↓                ↓
 RAG Memory      Conversation
  (pgvector)      History
     ↓
Agent Response ──→ Safety Filter ──→ Output
```

### Key Design Principles
1. **Model routing** — choose model per task type (haiku for speed, sonnet for reasoning)
2. **Streaming first** — every response streams; UI shows tokens as they arrive
3. **Retries with backoff** — 3 attempts on 529/500, exponential 1s→2s→4s
4. **Cost tracking on every run** — `estimated_cost_cents` wired from Day 1
5. **Provider failover** — if Anthropic down, route to configured fallback

---

## Section 5 — Connector Platform

See [CONNECTOR_PLATFORM.md](CONNECTOR_PLATFORM.md) for full design.

### Connector Registry Pattern

```typescript
interface Connector {
  id: string;
  type: ConnectorType;
  capabilities: ConnectorCapability[];
  send(message: OutboundMessage): Promise<SendResult>;
  receive(raw: unknown): InboundMessage;
  verify(payload: string, signature: string): boolean;
  health(): Promise<HealthStatus>;
}
```

All connectors register at startup. Workspace picks connector by type + workspace config.  
New connectors add a class without touching business logic.

---

## Section 6 — Workflow Engine

See [WORKFLOW_ENGINE.md](WORKFLOW_ENGINE.md) for full design.

### Execution Model: Node Graph

```
Trigger Node ──→ Condition Node ──→ Action Node ──→ Approval Node
                      ↓                                   ↓
                  Branch Node                         Human Decision
                      ↓
                 Loop Node ──→ Agent Node ──→ Output Node
```

Workflows are stored as JSON graphs in `waai_workflows`. Execution is queue-based (Inngest). Every node execution is logged. Failed executions retry per node policy.

---

## Section 7 — Human Approval Engine

See [AGENT_MODEL.md](AGENT_MODEL.md) — Approval subsystem.

### Policy-Driven Routing

```
Agent Action ──→ Risk Scorer ──→ [ Low risk: auto-approve ]
                                  [ Medium: team lead ]
                                  [ High: manager ]
                                  [ Critical: C-level ]
```

Approval policies stored per workspace. SLA timers trigger escalation. All decisions immutable in audit log.

---

## Section 8 — Agent Model v3

See [AGENT_MODEL.md](AGENT_MODEL.md) for full design.

### Agent Entity v3

```
Agent {
  Identity:    name, avatar, language, tone, persona
  Goals:       primary, secondary, OKRs
  Policies:    response rules, forbidden topics, escalation triggers
  Memory:      conversation context, user profiles, session state
  Knowledge:   knowledge bases, document collections, live search
  Tools:       registered tool set (connectors, functions, APIs)
  Workflows:   trigger conditions, step sequences, approval nodes
  Approvals:   risk policy, approval chain, SLA
  Permissions: roles that can configure, roles that can deploy
  Analytics:   performance metrics, cost tracking, goal completion
  Audit:       full action log, human review queue
  Lifecycle:   draft → review → published → deprecated
  Health:      status, error rate, latency p95, cost/day
}
```

---

## Section 9 — Enterprise Features

See [ENTERPRISE_PLATFORM.md](ENTERPRISE_PLATFORM.md) for full design.

### Organization Hierarchy

```
Organization (Tenant root — new in v3)
├── Enterprise Agreement + SSO config
├── Department A
│   ├── Workspace A1 (team)
│   └── Workspace A2 (team)
└── Department B
    └── Workspace B1
```

### Identity & Access
- **SSO**: SAML 2.0 + OIDC (Azure AD, Google Workspace, Okta)
- **SCIM**: Automatic user provisioning/deprovisioning
- **MFA**: TOTP + WebAuthn
- **API Keys**: Per-workspace, per-app, scoped
- **Roles**: Platform → Org → Dept → Workspace hierarchy

---

## Section 10 — Scalability

See [SCALABILITY_PLAN.md](SCALABILITY_PLAN.md) for full plan.

| Scale | Architecture | Key addition |
|---|---|---|
| 10 customers | Current Supabase Free/Pro | Nothing new needed |
| 100 customers | Supabase Pro + Vercel Pro | Supabase connection pooler |
| 1,000 customers | Supabase Pro + queue (Inngest) | Async execution, pgBouncer |
| 10,000 customers | Supabase Scale + read replicas | Sharding by org, caching layer |
| 100,000 customers | Dedicated Supabase instances per region | HNSW index, search service |
| 1M customers | Multi-region, MSA decomposition | Full platform decomposition |

---

## Section 11 — Technical Roadmap

See [ROADMAP_v3.md](ROADMAP_v3.md) for full detail.

| Phase | Name | Duration | Outcome |
|---|---|---|---|
| A | Platform Stabilization | 4 weeks | Revenue-ready, secure, observable |
| B | Enterprise Foundations | 6 weeks | SSO, multi-workspace, API keys |
| C | Agent Platform | 8 weeks | Rich agent model, tool registry |
| D | Workflow Platform | 8 weeks | Visual workflow engine |
| E | Connector Platform | 6 weeks | Email, Teams, Slack, CRM |
| F | Enterprise Features | 6 weeks | SCIM, orgs, departments |
| G | AI Operating System | 12 weeks | Multi-agent, reasoning, memory |

---

## Section 12 — Do Not Build

| Feature | Reason |
|---|---|
| On-premise deployment | Operationally expensive, kills SaaS economics; use data residency + private cloud instead |
| Custom LLM training | Not a core competency; use fine-tuning APIs if needed |
| Own vector database | pgvector with HNSW at Supabase scale is sufficient to 1M chunks; premature at current scale |
| Full CRM replacement | Integrate with Salesforce/HubSpot; don't compete with them |
| Own email server | Use Resend/SendGrid; email deliverability is a specialization |
| Mobile native apps | PWA + responsive web covers 80% of use cases; native is 3× cost |
| GraphQL API | REST is sufficient; GraphQL adds complexity without user benefit at current scale |
| Agent marketplace with revenue share | Premature until platform MAU > 10,000; marketplace dynamics require critical mass |
| Blockchain audit trail | Regulatory overkill; immutable PostgreSQL INSERT-only log is legally sufficient |
| Own CDN | Vercel handles this; don't replicate solved infrastructure |

---

## Section 13 — Breaking Changes & Migration

### Backwards Compatible (no migration required)
- Adding HTTP security headers to next.config.ts
- Wiring AiCostService into agent runtime
- Adding streaming branch to LLM provider
- Implementing Meta WhatsApp provider (additive)
- Implementing Stripe checkout (additive)
- Adding password reset flow (additive)
- Adding retry logic to Anthropic provider
- Adding HNSW index (add alongside IVFFlat, then swap)
- Adding pg_cron maintenance jobs

### Requires Migration
| Change | Migration Strategy |
|---|---|
| Organization layer above workspace | Add `waai_organizations` table; backfill existing workspaces to auto-created orgs; RLS updated to check org membership |
| Rich Agent model (Goals, Policies, Tools) | New columns nullable; existing agents get sensible defaults; no data loss |
| Workflow engine | New `waai_workflows` table; existing agent pipeline becomes a built-in workflow template |
| Multi-workspace per user | Remove unique constraint on workspace_id in user sessions; add workspace switcher UI |
| RBAC expansion | Existing roles mapped to new hierarchy; owners stay owners; no permission reduction |

### Migration Principles
1. Never remove columns — mark deprecated, migrate async
2. All breaking changes behind feature flags before cutover
3. Every DB migration has a rollback script
4. Zero-downtime migrations only (Supabase `ADD COLUMN`, never `ALTER TYPE` blocking)

---

## Section 14 — Investment Protection

Every subsystem listed here was engineered with discipline and must be preserved in v3:

| Subsystem | Location | Why preserve |
|---|---|---|
| Repository pattern | `src/server/repos/` | 30+ repositories, clean, battle-tested |
| Use case pattern | `src/server/use-cases/` | 46 use cases, correct abstraction level |
| RLS policies | All migrations | Enterprise-grade; re-implementing would introduce risk |
| Immutable audit_logs | Phase 1 migration | DSG/nDSG compliant; cannot weaken |
| Provider interfaces | `src/lib/llm`, `src/lib/whatsapp`, `src/lib/embeddings` | Correct abstraction; v3 extends, never replaces |
| Billing data model | `waai_subscriptions`, `waai_billing_events` | Stripe-ready; Stripe wiring is additive |
| pgvector RAG pipeline | Phase 4 migration + `rag-retrieval-service.ts` | Production-quality; extend with HNSW + feedback |
| Secret redaction | `src/lib/security/redact-secrets.ts` | Security-critical; extend patterns, never remove |
| 14-step agent pipeline | `agent-runtime-service.ts` | Correct; wire cost and streaming into it, don't restructure |
| Webhook handler | `/api/webhooks/whatsapp/route.ts` | Correct security pattern; extend for Meta, don't replace |
| Plan enforcement | `billing-enforcement-service.ts` | Revenue protection; extend for new limits, don't bypass |

---

## Section 15 — First 100 CTO Decisions

See [FIRST_100_CTO_DECISIONS.md](FIRST_100_CTO_DECISIONS.md) for the full ordered list.

### Top 10 (Week 1)
1. Merge P0 security headers to next.config.ts — unblock enterprise POCs
2. Wire AiCostService into AgentRuntimeService — restore cost analytics
3. Implement MetaCloudApiProvider — unblock largest provider market
4. Implement Stripe checkout + webhook — enable revenue
5. Add password reset flow — table stakes for any SaaS
6. Add TypeScript type-check and lint to CI — stop broken builds reaching staging
7. Establish vitest baseline — start the test coverage journey
8. Fix /api/health version to 0.9.0 — stop misreporting to monitoring
9. Set SENTRY_DSN in all environments — gain production visibility
10. Activate Anthropic prompt caching (documented in ADR-0004 but not implemented)

---

*Sub-documents: [DOMAIN_MODEL.md](DOMAIN_MODEL.md) · [AI_PLATFORM.md](AI_PLATFORM.md) · [CONNECTOR_PLATFORM.md](CONNECTOR_PLATFORM.md) · [WORKFLOW_ENGINE.md](WORKFLOW_ENGINE.md) · [AGENT_MODEL.md](AGENT_MODEL.md) · [ENTERPRISE_PLATFORM.md](ENTERPRISE_PLATFORM.md) · [SCALABILITY_PLAN.md](SCALABILITY_PLAN.md) · [ROADMAP_v3.md](ROADMAP_v3.md) · [FIRST_100_CTO_DECISIONS.md](FIRST_100_CTO_DECISIONS.md) · [BOARD_PRESENTATION.md](BOARD_PRESENTATION.md)*
