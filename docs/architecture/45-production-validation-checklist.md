# Architecture 45 — Production Validation Checklist

## Overview

Complete checklist to validate WAAI SaaS production readiness before go-live. Complete all sections in order. Each item should be marked PASS / FAIL / N/A.

---

## Section 1 — Build & Code Quality

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1.1 | `npm run lint` | 0 errors, 0 warnings (or only acceptable warnings) | |
| 1.2 | `npm run build` | Exits 0; no TypeScript errors | |
| 1.3 | Build output shows ≥ 77 routes | ≥ 77 routes in output | |
| 1.4 | No `console.log` of sensitive payloads in build output | No leaks visible | |

---

## Section 2 — Environment Variables

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 2.1 | `NEXT_PUBLIC_SUPABASE_URL` set in Vercel | Present | |
| 2.2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel | Present | |
| 2.3 | `SUPABASE_SERVICE_ROLE_KEY` set in Vercel (Sensitive) | Present | |
| 2.4 | `NEXT_PUBLIC_APP_URL` matches production domain | Correct URL | |
| 2.5 | `ANTHROPIC_API_KEY` set (Sensitive) | Present | |
| 2.6 | `OPENAI_API_KEY` set (Sensitive) | Present | |
| 2.7 | `INTERNAL_API_SECRET` set (Sensitive) | Present, ≥16 chars | |
| 2.8 | `ENCRYPTION_KEY` set if WhatsApp live (Sensitive) | 32-byte hex | |
| 2.9 | `WHAPI_TOKEN` set if provider=whapi (Sensitive) | Present | |
| 2.10 | `WHAPI_WEBHOOK_SECRET` set if provider=whapi (Sensitive) | Present | |
| 2.11 | `LOG_LEVEL` set to `info` | `info` | |
| 2.12 | `ENABLE_DEBUG_LOGS` set to `false` | `false` | |
| 2.13 | Stripe vars empty (not undefined) | Empty string | |
| 2.14 | `SENTRY_DSN` empty (Fase 10) | Empty string | |

---

## Section 3 — Security

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 3.1 | `SUPABASE_SERVICE_ROLE_KEY` only in `src/lib/supabase/service-role.ts` | grep returns 1 result | |
| 3.2 | No server secrets in `"use client"` components | grep returns 0 results | |
| 3.3 | `GET /api/health/db` returns 401 without `x-internal-secret` | HTTP 401 | |
| 3.4 | `GET /api/health/ai` returns 401 without header | HTTP 401 | |
| 3.5 | `GET /api/health/whatsapp` returns 401 without header | HTTP 401 | |
| 3.6 | Webhook validates secret before processing | Code confirmed | |
| 3.7 | Billing APIs return 401/403 for unauthorized access | Tested | |
| 3.8 | Internal notes never appear in WhatsApp outbound messages | Confirmed | |
| 3.9 | No real secrets in `.env.example` | Only placeholders | |
| 3.10 | No real secrets in any docs file | Confirmed | |

**Security grep command:**
```bash
grep -rn "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|OPENAI_API_KEY\|WHAPI_TOKEN\|ENCRYPTION_KEY\|INTERNAL_API_SECRET" \
  src/app src/features src/components \
  --include="*.tsx" --include="*.ts" \
  | grep -v "src/app/api/"
# Expected: 0 results
```

---

## Section 4 — Supabase Migrations

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 4.1 | `supabase migration list` — all 9 migrations applied | All `applied` | |
| 4.2 | pgvector extension installed | `SELECT extname FROM pg_extension WHERE extname = 'vector'` returns 1 row | |
| 4.3 | All `waai_*` tables exist (≥ 20 tables) | ≥ 20 results | |
| 4.4 | All `waai_*` tables have RLS enabled | All `rowsecurity = true` | |
| 4.5 | All `waai_*` RPCs have `SECURITY DEFINER` | All `prosecdef = true` | |
| 4.6 | All `waai_*` RPCs have `search_path = public` | `proconfig` contains value | |
| 4.7 | `waai_plans` has ≥ 1 row (plans seeded) | ≥ 1 plan | |
| 4.8 | `waai_billing_events` unique index on `(provider, provider_event_id)` | Index exists | |

---

## Section 5 — Health Endpoints

| # | Endpoint | Expected | Status |
|---|----------|----------|--------|
| 5.1 | `GET /api/health` | HTTP 200, `{"status":"ok","version":"0.9.0"}` | |
| 5.2 | `GET /api/health` response has no env var values | Confirmed | |
| 5.3 | `GET /api/health/db` with secret | HTTP 200, `{"status":"ok"}` | |
| 5.4 | `GET /api/health/ai` with secret | HTTP 200, all checks `ok` | |
| 5.5 | `GET /api/health/whatsapp` with secret | HTTP 200, `provider` matches configured provider | |

**Test commands:**
```bash
# Public health check
curl https://your-domain.vercel.app/api/health

# Internal health checks
curl -H "x-internal-secret: $INTERNAL_API_SECRET" \
  https://your-domain.vercel.app/api/health/db

curl -H "x-internal-secret: $INTERNAL_API_SECRET" \
  https://your-domain.vercel.app/api/health/ai

curl -H "x-internal-secret: $INTERNAL_API_SECRET" \
  https://your-domain.vercel.app/api/health/whatsapp
```

---

## Section 6 — RLS Isolation

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 6.1 | User A cannot read User B's agents | RLS blocks cross-workspace query | |
| 6.2 | User A cannot read User B's conversations | RLS blocks | |
| 6.3 | User A cannot read User B's leads | RLS blocks | |
| 6.4 | User A cannot read User B's knowledge documents | RLS blocks | |
| 6.5 | User A cannot read User B's WhatsApp connections | RLS blocks | |
| 6.6 | Viewer role cannot mutate agents, leads, etc. | 403 or RLS blocks INSERT | |
| 6.7 | `waai_billing_events` INSERT only via service_role | Normal user gets 403 | |
| 6.8 | `waai_system_health_events` INSERT only via service_role | Normal user gets 403 | |

---

## Section 7 — Core Features

| # | Feature | Check | Status |
|---|---------|-------|--------|
| 7.1 | Auth | Register/login/logout works | |
| 7.2 | Workspace | Onboarding creates workspace + free subscription | |
| 7.3 | Agent Builder | Create agent, generate system prompt | |
| 7.4 | Sandbox | Send message, get Claude response | |
| 7.5 | RAG | Upload doc → process → sandbox uses doc content | |
| 7.6 | WhatsApp Mock | Create connection, simulate message, see conversation | |
| 7.7 | Leads | Create lead from conversation, change status | |
| 7.8 | Human Handoff | Request handoff, assign, add note, resolve | |
| 7.9 | Analytics | Overview/agents/leads/usage pages load with data | |
| 7.10 | Billing Readiness | Billing page loads, readiness checklist shows | |
| 7.11 | System Health | System health page loads, checks show status | |
| 7.12 | Billing Enforcement | Creating agent over limit throws PLAN_LIMIT error | |
| 7.13 | Internal Notes | Notes visible to agent; NOT sent via WhatsApp | |

---

## Section 8 — Vercel Deployment

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 8.1 | Build succeeds in Vercel CI | Green checkmark | |
| 8.2 | All routes accessible after deploy | No 404/500 on smoke test | |
| 8.3 | Environment variables set correctly | Verified via health endpoints | |
| 8.4 | Middleware redirects work | Login redirect for unauthenticated users | |
| 8.5 | AI routes use `maxDuration = 60` (if Vercel Pro) | Present in heavy routes | |

---

## Section 9 — No Scope Creep Verification

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 9.1 | No real Stripe checkout activated | `StripeReadinessService.isEnabled()` = false | |
| 9.2 | No real Meta Cloud API onboarding | Meta vars empty, not wired to real flow | |
| 9.3 | No real WhatsApp messages sent in test mode | `WHATSAPP_PROVIDER=mock` for testing | |
| 9.4 | No unnecessary heavy dependencies added | `package.json` reviewed | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| Product Owner | | | |

**Deployment approved for go-live: YES / NO**
