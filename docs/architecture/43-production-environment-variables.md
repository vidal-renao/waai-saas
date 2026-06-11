# Architecture 43 — Production Environment Variables

## Overview

Complete reference for all environment variables required by WAAI SaaS. Variables are grouped by boot priority. Set all variables in Vercel Dashboard before deploying.

**Security rules:**
- Never commit `.env.local` to git
- Never put real secrets in `.env.example` (placeholders only)
- `NEXT_PUBLIC_*` variables are bundled into the client — only non-sensitive values allowed
- All other variables are server-only

---

## Group 1 — Required for Boot

The app will not start without these.

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://app.yourdomain.com` | Public URL of the deployed app; used in redirects and emails |
| `NEXT_PUBLIC_APP_NAME` | `WAAI SaaS` | Application name displayed in UI |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon/public key — safe for client |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **SECRET** — server-only, bypasses RLS |

---

## Group 2 — Required for AI Features

The app boots without these but sandbox/RAG/WhatsApp AI will fail.

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **SECRET** — Claude API key |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | Default model for general use |
| `ANTHROPIC_MODEL_FAST` | `claude-haiku-4-5-20251001` | Fast/cheap model for high-volume ops |
| `ANTHROPIC_MODEL_QUALITY` | `claude-sonnet-4-6` | Quality model for important responses |
| `OPENAI_API_KEY` | `sk-...` | **SECRET** — OpenAI key (embeddings only) |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `OPENAI_EMBEDDING_DIMENSIONS` | `1536` | Must match `vector(1536)` in DB |

---

## Group 3 — Required for WhatsApp (MVP — Whapi)

Required when `WHATSAPP_PROVIDER=whapi`. App boots without these but WhatsApp will fail.

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `WHATSAPP_PROVIDER` | `whapi` | Provider selector: `whapi` \| `meta` \| `mock` |
| `WHAPI_TOKEN` | `your-whapi-token` | **SECRET** — Whapi.cloud API token |
| `WHAPI_BASE_URL` | `https://gate.whapi.cloud` | Whapi API base URL |
| `WHAPI_WEBHOOK_SECRET` | `your-secret` | **SECRET** — webhook signature verification |

---

## Group 4 — Required for Security & Ops

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `ENCRYPTION_KEY` | `a1b2c3...` (32 hex chars) | **SECRET** — encrypts WhatsApp tokens at rest; required for production WhatsApp |
| `INTERNAL_API_SECRET` | `your-secret` | **SECRET** — required for internal health endpoints (`x-internal-secret` header) |
| `LOG_LEVEL` | `info` | Log verbosity: `debug` \| `info` \| `warn` \| `error` |
| `ENABLE_DEBUG_LOGS` | `false` | Set `true` only for debugging in production (avoid) |
| `PLATFORM_OWNER_EMAIL` | `admin@yourdomain.com` | Receives critical platform alerts |

---

## Group 5 — Optional / Future

Leave empty (not undefined) until the corresponding phase is activated.

| Variable | Activate In | Description |
|----------|------------|-------------|
| `BILLING_PROVIDER` | Fase 10 | `stripe` (future activation) |
| `STRIPE_SECRET_KEY` | Fase 10 | **SECRET** — Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Fase 10 | **SECRET** — Stripe webhook signature |
| `STRIPE_PRICE_STARTER` | Fase 10 | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_PRO` | Fase 10 | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_AGENCY` | Fase 10 | Stripe Price ID for Agency plan |
| `SENTRY_DSN` | Fase 10 | Error tracking DSN |
| `CRON_SECRET` | Fase 10 | Authenticates cron job API calls |

---

## Group 6 — Meta Cloud API (Production WhatsApp)

Not required until Meta onboarding is complete (Fase 10+).

| Variable | Description |
|----------|-------------|
| `META_APP_ID` | Meta app ID |
| `META_APP_SECRET` | **SECRET** — Meta app secret |
| `META_WEBHOOK_VERIFY_TOKEN` | **SECRET** — webhook verify token |
| `META_ACCESS_TOKEN` | **SECRET** — system user access token |

---

## Vercel Configuration Steps

1. Open Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable from Groups 1–4 (mark secrets as "Sensitive")
3. Select environments: Production (at minimum), Preview (optional)
4. Leave Group 5 variables empty (add them as empty strings to avoid "undefined" errors)
5. After adding variables, redeploy from Deployments tab

---

## Local Development Setup

```bash
cp .env.example .env.local
# Edit .env.local with real values
# NEVER commit .env.local
```

---

## Verification Script

Run before deploying to verify all required variables are present:

```bash
npx ts-node --project tsconfig.json scripts/verify-production-env.ts
# OR (if ts-node not available):
node scripts/verify-production-env.js
```

See `scripts/verify-production-env.ts` for implementation.

---

## Security Audit — No Secrets in Client

```bash
# Run from repo root — must return 0 results in client components
grep -rn "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|OPENAI_API_KEY\|WHAPI_TOKEN\|ENCRYPTION_KEY\|INTERNAL_API_SECRET\|STRIPE_SECRET_KEY\|META_ACCESS_TOKEN" \
  src/app src/features src/components \
  --include="*.tsx" --include="*.ts" \
  | grep -v "src/app/api/"
```

Expected output: no results (or results only in server-only utility files, never in `"use client"` components).
