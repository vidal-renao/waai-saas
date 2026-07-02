# WAAI — Epic Breakdown
**Document Type:** Engineering Backlog  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Source:** 02_PRODUCT_BACKLOG.md + Master Architecture

> Scope: Phase A and Phase B broken down to task level.  
> Phase C–G stories are defined at feature level; task decomposition occurs in the sprint before each feature begins.

---

## EPIC-001 — Platform Stabilisation

---

### FEAT-001.1 — HTTP Security Headers

**Objective:** Add all mandatory HTTP security headers to every WAAI response.  
**File:** `waai-saas/next.config.ts` (currently empty)

#### Story 001.1.1 — Implement Security Headers in Next.js Config

**As a** platform engineer,  
**I want** all HTTP responses to include security headers,  
**so that** enterprise security scans and penetration tests pass without manual remediation.

**Acceptance Criteria:**
- `X-Content-Type-Options: nosniff` present on all responses
- `X-Frame-Options: DENY` present
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` present
- `Content-Security-Policy` blocks inline scripts and restricts frame ancestors
- `Referrer-Policy: strict-origin-when-cross-origin` present
- `Permissions-Policy` restricts camera, microphone, geolocation
- securityheaders.com scan returns A or B grade
- No existing functionality broken (verify with smoke test)

**Tasks:**
- [ ] **TASK-001.1.1.1** (2h): Write `headers()` function in `next.config.ts` with all six headers
- [ ] **TASK-001.1.1.2** (1h): Verify headers in browser DevTools against all major routes
- [ ] **TASK-001.1.1.3** (30min): Run securityheaders.com scan, document grade in PR description
- [ ] **TASK-001.1.1.4** (30min): Confirm Whapi webhook endpoint not broken by CSP

---

### FEAT-001.2 — Stripe Billing Implementation

**Objective:** Replace the stub billing API with a fully functional Stripe integration.  
**Existing stubs:** `src/app/api/billing/costs/route.ts`, `src/app/api/billing/readiness/route.ts`, `src/app/api/billing/usage/route.ts`  
**Reference:** `docs/architecture/40-stripe-readiness-plan.md`, `src/config/plans.ts`

#### Story 001.2.1 — Stripe Product and Price Configuration

**As a** billing engineer,  
**I want** Stripe products and prices to match the plan definitions in `src/config/plans.ts`,  
**so that** checkout sessions reference valid Stripe price IDs.

**Tasks:**
- [ ] **TASK-001.2.1.1** (2h): Create Stripe products and prices in test mode (Free, Starter CHF 49, Pro CHF 149, Agency CHF 299) matching `src/config/plans.ts`
- [ ] **TASK-001.2.1.2** (30min): Add `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_AGENCY` to `.env.example`
- [ ] **TASK-001.2.1.3** (1h): Add price ID constants to `src/config/plans.ts` alongside existing plan definitions

#### Story 001.2.2 — Stripe Checkout Session API

**As a** user on a free plan,  
**I want** to click "Upgrade" and be redirected to Stripe checkout,  
**so that** I can enter payment details and upgrade my plan.

**Tasks:**
- [ ] **TASK-001.2.2.1** (3h): Implement `POST /api/billing/checkout` route handler — create Stripe checkout session, return `{url}`
- [ ] **TASK-001.2.2.2** (2h): Add `CheckoutRepository` in `src/server/repositories/` for creating `waai_subscriptions` row in `pending` state
- [ ] **TASK-001.2.2.3** (1h): Add Zod validator `src/lib/validators/billing.ts` for checkout request
- [ ] **TASK-001.2.2.4** (2h): Build upgrade modal component in dashboard — calls checkout API, redirects to Stripe URL
- [ ] **TASK-001.2.2.5** (1h): Add success/cancel redirect pages (`/billing/success`, `/billing/cancel`)

#### Story 001.2.3 — Stripe Webhook Handler

**As a** billing system,  
**I want** Stripe events to update subscription state in the database,  
**so that** successful payments activate subscriptions without manual intervention.

**Tasks:**
- [ ] **TASK-001.2.3.1** (4h): Implement `POST /api/webhooks/stripe` route — verify `stripe-signature` header with `stripe.webhooks.constructEvent()`, handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] **TASK-001.2.3.2** (2h): Add `SubscriptionService` in `src/server/services/` with `activate()`, `update()`, `cancel()` methods
- [ ] **TASK-001.2.3.3** (2h): Add `SubscriptionRepository` with upsert operations on `waai_subscriptions`
- [ ] **TASK-001.2.3.4** (1h): Ensure webhook handler returns 200 immediately before processing (async idempotent)
- [ ] **TASK-001.2.3.5** (1h): Add `STRIPE_WEBHOOK_SECRET` to Vercel env vars. Document in `docs/architecture/43-production-environment-variables.md`

#### Story 001.2.4 — Billing Portal Access

**As a** paying customer,  
**I want** to access the Stripe billing portal from my account settings,  
**so that** I can update my payment method, view invoices, and cancel my subscription.

**Tasks:**
- [ ] **TASK-001.2.4.1** (2h): Implement `POST /api/billing/portal` — create Stripe Customer Portal session, return URL
- [ ] **TASK-001.2.4.2** (1h): Add "Manage Billing" link in account settings UI

---

### FEAT-001.3 — Meta WhatsApp Cloud API Provider

**Objective:** Implement `MetaCloudApiProvider` so WAAI can use the official Meta WhatsApp Business API in production.  
**Existing:** `src/lib/whatsapp/whapi-cloud-provider.ts` (reference), `src/lib/whatsapp/whatsapp-provider-factory.ts` (add `meta` case)  
**Reference:** `docs/adr/ADR-0003-whatsapp-provider-abstraction.md`

#### Story 001.3.1 — MetaCloudApiProvider Implementation

**Tasks:**
- [ ] **TASK-001.3.1.1** (2h): Create `src/lib/whatsapp/meta-cloud-api-provider.ts`, implement `WhatsappProvider` interface
- [ ] **TASK-001.3.1.2** (3h): Implement `sendTextMessage()` — POST to `https://graph.facebook.com/v19.0/{phone_number_id}/messages`
- [ ] **TASK-001.3.1.3** (2h): Implement `verifyWebhookSignature()` — HMAC-SHA256 with `X-Hub-Signature-256` header
- [ ] **TASK-001.3.1.4** (2h): Implement `parseWebhookPayload()` — extract message from Meta webhook JSON structure (differs from Whapi)
- [ ] **TASK-001.3.1.5** (1h): Implement `sendTemplateMessage()` — POST with `template` type body
- [ ] **TASK-001.3.1.6** (1h): Add `meta` case to `src/lib/whatsapp/whatsapp-provider-factory.ts`
- [ ] **TASK-001.3.1.7** (2h): Add `WHATSAPP_PROVIDER=meta`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN` to `.env.example`
- [ ] **TASK-001.3.1.8** (2h): Unit tests for `parseWebhookPayload()` with real Meta payload fixtures
- [ ] **TASK-001.3.1.9** (1h): Verify GET `/api/webhooks/whatsapp` returns Meta verify token for webhook registration

---

### FEAT-001.4 — AI Cost Service Wiring

**Objective:** Connect `AiCostService` to `AgentRuntimeService` so every AI call has measurable cost.  
**Existing:** `src/server/repositories/ai-cost-snapshots-repository.ts`, `AgentRuntimeService` in `src/server/services/`

#### Story 001.4.1 — Wire Cost Tracking into Agent Runtime Pipeline

**Tasks:**
- [ ] **TASK-001.4.1.1** (1h): Locate the `AgentRuntimeService.run()` method. After LLM response, call `AiCostService.recordCost({ workspaceId, agentId, model, inputTokens, outputTokens, estimatedCostCents })`
- [ ] **TASK-001.4.1.2** (30min): Verify `estimated_cost_cents` is non-null in `waai_agent_runs` after a sandbox message
- [ ] **TASK-001.4.1.3** (30min): Add `AiCostService` to Sentry breadcrumbs so cost is visible in error context

---

### FEAT-001.5 — Password Reset Flow

**Objective:** Allow users to reset their password via email.  
**Existing:** Supabase Auth supports password reset via `supabase.auth.resetPasswordForEmail()`

#### Story 001.5.1 — Password Reset Request + Confirm Pages

**Tasks:**
- [ ] **TASK-001.5.1.1** (2h): Create `src/app/(auth)/forgot-password/page.tsx` — email input form, calls `supabase.auth.resetPasswordForEmail()`
- [ ] **TASK-001.5.1.2** (2h): Create `src/app/(auth)/reset-password/page.tsx` — new password form, calls `supabase.auth.updateUser({ password })`
- [ ] **TASK-001.5.1.3** (1h): Add "Forgot password?" link on login page
- [ ] **TASK-001.5.1.4** (1h): Configure Supabase Auth email template for password reset (Supabase dashboard)
- [ ] **TASK-001.5.1.5** (30min): Test full flow: request email → click link → enter new password → login

---

### FEAT-001.6 — Sentry Error Tracking

#### Story 001.6.1 — Sentry Integration and Alert Rules

**Tasks:**
- [ ] **TASK-001.6.1.1** (2h): Install `@sentry/nextjs`. Run `npx @sentry/wizard@latest -i nextjs`. Configure `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- [ ] **TASK-001.6.1.2** (2h): Add `Sentry.captureException(err)` to every `catch` block in `src/server/services/`
- [ ] **TASK-001.6.1.3** (1h): Add Sentry `ErrorBoundary` to root layout
- [ ] **TASK-001.6.1.4** (1h): Set `SENTRY_DSN` in Vercel environment variables (all environments)
- [ ] **TASK-001.6.1.5** (1h): Create Sentry alert rules: `CLAUDE_ERROR_RATE > 5%`, `webhook_processing_failed`, `embedding_error`
- [ ] **TASK-001.6.1.6** (30min): Enable Sentry performance monitoring on `AgentRuntimeService.run()`

---

### FEAT-001.7 — CI Type-Check + Lint

#### Story 001.7.1 — Enforce TypeScript and ESLint in CI

**Tasks:**
- [ ] **TASK-001.7.1.1** (1h): Add `tsc --noEmit` step to GitHub Actions workflow (or Vercel CI)
- [ ] **TASK-001.7.1.2** (1h): Add `next lint` step to CI
- [ ] **TASK-001.7.1.3** (2h): Fix any existing TypeScript errors uncovered by CI run
- [ ] **TASK-001.7.1.4** (30min): Set branch protection rule: CI must pass before merge to `release/*`

---

### FEAT-001.8 — Anthropic Retry Logic

#### Story 001.8.1 — Exponential Backoff on Anthropic API Calls

**Tasks:**
- [ ] **TASK-001.8.1.1** (3h): Wrap Anthropic API call in `src/lib/llm/anthropic-claude-provider.ts` with retry loop: max 3 attempts, delays `[1000, 2000, 4000]ms`, retry on status 429, 529, 500, 503
- [ ] **TASK-001.8.1.2** (1h): Log each retry attempt with `Sentry.addBreadcrumb({ category: 'llm.retry', ... })`
- [ ] **TASK-001.8.1.3** (1h): Unit test: mock Anthropic to return 529 twice, succeed on third — verify provider returns success

---

### FEAT-001.9 — WhatsApp Token Encryption

#### Story 001.9.1 — Encrypt WhatsApp API Tokens at Rest

**Tasks:**
- [ ] **TASK-001.9.1.1** (2h): Implement AES-256-GCM encrypt/decrypt in `src/lib/security/encryption.ts` using `ENCRYPTION_KEY` env var
- [ ] **TASK-001.9.1.2** (2h): In `WhatsAppConnectionService`, encrypt token before INSERT, decrypt after SELECT
- [ ] **TASK-001.9.1.3** (2h): Write migration to re-encrypt existing plaintext tokens (one-time script, run in maintenance window)
- [ ] **TASK-001.9.1.4** (30min): Verify `ENCRYPTION_KEY` is 32 bytes (256 bits), documented in `docs/architecture/43-production-environment-variables.md`

---

## EPIC-002 — Enterprise Foundations (Selected Stories)

---

### FEAT-002.1 — Organization + Department Data Model

#### Story 002.1.1 — Create Org/Department Tables and Migrate Workspaces

**Tasks:**
- [ ] **TASK-002.1.1.1** (2h): Write Supabase migration: create `waai_organizations`, `waai_departments`, `waai_organization_members` (see `docs/masterplan/ENTERPRISE_PLATFORM.md` for exact SQL)
- [ ] **TASK-002.1.1.2** (2h): `ALTER TABLE waai_workspaces ADD COLUMN org_id uuid, ADD COLUMN department_id uuid` (nullable, backwards-compatible)
- [ ] **TASK-002.1.1.3** (2h): Add RLS policies to all three new tables (tenant isolation by org_id)
- [ ] **TASK-002.1.1.4** (1h): Add org repositories: `OrganizationRepository`, `DepartmentRepository`
- [ ] **TASK-002.1.1.5** (2h): Add use cases: `CreateOrganizationUseCase`, `CreateDepartmentUseCase`
- [ ] **TASK-002.1.1.6** (2h): Add route handlers: `POST /api/organizations`, `GET /api/organizations`, `POST /api/organizations/{id}/departments`

---

### FEAT-002.4 — API Key Management

#### Story 002.4.1 — API Key Creation, Hashing, and Authentication

**Tasks:**
- [ ] **TASK-002.4.1.1** (2h): Write Supabase migration: create `waai_api_keys` table (see `docs/masterplan/ENTERPRISE_PLATFORM.md`)
- [ ] **TASK-002.4.1.2** (3h): Implement `ApiKeyService.create()` — generate `waai_` prefixed key, SHA-256 hash, store hash only, return plaintext once
- [ ] **TASK-002.4.1.3** (2h): Implement `ApiKeyAuthMiddleware` — extract Bearer token from `Authorization` header, SHA-256 hash, look up in `waai_api_keys`, inject workspace context
- [ ] **TASK-002.4.1.4** (2h): Apply `ApiKeyAuthMiddleware` to all `/api/v1/` routes
- [ ] **TASK-002.4.1.5** (3h): Build API key management UI: create key modal (show key once), keys list with last-used-at, revoke button
- [ ] **TASK-002.4.1.6** (1h): Add `last_used_at` UPDATE on every successful API key auth

---

### FEAT-002.5 — SSO Azure AD SAML 2.0

#### Story 002.5.1 — Azure AD SAML 2.0 SSO Integration

**Tasks:**
- [ ] **TASK-002.5.1.1** (2h): Write Supabase migration: create `waai_sso_configs` table
- [ ] **TASK-002.5.1.2** (4h): Configure Supabase Auth Enterprise SSO for SAML 2.0 provider (Supabase dashboard + programmatic org-level config)
- [ ] **TASK-002.5.1.3** (3h): Implement SSO email detection: `POST /api/auth/sso/detect` — given email domain, return SSO redirect URL or null
- [ ] **TASK-002.5.1.4** (2h): Modify login page: after email entered, check SSO detect API, redirect to IdP if SSO configured
- [ ] **TASK-002.5.1.5** (2h): Implement JIT provisioning: on SSO callback, create `waai_workspace_members` row if not exists
- [ ] **TASK-002.5.1.6** (3h): Build SSO configuration UI in org admin portal: upload IdP metadata XML, map attributes, test flow

---

### FEAT-002.11 — Streaming SSE for Sandbox Chat

#### Story 002.11.1 — Implement Server-Sent Events Streaming from LLM to Browser

**Tasks:**
- [ ] **TASK-002.11.1.1** (2h): Add `stream()` method to `LLMProvider` interface in `src/lib/llm/llm-provider.ts` returning `AsyncIterable<string>`
- [ ] **TASK-002.11.1.2** (3h): Implement `AnthropicClaudeProvider.stream()` using `anthropic.messages.stream()`
- [ ] **TASK-002.11.1.3** (3h): Modify `POST /api/agents/{agentId}/sandbox/message` to return `ReadableStream` with SSE format: `data: {"chunk": "..."}\n\n` and `data: [DONE]\n\n`
- [ ] **TASK-002.11.1.4** (3h): Update sandbox chat frontend to consume SSE stream, append tokens to message bubble as received
- [ ] **TASK-002.11.1.5** (1h): Note: WhatsApp production path does NOT use streaming — verify `AgentRuntimeService` WhatsApp path is unchanged

---

## EPIC-003 — Agent Platform v3 (Selected Stories)

---

### FEAT-003.2 — Agent Policy Rule Engine

#### Story 003.2.1 — Policy Evaluation Service

**Tasks:**
- [ ] **TASK-003.2.1.1** (2h): Write migration: create `waai_agent_policies` table with `rule_type`, `rule_definition jsonb`, `action` columns
- [ ] **TASK-003.2.1.2** (4h): Implement `PolicyEvaluationService.evaluate(message, policies[])` — check each rule type: `forbidden_topic`, `required_disclosure`, `escalation_trigger`, `tone_rule`, `response_length`, `language_rule`
- [ ] **TASK-003.2.1.3** (3h): Integrate `PolicyEvaluationService` into `AgentRuntimeService` step 2 (after message received, before RAG): evaluate inbound message against policies
- [ ] **TASK-003.2.1.4** (2h): Shadow mode: log policy violations to `waai_audit_logs` without blocking. Field `metadata.shadow_mode: true`
- [ ] **TASK-003.2.1.5** (2h): Opt-in enforcement: workspace-level flag `policy_enforcement_enabled`. When true, violations return 403 response to user
- [ ] **TASK-003.2.1.6** (3h): Unit tests: 6 rule types × 2 scenarios (pass/fail) = 12 tests

---

### FEAT-003.8 — Approval Engine

#### Story 003.8.1 — Approval Request Flow

**Tasks:**
- [ ] **TASK-003.8.1.1** (2h): Write migration: create `waai_approval_policies`, `waai_approval_requests` tables
- [ ] **TASK-003.8.1.2** (3h): Implement `ApprovalService.createRequest()` — risk score agent action, create approval request, determine routing (low=auto, medium=human_agent, high=agent_manager, critical=workspace_admin)
- [ ] **TASK-003.8.1.3** (2h): Integrate approval check into `AgentRuntimeService` post-tool-call: if tool `requiresApproval()` returns true and risk > threshold, pause and create request
- [ ] **TASK-003.8.1.4** (3h): Build approval queue UI at `/dashboard/approvals`: pending queue, approve/reject with note
- [ ] **TASK-003.8.1.5** (2h): Implement approval notification via Resend: email to assigned approver with approve/reject links
- [ ] **TASK-003.8.1.6** (3h): Implement SLA timer via Inngest: `inngest.createFunction({ id: 'approval-sla-check' })` — auto-escalate if no decision within SLA hours

---

## EPIC-004 — Workflow Platform (Selected Stories)

---

### FEAT-004.2 — WorkflowExecutionEngine

#### Story 004.2.1 — DAG Execution Engine with Inngest

**Tasks:**
- [ ] **TASK-004.2.1.1** (4h): Implement `WorkflowExecutionEngine.execute(workflowId, triggerPayload)` — load workflow graph from `waai_workflows.graph_definition jsonb`, topologically sort nodes, execute in order
- [ ] **TASK-004.2.1.2** (3h): Create Inngest function `inngest.createFunction({ id: 'workflow-step', retries: 3 })` — execute single node, write result to `waai_workflow_steps`
- [ ] **TASK-004.2.1.3** (2h): Implement node output → next node input variable binding
- [ ] **TASK-004.2.1.4** (2h): Implement step idempotency: use `workflowRunId + stepId` as Inngest event ID to prevent double-execution on retry
- [ ] **TASK-004.2.1.5** (2h): Handle `Approval` node: pause DAG, create `waai_approval_request`, resume on approval event
- [ ] **TASK-004.2.1.6** (2h): Handle `Loop` node: iterate max 100 times, break on condition
- [ ] **TASK-004.2.1.7** (2h): Write `waai_workflow_runs` and `waai_workflow_steps` records on each node state change
- [ ] **TASK-004.2.1.8** (3h): Integration test: 5-node workflow (Trigger → Condition → Agent → Approval → Action) executes end-to-end in test environment

---

## Task Sizing Reference

| Size | Hours | Definition |
|---|---|---|
| XS | < 4h | Trivial change, single file, no design required |
| S | 4–16h (1–2 days) | Small feature, 2–5 files, clear design |
| M | 16–40h (1 week) | Feature with multiple components, needs ADR check |
| L | 40–80h (2 weeks) | Complex feature with DB changes, UI, and services |
| XL | > 80h | Must be decomposed before starting |

All tasks > 1 week must be broken into subtasks before entering "In Development" on the Engineering Board.
