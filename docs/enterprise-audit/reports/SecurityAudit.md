# WAAI SaaS — Security Audit
**Audit Date:** 2026-06-30 | Evidence: Source code analysis  
**Framework:** OWASP Top 10 + Multi-tenant SaaS Security Checklist

---

## OWASP Top 10 Assessment

### A01 — Broken Access Control

**Database level: STRONG ✅**

Every table in all 9 migrations has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Verified table-by-table:

- `waai_profiles` — SELECT/UPDATE own record only
- `waai_workspaces` — member-scoped SELECT, admin-only UPDATE, owner-only DELETE
- `waai_workspace_members` — admin-gated INSERT/UPDATE/DELETE
- `waai_subscriptions` — member SELECT, service_role + admin for mutations
- `waai_usage_counters` — admin SELECT, service_role mutations only
- `waai_audit_logs` — admin SELECT, authenticated INSERT, **no UPDATE/DELETE** ✅
- `waai_knowledge_documents` — member SELECT, agent_manager+ mutations
- `waai_knowledge_chunks` — member SELECT, agent_manager+ mutations
- `waai_billing_events` — owner/admin SELECT, **service_role INSERT only** ✅
- `waai_ai_cost_snapshots` — owner/admin SELECT, service_role INSERT only

**RLS helper functions** use `SECURITY DEFINER SET search_path = public` (injection-safe):
- `waai_is_workspace_member(uuid)` ✅
- `waai_get_workspace_role(uuid)` ✅
- `waai_is_workspace_admin(uuid)` ✅

**API level: ADEQUATE**

`AgentRuntimeService.processMessage()` explicitly validates:
```typescript
// L110-112: agent-runtime-service.ts
const agent = await this.agentRepo.findById(input.agentId);
if (!agent || agent.workspace_id !== input.workspaceId) {
  return { error: "Agente no encontrado.", code: "AGENT_NOT_FOUND" };
}
```

**Gap: No HTTP-level rate limiting.** An authenticated user can call `/api/agents` or `/api/conversations` at unlimited throughput. No Redis-based or in-memory rate limiter found in middleware or route handlers.

**Gap: Middleware does not inject tenant context headers.** Each API route must independently resolve workspace ownership from the session. No systematic enforcement.

---

### A02 — Cryptographic Failures

**Secrets in transport:** All API communication uses HTTPS (Vercel enforced). ✅

**Secrets at rest:**
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never in `NEXT_PUBLIC_*` ✅
- `ANTHROPIC_API_KEY` — server-only ✅
- `STRIPE_SECRET_KEY` — not yet in use (stub)
- `ENCRYPTION_KEY` — defined in `.env.example` for "encrypting WhatsApp tokens at rest" but **no encryption usage found in source code**. The `waai_whatsapp_connections` table stores credentials; no `encryptField()` call was found. **Evidence:** `ENCRYPTION_KEY` env var exists but no crypto usage in `whatsapp-connection-service.ts` or `whatsapp-connection-repository.ts`. **Risk: WhatsApp tokens stored in plaintext.**

**Webhook signature verification (Whapi.cloud):**
```typescript
// whapi-cloud-provider.ts:53-57
const incomingToken = input.headers["x-whapi-token"] ?? "";
if (!incomingToken || incomingToken !== this.token) {
  return { valid: false };
}
```
This is **plain string equality**, not HMAC-SHA256. An attacker who guesses or intercepts the token could forge webhook events. Industry standard is HMAC-SHA256 (e.g., Stripe webhook verification). Risk: Medium.

**Meta webhook verification:** GET handler in `/api/webhooks/whatsapp/route.ts` verifies `hub.verify_token` correctly. ✅

---

### A03 — Injection

**SQL Injection:** Not applicable — all queries via Supabase SDK with parameterized bindings. ✅

**Prompt Injection:** `agent-runtime-service.ts` injects user input directly into LLM messages. No sanitization of user content before sending to Claude. This is expected behavior for a chat platform but should be documented. RAG knowledge instructions include `"NO reveles IDs internos"` — good defensive prompting. ✅

**No `eval()`, `Function()`, or dynamic code execution found.** ✅

---

### A05 — Security Misconfiguration

**Critical Gap: No HTTP Security Headers.**

`next.config.ts` is empty:
```typescript
// next.config.ts
const nextConfig: NextConfig = {};
export default nextConfig;
```

Missing:
- `Content-Security-Policy` — XSS protection
- `Strict-Transport-Security` — HSTS
- `X-Frame-Options` — Clickjacking prevention
- `X-Content-Type-Options` — MIME sniffing prevention
- `Referrer-Policy` — Information leakage
- `Permissions-Policy` — Feature policy

This is a blocker for enterprise security review and most SOC2-adjacent compliance programs.

---

### A06 — Vulnerable and Outdated Components

**Dependency versions (from `package.json`):**
- `@anthropic-ai/sdk`: `^0.102.0` — recent ✅
- `next`: `16.2.7` — latest ✅
- `@supabase/ssr`: `^0.10.3` — recent ✅
- `zod`: `^4.4.3` — latest v4 ✅
- `react`: `19.2.4` — latest ✅
- `openai`: `^6.42.0` — recent ✅

**Not verified:** No `npm audit` run in this session. **Cannot certify zero vulnerabilities.** Runtime verification required.

---

### A07 — Identification and Authentication Failures

**Gap: No password reset flow.**  
`src/server/services/auth.service.ts` has `signUp()`, `signIn()`, `signOut()` but no `resetPassword()`. No reset page exists in `src/app/(auth)/`. A user who loses their password is permanently locked out.

**Gap: No MFA/2FA.** Supabase Auth supports TOTP/SMS MFA but it is not configured or offered in the UI.

**Gap: No brute-force protection** at application level. Supabase Auth has built-in rate limiting on sign-in attempts, but this is invisible from application code.

**Session management:** Supabase session cookies handled by `@supabase/ssr` with secure defaults. ✅

---

### A09 — Security Logging and Monitoring Failures

**Audit logs:** Immutable, workspace-scoped, covers: `workspace.created`, agent lifecycle events (inferred from use cases). ✅

**Secret redaction in logs:**
```typescript
// src/lib/security/redact-secrets.ts
// Patterns: token, secret, password, credential, api_key, auth, private_key, access_key
// Value prefixes: sk-, pk-, whsec_, EAA, Bearer, sk-ant-, supabase
// PII: phone numbers masked to last 4, email local part redacted
```
Comprehensive and correct. ✅

**Gap: Sentry DSN empty.** Both `.env.example` and `.env.staging.example` have `SENTRY_DSN=` empty. No error tracking in production. Silent failures go undetected.

**Gap: No alerting.** No PagerDuty, Opsgenie, or similar integration found.

---

## Multi-Tenant Isolation Assessment

| Check | Status | Evidence |
|---|---|---|
| RLS on all tables | ✅ Verified | All 9 migrations |
| Workspace ID validated at service layer | ✅ Verified | `agent-runtime-service.ts:111` |
| Service role used only for webhooks and internal RPCs | ✅ | `webhooks/whatsapp/route.ts` |
| Cross-workspace data leak via RPC | ✅ Protected | `waai_match_agent_knowledge` filters by `match_workspace_id` |
| Billing scoped per workspace | ✅ | All billing queries use `workspace_id` |

---

## Security Risk Summary

| Finding | Severity | OWASP |
|---|---|---|
| No HTTP security headers | 🔴 Critical | A05 |
| WhatsApp tokens stored without encryption | 🔴 High | A02 |
| No password reset | 🔴 High | A07 |
| No HTTP rate limiting | 🟠 Medium | A01 |
| Webhook verification via token equality, not HMAC | 🟠 Medium | A02 |
| No Sentry / error monitoring | 🟠 Medium | A09 |
| No MFA support | 🟡 Low-Medium | A07 |
| npm audit not run | 🟡 Not Verified | A06 |
