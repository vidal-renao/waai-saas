# WAAI — Execution Masterplan
**Document Type:** Engineering Governance  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Owned by:** CTO Office

---

## 1. Engineering Mission

WAAI is an enterprise AI Agent Operating System for WhatsApp-first, approval-gated, Swiss DSG-compliant business automation. The engineering mission is to ship a platform that enterprise customers trust with their most sensitive customer conversations — reliably, securely, and at scale.

Every line of code serves one of three outcomes:
1. Revenue (enables payment, enables enterprise sale)
2. Trust (security, compliance, observability, reliability)
3. Leverage (platform capability that unlocks multiple product features)

Anything that serves none of these three outcomes is not a priority.

---

## 2. Engineering Philosophy

### 2.1 Foundation First

The existing architecture (18 months of clean engineering) is treated as an asset. The 30+ repositories, 46 use cases, 30 services, provider abstractions (ADR-0003, ADR-0004, ADR-0005), RLS policies, and audit logs are never replaced without a migration plan. Evolution, not revolution.

### 2.2 Fix Before Build

No new features are started while P0 defects are open. The current P0 list is:
- `next.config.ts` empty (security headers missing)
- `AiCostService` not wired to `AgentRuntimeService`
- Stripe not implemented (`src/app/api/billing/` is stub)
- MetaCloudApiProvider does not exist
- Password reset flow missing

These block every enterprise evaluation and every revenue collection. They are resolved in Phase A before any Phase B work begins.

### 2.3 Revenue Before Features

Features are prioritised by their proximity to revenue. The sequence is:
1. Can we collect payment? (Stripe)
2. Can the primary channel work? (Meta WhatsApp)
3. Can security reviewers approve us? (security headers)
4. Can enterprise customers adopt us? (SSO, SCIM, API keys)
5. Can we differentiate our AI? (Agent v3, Memory, Policies)

### 2.4 Clean Architecture — Non-Negotiable

The existing layer separation is enforced:

```
Route Handler (HTTP boundary)
    ↓
Use Case (orchestration, no DB access)
    ↓
Service (domain logic)
    ↓
Repository (Supabase queries only)
    ↓
Provider (external API abstraction)
```

No Route Handler touches a repository directly. No repository contains business logic. No service knows about HTTP request/response shapes. Violations are caught in code review and must be corrected before merge.

### 2.5 TypeScript Strict Mode

`strict: true` in `tsconfig.json` is a hard constraint. No `any`. No `as unknown as X`. No `@ts-ignore` without an accompanying comment explaining the unavoidable reason.

### 2.6 Test the Contract, Not the Implementation

Tests must assert observable behaviour (API response shapes, database state, external API calls made), not internal implementation details. A refactor that passes all tests without changing behaviour is a correct refactor.

### 2.7 Observe Before Optimise

No performance optimisation is made without a measured baseline. Sentry, Supabase metrics, and Vercel analytics must show the bottleneck before any engineering effort is directed at it. Do not guess.

---

## 3. Delivery Strategy

### 3.1 Phase-Based Delivery

WAAI uses phase-based delivery with explicit acceptance criteria gates between phases. No phase begins until the previous phase's acceptance criteria are 100% verified in production (or staging for internal phases).

| Phase | Duration | Theme | Gate Criteria |
|---|---|---|---|
| A | 4 weeks | Stabilisation | Stripe E2E, Meta webhook, security headers, Sentry live |
| B | 6 weeks | Enterprise Foundations | SSO E2E, API keys, org model, 50 unit tests |
| C | 8 weeks | Agent Platform v3 | Policy enforcement, versioning rollback, approvals, memory |
| D | 8 weeks | Workflow Platform | Visual editor, DAG execution, Inngest jobs |
| E | 6 weeks | Connector Platform | Email + Telegram + HubSpot + Calendar |
| F | 6 weeks | Enterprise GA | SCIM, Teams, Slack, Salesforce, ISO 27001 readiness |
| G | 12 weeks | AI Operating System | Multi-agent, MCP Server, public API, SDK |

### 3.2 Weekly Cadence

| Day | Activity |
|---|---|
| Monday | Sprint planning (2 hours) — review backlog, commit to week's work |
| Daily | Async standup in writing — what shipped, what's blocked, nothing else |
| Thursday | Architecture sync (30 min) — ADR proposals, cross-feature design decisions |
| Friday | Demo + retrospective — show working software in staging |

### 3.3 Two-Track Development

**Track 1 — Product Track:** Feature delivery against the phase roadmap.  
**Track 2 — Platform Track:** Technical debt, observability, security, performance.

Platform Track gets 20% of engineering capacity every sprint. This is not negotiable. Deferred platform work becomes production incidents.

### 3.4 Branch Strategy

```
main ─────────────────────────────────── (production, protected)
  └── release/phase-a ─────────────────── (phase integration branch)
        └── feat/stripe-checkout ─────── (feature branch, 1 engineer, max 5 days)
        └── feat/meta-cloud-provider ─── (feature branch)
        └── fix/cost-service-wiring ──── (fix branch, max 1 day)
```

Rules:
- `main` accepts only PR merges from `release/*` branches
- `release/*` branches accept only PR merges from `feat/*` or `fix/*` branches
- Feature branches live for at most 5 working days; longer = branch must be split
- Hotfixes branch directly from `main` and merge to both `main` and active `release/*`

---

## 4. Release Strategy

### 4.1 Semantic Versioning

`MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking API change (increment when public `/v1/` API contract changes)
- **MINOR**: New feature, backwards-compatible
- **PATCH**: Bug fix, security patch, dependency update

Current version: `0.9.0` (pre-revenue). Version `1.0.0` is declared when Phase A acceptance criteria are met and the first paying customer converts.

### 4.2 Release Cadence

- **Patches**: As needed (zero scheduled cadence — ship when fixed)
- **Minor releases**: End of each phase (approximately every 4–8 weeks)
- **Major releases**: At platform inflection points (v2.0 = Workflow Platform GA, v3.0 = AI OS)

### 4.3 Release Environments

```
Development (local)
    ↓ PR merge to release/*
Staging (Vercel preview, Supabase staging project)
    ↓ acceptance criteria verified
Production (Vercel production, Supabase production)
```

No code reaches production that has not been verified in staging.

---

## 5. Technical Governance

### 5.1 Architecture Review Board (ARB)

Composition: CTO (chair), Principal Architect, Head of Backend, Head of Frontend  
Meeting cadence: Thursday architecture sync + async ADR review  
Quorum: 3/4 members required for ADR approval

**ARB Jurisdiction:**
- Any new database table or schema change
- Any new provider abstraction or interface
- Any change to RLS policies
- Any addition to the 14-step `AgentRuntimeService` pipeline
- Any change that affects `waai_audit_logs` (the immutable ledger)
- Any new external API dependency
- Any change to authentication or authorisation flow

### 5.2 ADR Policy Summary

All ARB-jurisdiction decisions require an ADR. See `docs/execution/07_ADR_POLICY.md` for the full policy. ADRs use the template in `docs/adr/` and follow the numbering sequence (next: ADR-0008).

### 5.3 Security Review

Every PR that touches:
- Authentication (`src/lib/supabase/`, `src/app/auth/`)
- RLS policies (`supabase/migrations/`)
- Webhook handlers (`src/app/api/webhooks/`)
- Secret handling (`src/lib/security/redact-secrets.ts`)
- Any new external API call

...requires a security review checklist completion before merge. The checklist is defined in `docs/execution/05_DEFINITION_OF_DONE.md`.

### 5.4 Dependency Governance

All new `npm` dependencies must be approved by the tech lead. Criteria:
- Package has > 100k weekly downloads
- Package is actively maintained (last commit < 6 months)
- Package has no known critical CVEs
- Package does not duplicate an existing dependency's functionality

### 5.5 Incident Response

| Severity | Definition | Response Time | Owner |
|---|---|---|---|
| P1 (Critical) | Production down / data breach | 15 minutes | CTO |
| P2 (High) | Payment processing broken / auth broken | 1 hour | VP Engineering |
| P3 (Medium) | Feature broken for all users | 4 hours | Tech Lead |
| P4 (Low) | Feature degraded for some users | Next sprint | Team |

All P1/P2 incidents produce a post-mortem within 48 hours. Post-mortems are stored in `docs/incidents/`.

---

## 6. Risk Governance

### 6.1 Current Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Meta App approval delay (1–4 weeks) | HIGH | HIGH | Maintain Whapi as production path; sandbox Meta in parallel |
| Stripe go-live checklist failure | MEDIUM | HIGH | Complete checklist in `docs/architecture/40-stripe-readiness-plan.md` |
| Supabase connection exhaustion at 100 customers | HIGH | MEDIUM | Enable PgBouncer (Phase A13) — 1 config change |
| Anthropic API 529 overload (no retry) | HIGH | HIGH | Add exponential backoff (Phase A, Decision 15) |
| WhatsApp token plaintext at rest | HIGH | HIGH | Wire `ENCRYPTION_KEY` env var (Phase A9) |
| Single-workspace constraint blocks enterprise | HIGH | HIGH | Phase B2 removes constraint |

### 6.2 Architecture Risk Principles

1. **No single point of failure for the agent runtime.** All LLM calls have retry logic. All webhook handlers return 200 immediately and process async.
2. **RLS is the last line of defence.** Application-layer auth bugs cannot expose cross-tenant data if RLS is correct.
3. **Audit logs are immutable.** `waai_audit_logs` has INSERT-only RLS. No UPDATE, no DELETE, ever.
4. **Provider abstractions absorb external API risk.** If Whapi fails, we switch to Meta. If Anthropic is down, we route to Azure OpenAI. No business logic changes.

---

## 7. Engineering Principles Summary

| Principle | Rule |
|---|---|
| Architecture | Clean Architecture layers always. No exceptions. |
| Types | `strict: true`. No `any`. |
| Database | `waai_` prefix (ADR-0002). RLS on every table. |
| Providers | Interface-first (ADR-0003, ADR-0004, ADR-0005). No vendor lock-in. |
| Security | Validate at boundaries. Trust internal contracts. |
| Costs | Never ship new AI features without cost instrumentation. |
| Tests | Golden path E2E tests before launch. Unit tests on services. |
| Observability | Sentry on every catch block. Structured logging on every service. |
| Documentation | ADR for every architectural decision. README updated with every API change. |
