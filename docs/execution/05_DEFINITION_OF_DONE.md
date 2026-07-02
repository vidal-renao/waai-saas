# WAAI — Definition of Done
**Document Type:** Engineering Standard  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative — applies to every task, feature, and epic

---

## Universal Definition of Done

A task is DONE when every applicable item in this checklist is complete. "Applicable" is determined by task type. Skip items that genuinely do not apply and document why in the PR description.

---

## 1. Code Quality

- [ ] **TypeScript strict compliance**: No `any`, no `as unknown as X`, no `@ts-ignore` without documented reason. `tsc --noEmit` passes with zero errors.
- [ ] **ESLint clean**: `next lint` returns zero errors. Zero warnings in production code paths (warnings are acceptable in test files only).
- [ ] **No dead code**: No unused imports, unused variables, commented-out code blocks, or `console.log` statements in production paths.
- [ ] **Layer compliance**: Route handler → Use Case → Service → Repository → Provider. No layer skipped or reversed.
- [ ] **Single Responsibility**: Each function does one thing. Functions > 50 lines are a signal to decompose.
- [ ] **Interface-first**: New provider abstractions use interfaces, not concrete class imports, at call sites.
- [ ] **Zod validation**: All inputs at HTTP boundary (Route Handlers) are validated with Zod. Schema lives in `src/lib/validators/`.
- [ ] **No hardcoded secrets**: No API keys, tokens, or credentials in code. `src/lib/security/redact-secrets.ts` patterns apply.

---

## 2. Tests

- [ ] **Unit tests written** (required for: services, repositories, use cases, utility functions): Each new service method has at least one passing test. Test file co-located with implementation or in `__tests__/`.
- [ ] **Golden path covered**: The primary success path of the feature is covered by a test.
- [ ] **Error paths covered**: At least one test verifies the behaviour when the feature fails (API returns 4xx/5xx, DB query fails, external API down).
- [ ] **No mocked DB in integration tests**: Integration tests use a real test Supabase project (or local Supabase via `supabase start`). Unit tests may mock repositories.
- [ ] **E2E test written** (required for: new pages, new user flows, payment flows, auth flows): Playwright test covers the golden path in staging.
- [ ] **All existing tests still pass**: `npm run test` green. No tests deleted to make CI pass.
- [ ] **Test coverage not regressed**: If coverage was at 60%, it must not drop below 58% after this change.

---

## 3. Security

- [ ] **Input validation at boundary**: All user-supplied data validated with Zod before use.
- [ ] **RLS verified** (required for any new DB table): Supabase RLS enabled on every new table. Row access verified for: (a) owner accessing own data ✓, (b) another workspace's user accessing the data ✗.
- [ ] **OWASP check** (required for auth, payment, webhook features):
  - No SQL injection vectors (use parameterised Supabase queries only)
  - No XSS vectors (no `dangerouslySetInnerHTML`, no raw HTML interpolation)
  - No CSRF vulnerabilities (Supabase session cookies are `SameSite=Lax`)
  - No secrets in error responses
  - No information disclosure in 404/500 error messages
- [ ] **Webhook signature verified**: Any new webhook endpoint verifies the provider signature before processing (`verifyWebhookSignature()` in the provider abstraction).
- [ ] **Tokens not logged**: No API tokens, session tokens, or user credentials appear in Sentry, Vercel logs, or console output. `redact-secrets.ts` applied.
- [ ] **Audit log entry**: Any operation that creates, modifies, or deletes customer data writes an entry to `waai_audit_logs`. INSERT-only.
- [ ] **Encryption at rest**: Any credential stored in DB (WhatsApp token, OAuth refresh token, SCIM token) is encrypted with `ENCRYPTION_KEY` via `src/lib/security/encryption.ts`.

---

## 4. Performance

- [ ] **No N+1 queries**: Database queries inside loops are reviewed and eliminated. Use batch queries or `Promise.all()` for parallel independent queries.
- [ ] **No blocking AI calls in webhook handlers**: Webhook handlers return 200 within 3 seconds. Long-running AI processing is offloaded to Inngest queue.
- [ ] **Response time within SLO**: New API routes meet the Phase-appropriate SLO from `docs/masterplan/SCALABILITY_PLAN.md` (Phase A: p95 < 2000ms).
- [ ] **pgvector query uses index**: Any similarity search query uses the `waai_knowledge_chunks_embedding` index. `EXPLAIN ANALYZE` confirms index usage.
- [ ] **No blocking synchronous operations**: No `fs.readFileSync`, no synchronous heavy computation in Route Handlers.

---

## 5. Accessibility (Frontend Features Only)

- [ ] **Keyboard navigable**: All interactive elements reachable via Tab. Modal traps focus correctly.
- [ ] **ARIA labels**: Icon-only buttons have `aria-label`. Form inputs have associated `<label>`. 
- [ ] **Colour contrast**: Text meets WCAG AA (4.5:1 for normal text, 3:1 for large text).
- [ ] **Screen reader announcement**: Async operations (loading, error, success) announce state changes to screen readers via `aria-live` regions.
- [ ] **Lighthouse accessibility score**: ≥ 90 for any new page (Lighthouse CI in pipeline).

---

## 6. Documentation

- [ ] **Inline comments for non-obvious WHY**: Any workaround, constraint, or subtle behaviour has a single-line comment explaining *why* (not *what*).
- [ ] **API documentation updated**: Any new API route is documented in the relevant spec file under `docs/specs/`.
- [ ] **ADR written** (if required by `07_ADR_POLICY.md`): ADR approved before implementation begins. ADR updated with outcome after.
- [ ] **README updated**: If a new environment variable, migration step, or external service is required, the project `README.md` and `docs/architecture/43-production-environment-variables.md` are updated.
- [ ] **Architecture docs updated**: If the feature changes the system's data flow, `docs/architecture/overview.md` is updated.

---

## 7. Observability

- [ ] **Sentry instrumentation**: All `catch` blocks in service and repository layer call `Sentry.captureException(err)`. Error is not swallowed silently.
- [ ] **Structured error context**: Sentry errors include relevant context: `workspaceId`, `agentId`, `userId` (redacted for PII), operation name.
- [ ] **Key operations timed**: Operations that affect user experience (LLM call duration, RAG retrieval, document embedding) are measured and available in Sentry performance.
- [ ] **Health endpoint unchanged**: `/api/health` still returns 200 after deployment. `/api/health/ai` and `/api/health/db` pass.
- [ ] **No silent failures**: Every code path that could fail either throws (and is caught + reported) or returns a typed error result. No swallowed exceptions.

---

## 8. Audit Compliance

- [ ] **Audit log for critical operations**: The following operations MUST write to `waai_audit_logs`:
  - Agent created, updated, deployed, archived
  - Knowledge document uploaded, processed, deleted
  - WhatsApp connection created, tested, deleted
  - Subscription plan changed
  - User role changed
  - Handoff requested, accepted, resolved
  - Approval requested, approved, rejected
  - API key created, revoked
  - SSO configuration changed
- [ ] **Audit log is INSERT-only**: Verify the new audit log write does not attempt UPDATE or DELETE on `waai_audit_logs`.
- [ ] **PII handling**: User-generated content stored in audit log is reviewed for PII. If PII is unavoidable (e.g., lead name in audit), it is noted in the task and the data retention policy applied.

---

## 9. Deployment

- [ ] **Migration safe for zero-downtime**: Database migrations are backwards-compatible with the current production code. The migration can be applied before the new code is deployed.
- [ ] **Migration tested in staging**: Applied in staging. Verified the app works with the new schema. Rollback script prepared.
- [ ] **Environment variables documented**: Any new `process.env.X` variable is added to `.env.example` with a description, and to `docs/architecture/43-production-environment-variables.md`.
- [ ] **Feature flag available** (for features that require staged rollout): Feature can be disabled via an environment variable or workspace-level setting without a code deployment.
- [ ] **Vercel deployment successful**: Preview deployment built without errors. No build warnings related to this change.
- [ ] **Smoke test passed in staging**: The core user journey for this feature verified end-to-end in staging environment before production deployment.

---

## DoD Quick Reference by Task Type

| Task Type | Code | Tests | Security | Perf | A11y | Docs | Observability | Audit | Deploy |
|---|---|---|---|---|---|---|---|---|---|
| Bug fix | ✅ | ✅ | Partial | — | — | — | ✅ | Depends | ✅ |
| New API route | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | Depends | ✅ |
| New DB table | ✅ | ✅ | ✅ (RLS) | ✅ | — | ✅ | — | ✅ | ✅ |
| New UI page/feature | ✅ | ✅ (E2E) | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| New provider | ✅ | ✅ | ✅ | ✅ | — | ✅ (ADR) | ✅ | — | ✅ |
| New webhook handler | ✅ | ✅ | ✅ (sig) | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| Payment feature | ✅ | ✅ (E2E) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth feature | ✅ | ✅ (E2E) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI feature | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ (cost) | ✅ | ✅ |
