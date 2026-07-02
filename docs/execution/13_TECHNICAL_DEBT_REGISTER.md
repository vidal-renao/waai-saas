# WAAI — Technical Debt Register
**Document Type:** Engineering Reference  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Active — reviewed monthly  
**Source:** Enterprise CTO Audit (CTOVerdict.md, BackendAudit.md, AIAudit.md, FrontendAudit.md)

---

## Register Policy

Technical debt is recorded, not hidden. Every item has:
- A unique debt ID
- The source (where it was discovered)
- The risk if not fixed
- The estimated fix effort
- The target phase
- A linked backlog task

Debt is not shameful. Untracked debt is.

---

## Critical Debt (P0 — Revenue/Security Blocking)

---

### DEBT-001 — `AiCostService` Not Wired to `AgentRuntimeService`

**Discovery:** Enterprise AI Audit (AIAudit.md)  
**Location:** `src/server/services/agent-runtime-service.ts`  
**Current State:** `AiCostService` exists. Pricing table is correct. But it is never called after an LLM response. `estimated_cost_cents` is always `null` in `waai_agent_runs`.  
**Risk:** Every AI dollar spent is invisible. Cannot bill customers for AI usage. Cannot detect runaway costs. Cannot enforce per-workspace AI budgets.  
**Effort:** XS (30 minutes — wire the existing service)  
**Fix:** After LLM response in `AgentRuntimeService`, call `AiCostService.recordCost(...)`. See TASK-001.4.1.1.  
**Target Phase:** A — Week 1  
**Status:** Open

---

### DEBT-002 — WhatsApp API Token Stored in Plaintext

**Discovery:** Enterprise Security Audit (SecurityAudit.md)  
**Location:** `waai_whatsapp_connections.token` column  
**Current State:** `ENCRYPTION_KEY` environment variable is defined in `.env.example` but `src/lib/security/` has no encryption implementation. Tokens written to Supabase as plaintext.  
**Risk:** If Supabase database is compromised, all customer WhatsApp API tokens are exposed. Customer accounts hijacked. Regulatory liability under DSG Article 8.  
**Effort:** S (1–2 days — implement AES-256-GCM + one-time migration)  
**Fix:** Implement `src/lib/security/encryption.ts`, encrypt on write, decrypt on read. Migration script for existing tokens. See TASK-001.9.1.1–4.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-003 — No Retry Logic on Anthropic API Calls

**Discovery:** Enterprise Backend Audit (BackendAudit.md)  
**Location:** `src/lib/llm/anthropic-claude-provider.ts`  
**Current State:** Single API call. No retry. A `529 Overloaded` or `429 Rate Limited` response from Anthropic causes an unhandled exception, which results in a failed agent run visible to the end user.  
**Risk:** Anthropic `529` is common under burst load. Users see failures during peak hours. Churn risk.  
**Effort:** S (1 day — add retry wrapper with exponential backoff)  
**Fix:** Implement retry wrapper. See TASK-001.8.1.1. Retry on 429, 529, 500, 503 with delays `[1000, 2000, 4000]ms`.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-004 — Stripe Implementation is a Stub

**Discovery:** Enterprise Backend Audit + CTOVerdict.md  
**Location:** `src/app/api/billing/costs/route.ts`, `src/app/api/billing/readiness/route.ts`, `src/app/api/billing/usage/route.ts`  
**Current State:** All three billing endpoints return mock data. No Stripe integration. `waai_subscriptions` cannot be activated programmatically.  
**Risk:** Zero revenue is collectible. The product cannot survive without this.  
**Effort:** L (2 weeks — Stripe checkout + webhook + portal)  
**Fix:** Full Stripe implementation. See FEAT-001.2 and TASK-001.2.*.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-005 — MetaCloudApiProvider Does Not Exist

**Discovery:** Enterprise Backend Audit + CTOVerdict.md  
**Location:** `src/lib/whatsapp/whatsapp-provider-factory.ts` — `meta` case unimplemented  
**Current State:** The product claims to support Meta WhatsApp Business API. The implementation is Whapi only. The `meta` case in the factory throws an error.  
**Risk:** Enterprise customers requesting Meta API support cannot be onboarded. The product's primary channel claim has no backend.  
**Effort:** M (1 week — full provider implementation)  
**Fix:** Implement `MetaCloudApiProvider`. See FEAT-001.3 and TASK-001.3.1.*.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-006 — HTTP Security Headers Not Configured

**Discovery:** Enterprise Frontend Audit + CTOVerdict.md  
**Location:** `next.config.ts` (empty)  
**Current State:** `next.config.ts` contains no configuration. No HTTP security headers are set. securityheaders.com would return F grade.  
**Risk:** Blocks every enterprise security review. XSS, clickjacking, MIME sniffing vulnerabilities. Cannot pass enterprise procurement security scans.  
**Effort:** XS (< 4 hours)  
**Fix:** Implement `headers()` function in `next.config.ts`. See TASK-001.1.1.1.  
**Target Phase:** A — Week 1  
**Status:** Open

---

### DEBT-007 — Password Reset Flow Missing

**Discovery:** Enterprise Frontend Audit  
**Location:** `src/app/(auth)/` — no forgot-password or reset-password page  
**Current State:** Users who forget their password have no self-service recovery path. Support intervention required for every locked account.  
**Risk:** Cannot launch a SaaS product without password reset. Immediate support burden.  
**Effort:** S (1–2 days)  
**Fix:** Implement forgot-password and reset-password pages. See FEAT-001.5 and TASK-001.5.1.*.  
**Target Phase:** A — Week 1  
**Status:** Open

---

## High Debt (P1 — Significant Risk)

---

### DEBT-008 — Sentry DSN Not Set in Production

**Discovery:** Enterprise Backend Audit  
**Location:** Vercel environment variables  
**Current State:** `SENTRY_DSN` is not set. All production exceptions are silent. No error rate visibility.  
**Risk:** Flying blind in production. Cannot detect regressions after deployment.  
**Effort:** XS (1 day including integration)  
**Fix:** Set `SENTRY_DSN` in Vercel. Add `Sentry.captureException()` to all catch blocks. See FEAT-001.6.  
**Target Phase:** A — Week 3  
**Status:** Open

---

### DEBT-009 — Two Parallel Message-Limit Check Paths

**Discovery:** Enterprise Backend Audit (BackendAudit.md)  
**Location:** Both the service layer and `waai_check_message_limit` RPC evaluate plan limits  
**Current State:** Plan limit enforcement happens in two places: `PlanEnforcementService` in the service layer AND a Supabase RPC (`waai_check_message_limit`). They can diverge.  
**Risk:** Minor inconsistency risk. One path could allow messages that the other would block.  
**Effort:** S (1–2 days — consolidate to RPC path)  
**Fix:** Remove service-layer check. Route all limit checks through the Supabase RPC.  
**Target Phase:** A — Week 4  
**Status:** Open

---

### DEBT-010 — Workspace Resolution Per-Route

**Discovery:** Enterprise Backend Audit  
**Location:** Multiple route handlers re-resolve workspace from user session  
**Current State:** Every API route independently resolves the workspace ID from the authenticated user. This is duplicated logic that can produce inconsistent results.  
**Risk:** Logic drift between routes. One route returns 403 where another returns 404 for the same condition.  
**Effort:** S (1–2 days — extract to middleware)  
**Fix:** Create workspace resolution middleware that injects `workspaceContext` into request. Applied once in `middleware.ts`.  
**Target Phase:** B — Month 2  
**Status:** Open

---

### DEBT-011 — PgBouncer Connection Pooler Not Enabled

**Discovery:** Enterprise Backend Audit + Scalability Plan  
**Location:** Supabase dashboard configuration  
**Current State:** Direct Postgres connections used. Supabase free/pro default: 60 max connections. At 100 customers with bursts, this is a ceiling.  
**Risk:** Connection exhaustion at 100 concurrent users. Causes 503 errors for all users.  
**Effort:** XS (< 1 hour — configuration only, no code changes)  
**Fix:** Enable PgBouncer in Supabase dashboard. Change connection string port from 5432 to 6543. See TASK Phase A.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-012 — Anthropic Prompt Caching Not Activated

**Discovery:** Enterprise AI Audit + ADR-0004  
**Location:** ADR-0004 documents this decision was made but never implemented. `src/lib/llm/anthropic-claude-provider.ts`  
**Current State:** System prompt sent in full on every API call. No `cache_control: { type: "ephemeral" }` applied.  
**Risk:** 2–5x higher Anthropic API costs than necessary. At scale, this is thousands of dollars per month wasted.  
**Effort:** S (1 day — add `cache_control` to system message)  
**Fix:** Add `cache_control: { type: "ephemeral" }` to Layer 1 of prompt assembly. See TASK-001.16.  
**Target Phase:** A — Week 2  
**Status:** Open

---

### DEBT-013 — pg_cron Monthly Counter Reset Not Configured

**Discovery:** Enterprise Backend Audit  
**Location:** Supabase database scheduled jobs  
**Current State:** `waai_workspace_usage` monthly message counter is never reset. Free users exhaust their 50 messages in month 1 and can never send again.  
**Risk:** Free users permanently locked after first month. Prevents organic growth and upgrade conversion.  
**Effort:** S (1 day — pg_cron configuration)  
**Fix:** Configure pg_cron to reset `messages_used_this_month` on the 1st of each month.  
**Target Phase:** A — Week 2  
**Status:** Open

---

## Medium Debt (P2 — Accumulating Risk)

---

### DEBT-014 — IVFFlat pgvector Index Will Not Scale

**Discovery:** Enterprise Database Audit  
**Location:** `waai_knowledge_chunks` index  
**Current State:** IVFFlat index with `lists=100`. Requires periodic `VACUUM ANALYZE` to maintain accuracy as vectors are added. At > 100k vectors, rebuild becomes expensive.  
**Risk:** RAG retrieval quality degrades gradually as knowledge base grows. Expensive index rebuild required during peak hours.  
**Effort:** S (migration via `CREATE INDEX CONCURRENTLY`)  
**Fix:** Migrate to HNSW index (`m=16, ef_construction=64`). No data loss, no downtime with `CONCURRENTLY`. See SCALABILITY_PLAN.md Tier 3.  
**Target Phase:** B (when knowledge bases approach 100k vectors)  
**Status:** Open — no urgency until volume warrants

---

### DEBT-015 — `/api/health` Reports Wrong Version

**Discovery:** Enterprise Backend Audit  
**Location:** `src/app/api/health/route.ts`  
**Current State:** `version: '0.8.0'` hardcoded. Current product version is `0.9.0`. Version string used by monitors.  
**Risk:** Low. Monitor confusion. Misleads ops team.  
**Effort:** XS (30 minutes — read from `package.json`)  
**Fix:** Import `version` from `package.json` at module load time. Never hardcode.  
**Target Phase:** A — Week 1  
**Status:** Open

---

### DEBT-016 — No Rate Limiting on AI-Consuming Routes

**Discovery:** Enterprise Backend Audit  
**Location:** `src/app/api/agents/[agentId]/sandbox/message/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`  
**Current State:** No rate limiting. A single malicious user can trigger unlimited Anthropic API calls.  
**Risk:** AI cost spike from abuse or buggy client. Anthropic rate limit triggers for all workspaces.  
**Effort:** S (1–2 days — Upstash Rate Limit middleware)  
**Fix:** Add `@upstash/ratelimit` middleware on sandbox and webhook routes. Per-user: 10 req/min. Per-workspace: 100 req/min.  
**Target Phase:** A — Week 3–4  
**Status:** Open

---

### DEBT-017 — No Streaming SSE

**Discovery:** Enterprise Frontend Audit  
**Location:** `src/app/api/agents/[agentId]/sandbox/message/route.ts`  
**Current State:** Agent responses wait for full LLM completion before sending to browser. Users wait 3–8 seconds with no feedback.  
**Risk:** Poor UX. Enterprise evaluators notice this immediately.  
**Effort:** M (1 week — SSE implementation across LLM provider + route + frontend)  
**Fix:** Implement streaming SSE. See FEAT-002.11.  
**Target Phase:** B  
**Status:** Open

---

### DEBT-018 — CI Pipeline Has No Test or Type-Check Steps

**Discovery:** Enterprise Backend Audit  
**Location:** GitHub Actions / Vercel CI configuration  
**Current State:** Deploys can reach production with TypeScript errors or failing lints.  
**Risk:** Type regressions reach production. Confidence in CI is low.  
**Effort:** XS (1 day — add steps to existing CI)  
**Fix:** Add `tsc --noEmit` and `next lint` to CI. Set branch protection. See TASK-001.7.1.*.  
**Target Phase:** A — Week 1  
**Status:** Open

---

## Debt Summary Table

| ID | Description | Priority | Effort | Phase | Status |
|---|---|---|---|---|---|
| DEBT-001 | AiCostService not wired | P0 | XS | A | Open |
| DEBT-002 | WhatsApp token plaintext | P0 | S | A | Open |
| DEBT-003 | No Anthropic retry logic | P0 | S | A | Open |
| DEBT-004 | Stripe is a stub | P0 | L | A | Open |
| DEBT-005 | MetaCloudApiProvider missing | P0 | M | A | Open |
| DEBT-006 | No security headers | P0 | XS | A | Open |
| DEBT-007 | No password reset | P0 | S | A | Open |
| DEBT-008 | Sentry not in production | P1 | XS | A | Open |
| DEBT-009 | Dual limit check paths | P1 | S | A | Open |
| DEBT-010 | Workspace re-resolved per-route | P1 | S | B | Open |
| DEBT-011 | PgBouncer not enabled | P1 | XS | A | Open |
| DEBT-012 | Prompt caching not activated | P1 | S | A | Open |
| DEBT-013 | pg_cron not configured | P1 | S | A | Open |
| DEBT-014 | IVFFlat will not scale | P2 | S | B | Open |
| DEBT-015 | Health endpoint wrong version | P2 | XS | A | Open |
| DEBT-016 | No rate limiting | P2 | S | A | Open |
| DEBT-017 | No streaming SSE | P2 | M | B | Open |
| DEBT-018 | CI no type-check | P1 | XS | A | Open |

**Total debt items:** 18  
**P0 (critical):** 7  
**P1 (high):** 7  
**P2 (medium):** 4

All 7 P0 items are addressed in Phase A. Phase A is not optional.
