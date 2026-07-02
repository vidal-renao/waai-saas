# WAAI — CTO Operating Manual
**Document Type:** Executive Reference  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative — this is the single source of truth for engineering leadership at WAAI

---

## Preface

This manual defines how engineering decisions are made at WAAI. It is not a policy document that collects dust. It is the working agreement between the engineering leadership and the team. Any engineer can challenge any decision in this manual — through the ADR process, not around it.

Every future engineering decision must align with this manual, or the manual must be updated to reflect the new direction. There is no third option.

---

## Part 1 — The WAAI Engineering Philosophy

### What WAAI Actually Is

WAAI is not a chatbot builder. WAAI is an enterprise AI Agent Operating System. The distinction matters for every engineering decision:

**Chatbot builders** optimise for: speed to first message, ease of setup, breadth of integrations.

**Enterprise AI Operating Systems** optimise for: governance, auditability, security, approval workflows, compliance certifications, SLA guarantees.

Every feature that makes WAAI more "enterprise" (approvals, policies, versioning, SCIM, ISO 27001) is not bureaucratic overhead. It is the product.

### The Three Unbreakable Rules

**Rule 1: Revenue before features.**  
The product cannot survive without revenue. Stripe implementation takes priority over every feature, every time. This rule expires after the first CHF 150,000 ARR — at that point, the business can invest in growth.

**Rule 2: Trust is the product.**  
Enterprise customers are not paying for AI capabilities — they can get those free from a dozen tools. They are paying for trusted, audited, policy-governed AI that they can deploy to their customers without liability risk. Every security shortcut, every missing audit log, every unverified webhook damages the product.

**Rule 3: Preserve the foundation.**  
18 months of clean architecture is an asset. The repository pattern, use case layer, provider abstractions, RLS policies, audit logs — these are not obstacles to speed. They are the reason WAAI can be trusted by enterprise customers. Protect them.

---

## Part 2 — Engineering Decision Framework

### How Technical Decisions Are Made

| Decision Type | Decision Authority | Process |
|---|---|---|
| Implementation approach (how to build a feature) | Individual engineer | Discuss with peer; proceed |
| New external dependency | Tech Lead | Check criteria in `06_ENGINEERING_STANDARDS.md` |
| New database table or schema change | ARB (Architecture Review Board) | ADR required (`07_ADR_POLICY.md`) |
| Change to provider abstraction interface | ARB | ADR required |
| Breaking change to public API | CTO | ADR + customer notification |
| Change to RLS policy | ARB + Security review | ADR + security checklist |
| New technology or framework | CTO | ADR with alternatives considered |
| Rollback decision | On-call engineer | Immediate, notify CTO |

### The ADR Principle

If two reasonable engineers would disagree on the approach, it needs an ADR.

An ADR is a 30-minute investment that prevents 5 days of re-work. Writing fewer ADRs is not a sign of moving fast. It is a sign of building technical debt.

### The "No Over-Engineering" Principle

WAAI does not build for hypothetical future requirements. Three rules:

1. **HNSW before dedicated vector DB.** The IVFFlat → HNSW migration handles 10M vectors. We move to Qdrant/Pinecone only when HNSW benchmarks show it insufficient.
2. **Redis before sharding.** Upstash Redis (serverless, Vercel-native) handles 10,000 customers. We shard only when Redis hits a ceiling.
3. **Monolith before microservices.** The current architecture handles Tier 4 (10,000 customers) without extraction. The Execution Service is extracted in Phase G only.

Premature decomposition is the single most expensive engineering mistake. Every microservice boundary is a distributed systems problem. Don't create the problem before the scale demands it.

---

## Part 3 — The Engineering Operating Rhythm

### Weekly Cadence

**Monday — Sprint Planning**  
Duration: 2 hours  
Format: Synchronous  
Output: Committed tasks for the week, each with owner and due date

Agenda:
1. Review Engineering Board — clear what's blocked
2. Review this week's deliverable from `14_EXECUTION_ROADMAP.md`
3. Pull tasks from Backlog → Ready for the week
4. Confirm WIP limits respected (max 2 tasks per engineer in development)
5. Any risks to the week's delivery?

**Thursday — Architecture Sync**  
Duration: 30 minutes  
Format: Synchronous  
Output: ADR decisions, design clarity, blockers resolved

Agenda:
1. ADRs under review — quorum decision
2. Design questions that need alignment
3. Tasks stuck in Architecture Review column — unblock or escalate

**Friday — Demo + Retrospective**  
Duration: 1 hour  
Format: Synchronous  
Output: Verified feature in staging, retro actions for next week

Agenda:
1. Demo any feature that moved to QA or Staging this week
2. What shipped? (Not "what was worked on" — what is verifiably done?)
3. What blocked us? (Root cause, not symptom)
4. What do we change next week?

### Monthly Cadence

**First Monday of each month — Technical Debt Review**  
Duration: 1 hour  
Review `13_TECHNICAL_DEBT_REGISTER.md`. Close resolved items. Add new items. Prioritise. Confirm Platform Track capacity (20%) is being used.

**Last Friday of each phase — Phase Retrospective**  
Duration: 2 hours  
- Were acceptance criteria met?
- What took longer than estimated?
- What technical debt was created by the phase?
- Was the Definition of Done followed?
- Update process documents based on learnings.

---

## Part 4 — The WAAI Technology Stack

### Approved Technology (use these, don't replace without ADR)

| Category | Technology | Why |
|---|---|---|
| Framework | Next.js 15+ App Router | SSR, RSC, API routes, Vercel-native |
| Language | TypeScript strict mode | Type safety, enterprise confidence |
| Database | Supabase (PostgreSQL) | RLS, auth, real-time, pgvector in one platform |
| Auth | Supabase Auth + Entra ID | Complete auth + enterprise SSO ready |
| AI — LLM | Anthropic Claude (primary) | Quality, safety, tool use, streaming |
| AI — Embedding | OpenAI `text-embedding-3-small` | 1536 dim, pgvector compatible |
| Deployment | Vercel | Zero-config Next.js, preview deployments |
| Async Queue | Inngest (Phase C onwards) | Serverless-native, Vercel-native, retries built-in |
| Caching | Upstash Redis (Phase D onwards) | Serverless, Vercel-native, no infra management |
| Styling | Tailwind CSS v4 | Utility-first, consistent with VIDAL ECOSYSTEM standards |
| Error tracking | Sentry | Industry standard, Next.js SDK available |
| Email | Resend | Developer-friendly, reliable, Swiss-compliant |
| Payments | Stripe | Only acceptable choice for SaaS billing |
| i18n | next-intl | Matches VIDAL ECOSYSTEM standard |
| Testing | Vitest + Playwright | Vitest for unit/integration, Playwright for E2E |

### Unapproved Technology (do not introduce without ADR)

- **No new state management libraries** (no Zustand, MobX, Redux unless proven Jotai/Context insufficient)
- **No additional database technologies** until Supabase is proven insufficient
- **No alternative LLM providers** until the `LLMProvider` interface is extended via ADR
- **No server-side frameworks** other than Next.js API routes (no Express, Fastify, Hono)
- **No ORMs** (Prisma, Drizzle) — use Supabase client directly against typed schema

### Technology Lifecycle Policy

Any technology in the "Approved" list can be superseded by:
1. Writing an ADR explaining the reason for change
2. ARB approval with ≥ 3/4 votes
3. Migration plan that preserves all existing functionality
4. No breaking change to existing customers during migration

---

## Part 5 — Security and Compliance Operating Principles

### Swiss DSG/nDSG — Non-Negotiable

WAAI is incorporated in Basel. Swiss DSG (nDSG) applies to all customer data. These rules are never relaxed:

1. **RLS on every table.** No data escapes to other tenants. RLS is tested before every release.
2. **Audit logs are immutable.** `waai_audit_logs` has INSERT-only RLS. No UPDATE, no DELETE, ever. If an entry needs correction, add a new entry noting the correction.
3. **Data residency documented.** Every customer knows where their data is stored. For Swiss DSG compliance, data is stored in EU/CH Supabase regions by default.
4. **PII is identified.** Any field that contains personal data is documented. Retention policy applied. Right to erasure is implementable.
5. **AI calls are not anonymous.** Every Anthropic API call is attributed to a workspace and conversation. This enables DSG accountability.

### Security Response Protocol

| Severity | Definition | Response |
|---|---|---|
| P1 — Critical | Data exposure or potential breach | CTO + all senior engineers. 15-minute response. |
| P1 — Revenue | Payment processing down | VP Engineering + billing engineer. 1-hour fix. |
| P2 — Auth | Login broken for all users | Tech Lead. 1-hour fix. Fallback to maintenance mode if needed. |
| P3 — Feature | Feature broken, no data risk | Tech Lead. Fix in current sprint. |

**Post-Mortems are mandatory for P1/P2.** Not to assign blame. To prevent recurrence. Post-mortem template in `docs/incidents/`.

### Secrets Management

1. No secret ever committed to git. `.env.local` is `.gitignored`.
2. All secrets in Vercel environment variables. Separate values for Development/Preview/Production.
3. All credentials stored in Supabase encrypted with `ENCRYPTION_KEY` (AES-256-GCM).
4. `src/lib/security/redact-secrets.ts` applied before any string reaches logs or Sentry.
5. `ENCRYPTION_KEY` rotated annually. Rotation plan: decrypt all tokens with old key, re-encrypt with new key, atomically update `ENCRYPTION_KEY`.

---

## Part 6 — The Platform Invariants

These properties of WAAI are invariant. They cannot be changed by any individual engineer, ADR, or feature requirement. Changing them requires a full technical review with the CTO and a documented migration plan.

### Invariant 1: `waai_` Prefix on All Tables

ADR-0002. All Supabase tables use the `waai_` prefix. This is a naming convention that protects against naming conflicts with Supabase system tables and makes schema auditing trivial. 100% of existing production data uses this prefix. Changing it requires migrating every table and every FK reference simultaneously.

### Invariant 2: RLS on Every Customer Data Table

RLS is the last line of defence against cross-tenant data exposure. Even if the application layer has a bug, RLS prevents data leakage. Every new table with customer data must have RLS enabled and appropriate policies before it is used in production.

### Invariant 3: Audit Logs are INSERT-Only

`waai_audit_logs` records the history of significant actions. INSERT-only RLS policy ensures this history cannot be altered. Any compromise of audit log integrity eliminates our ability to investigate incidents and violates DSG compliance.

### Invariant 4: The Clean Architecture Layer Hierarchy

```
Route Handler → Use Case → Service → Repository → Provider
```

No layer may bypass the one above it. No repository is imported in a Route Handler. No service makes HTTP requests directly. No Route Handler knows about database queries. This separation is what makes the codebase maintainable by multiple engineers over multiple years.

### Invariant 5: Provider Abstractions Absorb Vendor Changes

WhatsApp providers, LLM providers, and embedding providers are behind interfaces (ADR-0003, ADR-0004, ADR-0005). Business logic never depends on a specific vendor. Switching from Whapi to Meta, or from Anthropic to Azure OpenAI, requires no changes to business logic — only a factory switch.

---

## Part 7 — Hiring and Team Growth

### When to Hire

| Trigger | Role to Hire |
|---|---|
| Phase A complete, revenue positive | First full-time backend engineer |
| Phase B complete, enterprise pilot signed | Second engineer (frontend focus) |
| Phase D started (Workflow Platform) | Third engineer (workflow/DevOps) |
| Phase G started | Two additional engineers (Phase G peak: 4–6 engineers) |

### Onboarding Checklist for New Engineers

```
Day 1:
□ Read this document (CTO Operating Manual) in full
□ Read ENGINEERING_STANDARDS.md
□ Read DEFINITION_OF_DONE.md
□ Read ADR-0001 through ADR-0007
□ Clone repo, run `npm install && npm run dev`, see dashboard

Week 1:
□ Shadow a feature branch implementation with a senior engineer
□ Complete one XS task end-to-end through the board
□ Read the Enterprise Audit reports (CTOVerdict.md is the key one)
□ Read the Master Architecture overview (MASTER_ARCHITECTURE_v3.md intro)

Month 1:
□ Own an S-sized feature from design to production
□ Conduct first PR review as reviewer
□ Contribute one unit test to the test suite
□ Understand the AgentRuntimeService 14-step pipeline
```

---

## Part 8 — Key Metrics (What the CTO Watches)

### Business Metrics (reviewed weekly)

| Metric | Target (Phase A) | Target (Phase B) | Target (Phase G) |
|---|---|---|---|
| MRR | CHF 0 → CHF 5,000 | CHF 5,000 → CHF 20,000 | CHF 50,000+ |
| Active paying customers | 0 → 5 | 5 → 20 | 100+ |
| Enterprise pilots | 0 | 1–2 | 10+ |
| Churn rate | N/A | < 10%/mo | < 5%/mo |

### Engineering Metrics (reviewed weekly)

| Metric | Tool | Alert Threshold |
|---|---|---|
| Agent runtime p95 latency | Sentry Performance | > 8000ms |
| API error rate | Sentry | > 1% |
| Failed agent runs | Sentry | > 5% |
| DB connection pool utilisation | Supabase | > 80% |
| Anthropic cost per 1k messages | `waai_ai_cost_snapshots` | > CHF 0.50 |
| CI pipeline pass rate | GitHub Actions | < 95% = investigate |
| Deployment frequency | Vercel | < 2/week = process problem |

### Trust Metrics (reviewed monthly)

| Metric | Tool | Target |
|---|---|---|
| Security headers grade | securityheaders.com | A or B |
| RLS coverage | Supabase schema audit | 100% of customer data tables |
| Audit log completeness | `waai_audit_logs` query | All critical operations logged |
| ADR coverage | `docs/adr/` | All architecture decisions documented |

---

## Part 9 — When This Manual Is Wrong

This manual is not sacred. It is a living document. Any engineer can propose a change by:

1. Identifying the specific section and explaining why it is wrong or outdated
2. Proposing the replacement text
3. Bringing the proposal to the Thursday Architecture Sync
4. If the ARB approves: updating this document in the same PR as any code changes it enables

The only change to this manual that requires CTO approval (not just ARB majority):
- Changes to Part 6 (Platform Invariants)
- Changes to Part 5 (Security Operating Principles related to DSG compliance)
- Changes to the three unbreakable rules in Part 1

Everything else can be evolved by the team. This manual serves the engineers, not the other way around.

---

## Quick Reference — The Most Important Links

| Resource | Path |
|---|---|
| Product Backlog | `docs/execution/02_PRODUCT_BACKLOG.md` |
| Epic Breakdown (Tasks) | `docs/execution/03_EPIC_BREAKDOWN.md` |
| Definition of Done | `docs/execution/05_DEFINITION_OF_DONE.md` |
| Engineering Standards | `docs/execution/06_ENGINEERING_STANDARDS.md` |
| ADR Policy | `docs/execution/07_ADR_POLICY.md` |
| Technical Debt Register | `docs/execution/13_TECHNICAL_DEBT_REGISTER.md` |
| Weekly Roadmap | `docs/execution/14_EXECUTION_ROADMAP.md` |
| AI Engineering Guide | `docs/execution/10_AI_ENGINEERING_GUIDE.md` |
| Connector Guide | `docs/execution/11_CONNECTOR_GUIDE.md` |
| Agent Development Guide | `docs/execution/12_AGENT_DEVELOPMENT_GUIDE.md` |
| Enterprise Audit Report | `docs/enterprise-audit/reports/CTOVerdict.md` |
| Master Architecture | `docs/masterplan/MASTER_ARCHITECTURE_v3.md` |
| Environment Variables | `docs/architecture/43-production-environment-variables.md` |
| Production Runbook | `docs/prompts/07-production-operations-runbook.md` |
| Staging Smoke Tests | `docs/operations/staging-smoke-test-execution.md` |
