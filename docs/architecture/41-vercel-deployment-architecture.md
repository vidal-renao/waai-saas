# Architecture 41 — Vercel Deployment Architecture

## Overview

WAAI SaaS is deployed on Vercel using Next.js 16.2 App Router. This document covers deployment configuration, compatibility requirements, timeout risks, and secrets management for the Vercel environment.

---

## Build Configuration

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build command | `next build` |
| Output directory | `.next` (auto-detected) |
| Node.js version | 20.x |
| Root directory | `waai-saas/` |
| Install command | `npm install` |

**`next.config.ts` is minimal by design** — no custom webpack, no special headers, no rewrites needed. This maximizes Vercel compatibility.

---

## Routing Architecture on Vercel

All routes use Next.js App Router. Vercel maps them as follows:

| Route type | Vercel deployment |
|-----------|------------------|
| `page.tsx` (static) | Static HTML served from CDN |
| `page.tsx` with `dynamic = "force-dynamic"` | Serverless function (invoked per request) |
| `route.ts` (API routes) | Serverless function |
| `middleware` (proxy.ts) | Edge function (runs before rendering) |

### Routes requiring `force-dynamic`

All pages that read `process.env.*` at render time use `export const dynamic = "force-dynamic"` to prevent static caching of server secrets. This is correct behavior.

Affected pages:
- `/dashboard/settings/system-health`
- `/dashboard/settings/billing`
- `/dashboard/settings/usage`
- `/dashboard/analytics/*`

---

## Middleware (proxy.ts)

`src/proxy.ts` is the middleware entry point (exported as `proxy`, imported in `middleware.ts`). It runs on Vercel Edge Runtime for all non-static routes.

It performs:
1. Redirect unauthenticated users from protected routes to `/login`
2. Redirect authenticated users from auth routes to `/dashboard`
3. Redirect users without workspace to `/onboarding`

**No `matcher` exclusions needed for API routes** — Supabase auth does not interfere with API routes.

---

## Serverless Function Limits

| Limit | Vercel Hobby | Vercel Pro |
|-------|-------------|------------|
| Execution timeout | 10s | 60s |
| Memory | 1024 MB | 3008 MB |
| Payload size | 4.5 MB | 4.5 MB |

### Timeout Risk: AI / RAG Routes

The following API routes may exceed Vercel Hobby's 10s limit:

| Route | Risk | Reason |
|-------|------|--------|
| `POST /api/agents/[agentId]/sandbox` | HIGH | Claude API call + RAG retrieval |
| `POST /api/knowledge/[docId]/process` | HIGH | OpenAI embedding generation for large documents |
| `POST /api/whatsapp/webhook` | MEDIUM | Webhook processing + Claude API call |

**Mitigation:**
- Use Vercel Pro or higher (60s timeout)
- Configure `maxDuration = 60` in route exports for AI routes
- For document processing, break into chunks (existing chunking logic handles this)
- Webhook routes should return 200 immediately, process async if needed

```typescript
// Add to AI-heavy routes:
export const maxDuration = 60;
```

---

## Environment Variables on Vercel

Set via Vercel Dashboard → Project → Settings → Environment Variables.

**Never commit secrets to git.** All sensitive values must be set in Vercel UI.

### Required for App Boot

| Variable | Type | Notes |
|----------|------|-------|
| `NEXT_PUBLIC_APP_URL` | Public | e.g., `https://app.yourdomain.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-only; never expose to browser |

### Required for AI Features

| Variable | Type | Notes |
|----------|------|-------|
| `ANTHROPIC_API_KEY` | Secret | Claude API key |
| `ANTHROPIC_MODEL` | Plain | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_FAST` | Plain | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_QUALITY` | Plain | `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | Secret | Embeddings only |
| `OPENAI_EMBEDDING_MODEL` | Plain | `text-embedding-3-small` |
| `OPENAI_EMBEDDING_DIMENSIONS` | Plain | `1536` |

### Required for WhatsApp (MVP)

| Variable | Type | Notes |
|----------|------|-------|
| `WHATSAPP_PROVIDER` | Plain | `whapi` or `mock` |
| `WHAPI_TOKEN` | Secret | Whapi.cloud token |
| `WHAPI_BASE_URL` | Plain | `https://gate.whapi.cloud` |
| `WHAPI_WEBHOOK_SECRET` | Secret | Webhook signature verification |

### Required for Security / Ops

| Variable | Type | Notes |
|----------|------|-------|
| `ENCRYPTION_KEY` | Secret | 32-byte hex; required for WhatsApp token encryption |
| `INTERNAL_API_SECRET` | Secret | Protects internal health endpoints |
| `LOG_LEVEL` | Plain | `info` in production |
| `ENABLE_DEBUG_LOGS` | Plain | `false` in production |

---

## Client Bundle Security Audit

**Rule:** Only `NEXT_PUBLIC_*` variables are safe in the client bundle. Server-only vars must never appear in client components.

```bash
# Verify no server secrets in client components
grep -r "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|OPENAI_API_KEY\|WHAPI_TOKEN\|ENCRYPTION_KEY\|INTERNAL_API_SECRET\|STRIPE_SECRET_KEY" \
  src/app src/features src/components \
  --include="*.tsx" --include="*.ts"
# Expected: results only in files under src/app/api/ or server-only files
```

---

## Webhook Compatibility

`POST /api/whatsapp/webhook` is a standard Next.js API route. Compatible with Vercel serverless functions.

Requirements:
- Must return 200 within timeout window (Whapi re-sends if no 200)
- Validates `x-hub-signature` or similar secret header
- `WHAPI_WEBHOOK_SECRET` must be configured for signature validation

**Whapi webhook URL to configure:** `https://your-domain.vercel.app/api/whatsapp/webhook`

---

## Health Check Compatibility

All health routes are standard GET API routes, compatible with Vercel:

| Route | Auth | Expected response |
|-------|------|------------------|
| `GET /api/health` | None | `{"status":"ok"}` |
| `GET /api/health/db` | `x-internal-secret` | `{"status":"ok"|"down"}` |
| `GET /api/health/ai` | `x-internal-secret` | `{"status":"ok"|"degraded"}` |
| `GET /api/health/whatsapp` | `x-internal-secret` | `{"status":"ok"|"degraded"}` |

Vercel can be configured to ping `GET /api/health` for uptime monitoring.

---

## Deployment Process (Standard)

```bash
# 1. Ensure local build passes
npm run lint
npm run build

# 2. Push to GitHub main branch (or connect Vercel to repo)
git push origin main

# 3. Vercel auto-deploys on push
# Monitor at: https://vercel.com/dashboard

# 4. After deploy, run smoke tests against production URL
# See docs/testing/phase9-production-smoke-test-checklist.md
```

---

## Known Incompatibilities / Risks

| Issue | Status | Action |
|-------|--------|--------|
| AI routes may timeout on Hobby plan | Known risk | Use Pro plan; add `maxDuration = 60` to heavy routes |
| Large document processing | Known risk | Document chunking keeps individual calls within limits |
| Persistent file storage (uploads) | Not used | All files go to Supabase Storage, not local disk — safe for Vercel |
| `crypto` module | Built into Node 20 | No polyfill needed |
