# WAAI SaaS — Enterprise Roadmap
**Audit Date:** 2026-06-30 | Prioritized by revenue impact and risk

---

## Priority Framework

- 🔴 **P0 — Blockers:** Must be resolved before any paid launch
- 🟠 **P1 — High:** Required for enterprise viability and security compliance
- 🟡 **P2 — Medium:** Strongly recommended for retention and scale
- 🟢 **P3 — Low:** Quality improvements and future growth

---

## Phase 9 — Revenue & Security Unblocking (Immediate)
**Target: 2–4 weeks**

### P0-1: Implement Stripe Checkout & Subscription Management

**Current state:** `StripeReadinessService` is a stub. `isEnabled()` always returns false. No revenue is collectible.

**Required work:**
1. Install and configure `stripe` npm package
2. Implement `createCheckoutSession(workspaceId, planId)` returning Stripe Checkout URL
3. Create `/api/webhooks/stripe` route to handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Update `waai_subscriptions` on successful payment
5. Implement billing portal session (`createBillingPortalSession`)
6. Wire `STRIPE_PRICE_STARTER/PRO/AGENCY` env vars to checkout
7. Surface Upgrade CTA in dashboard when approaching plan limits

**Infrastructure already in place:** `stripe_customer_id`, `stripe_subscription_id` columns in `waai_subscriptions`. `waai_billing_events` table with idempotency. `waai_log_billing_event` RPC. `BillingEnforcementService` ready to enforce.

---

### P0-2: Implement Meta Cloud API WhatsApp Provider

**Current state:** Recent commits merged UI for Meta Cloud API connection. Factory has no `"meta"` case. `MetaCloudApiProvider` class does not exist.

**Required work:**
1. Create `src/lib/whatsapp/meta-cloud-api-provider.ts` implementing `WhatsAppProvider`
2. Add `sendTextMessage()` using `graph.facebook.com/v19.0/{phone_number_id}/messages`
3. Add HMAC-SHA256 webhook verification using `META_APP_SECRET` + `x-hub-signature-256` header
4. Add `normalizeIncomingMessage()` for Meta payload format
5. Add `"meta"` case to `whatsapp-provider-factory.ts`
6. Test with staging Meta App (sandbox mode)

**ADR reference:** ADR-0007 documents the migration intent.

---

### P0-3: Add HTTP Security Headers

**Current state:** `next.config.ts` is empty. No security headers served.

**Required work:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "default-src 'self'; ..." },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
```

**Effort:** 1 day.

---

### P0-4: Password Reset Flow

**Current state:** No `resetPassword()` in `AuthService`. No UI page.

**Required work:**
1. Add `src/app/(auth)/forgot-password/page.tsx`
2. Add `src/app/(auth)/reset-password/page.tsx`
3. Add `resetPassword(email)` to `AuthService` using `supabase.auth.resetPasswordForEmail()`
4. Add `updatePassword(password)` using `supabase.auth.updateUser()`
5. Handle Supabase email template for password reset

**Effort:** 1–2 days.

---

## Phase 10 — Security & Reliability (Month 2)

### P1-1: Wire AI Cost Tracking in Runtime

**Current state:** `AiCostService.estimateCost()` exists but not called from `AgentRuntimeService`.

**Fix:**
```typescript
// agent-runtime-service.ts — after llmOutput received
const costService = new AiCostService();
const costEstimate = costService.estimateCost(
  llmOutput.model,
  llmOutput.inputTokens,
  llmOutput.outputTokens
);
// Pass to runRepo.create():
estimatedCostCents: costEstimate.estimated_cost_cents,
```

**Effort:** 30 minutes. High impact on billing analytics.

---

### P1-2: Add HTTP Rate Limiting

**Options:**
- Vercel KV + `@upstash/ratelimit` (recommended for Vercel deployment)
- In-memory LRU cache (not distributed — single instance only)

Apply to: `/api/agents`, `/api/knowledge/documents`, `/api/whatsapp/simulate`, sandbox message endpoint.

**Effort:** 1–2 days.

---

### P1-3: Activate Error Tracking (Sentry)

**Current state:** `SENTRY_DSN=` empty in both env files.

**Required work:**
1. `npm install @sentry/nextjs`
2. Run `npx @sentry/wizard@latest -i nextjs`
3. Set `SENTRY_DSN` in Vercel environment
4. Add `Sentry.captureException(err)` in top-level error boundaries and catch blocks
5. Set up alert rules for `CLAUDE_ERROR`, `webhook_failed`, `embedding_error`

**Effort:** 1 day.

---

### P1-4: Encrypt WhatsApp Tokens at Rest

**Current state:** `ENCRYPTION_KEY` env var defined but no encryption usage found.

**Required work:**
1. Implement `encryptField(value: string): string` and `decryptField(value: string): string` using `crypto.createCipheriv('aes-256-gcm', ...)`
2. Encrypt `access_token` / `credentials` in `waai_whatsapp_connections` before insert
3. Decrypt before use in `WhapiCloudProvider` / `MetaCloudApiProvider`

**Effort:** 1–2 days.

---

### P1-5: Add CI Quality Gates

**Current state:** `deploy-production.yml` only runs `vercel build` + `vercel deploy`. No test, no type-check, no lint.

**Add to CI pipeline:**
```yaml
- name: Type check
  run: npx tsc --noEmit

- name: Lint
  run: npm run lint
```

**Longer term:** Add `vitest` or `jest` test suite.

---

### P1-6: User Invitation System

**Current state:** `invited_by` column exists in `waai_workspace_members`. No invite flow.

**Required work:**
1. Create `waai_workspace_invitations` table (email, token, role, expires_at, used_at)
2. POST `/api/workspaces/invite` — creates invitation, sends email via Resend/SendGrid
3. GET `/api/workspaces/accept-invite?token=...` — validates token, creates user if needed, adds member
4. UI in `/dashboard/settings/team/`

---

## Phase 11 — Enterprise Features (Month 3–4)

### P2-1: AI Response Streaming

Add streaming to sandbox and WhatsApp conversations:
- Use `client.messages.stream()` in `AnthropicClaudeProvider`
- Return `ReadableStream` from API route
- SSE or chunked response consumed by frontend

### P2-2: LLM Multi-Provider Routing

Make `createLLMProvider()` read from `LLM_PROVIDER` env var:
```typescript
case "openai": return new OpenAIGPTProvider();
case "azure": return new AzureOpenAIProvider();
default: return new AnthropicClaudeProvider();
```

### P2-3: Retry Logic for Anthropic API

Add exponential backoff on `529 Overloaded` and `500` responses:
- Max 3 attempts
- 1s, 2s, 4s backoff
- Log retry attempts to observability

### P2-4: HNSW Index for pgvector

Replace IVFFlat with HNSW for better recall without periodic reindex:
```sql
DROP INDEX idx_waai_knowledge_chunks_embedding;
CREATE INDEX idx_waai_knowledge_chunks_embedding_hnsw
  ON public.waai_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
```

### P2-5: pg_cron Maintenance Jobs

- Reset monthly usage counters at month boundary
- IVFFlat `REINDEX CONCURRENTLY` weekly
- Archive old `waai_webhook_events` (> 90 days)

### P2-6: Multiple Workspaces per User

Remove single-workspace constraint for enterprise plans. Add workspace switcher to nav.

---

## WAAI v3 Vision (6–12 months)

| Feature | Description |
|---|---|
| Multi-channel | Email, Instagram DM, Telegram in addition to WhatsApp |
| Agent marketplace | Publish agent templates, share across workspaces |
| White-label | Custom domain, branding, logo per workspace |
| SSO / SAML | Enterprise identity (Okta, Azure AD, Google Workspace) |
| Autonomous agents | Proactive outreach, follow-up sequences, appointment booking |
| A/B prompt testing | Compare prompt versions with real traffic |
| SLA guarantees | 99.9% uptime SLA with dedicated infrastructure |
| EU/Swiss data residency | Supabase EU region, GDPR/DSG compliance certification |
| Audit export | Downloadable audit log for enterprise compliance |
| Zapier / Make integration | No-code workflow triggers from WAAI events |

---

## Effort Summary

| Phase | Effort | Revenue Impact |
|---|---|---|
| Phase 9 (P0 blockers) | 2–4 weeks | Unlocks all revenue |
| Phase 10 (P1 security/reliability) | 4–6 weeks | Unlocks enterprise sales |
| Phase 11 (P2 features) | 6–8 weeks | Improves retention and ARPU |
| v3 Vision | 6–12 months | Market expansion |
