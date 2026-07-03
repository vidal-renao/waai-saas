# Release Notes — Phase 9: Deployment & Supabase Remote Production Migration

**Version:** 0.9.0  
**Date:** 2026-06-11  
**Status:** Production Ready

---

## Summary

Phase 9 prepares WAAI SaaS for real-world deployment. No new product features were added. This phase focuses entirely on deployment infrastructure, documentation, verification tooling, and production readiness.

All 37 acceptance criteria from Spec 16 are met. Lint passes. Build passes.

---

## What Changed in This Phase

### Documentation Created

| Document | Purpose |
|----------|---------|
| `docs/specs/16-deployment-supabase-production-migration-spec.md` | Fase 9 spec with 37 ACs |
| `docs/architecture/41-vercel-deployment-architecture.md` | Vercel config, timeout risks, secrets management |
| `docs/architecture/42-supabase-remote-migration-execution.md` | Full migration execution guide |
| `docs/architecture/43-production-environment-variables.md` | All env vars grouped by priority |
| `docs/architecture/44-release-and-rollback-plan.md` | Release process + rollback procedures |
| `docs/architecture/45-production-validation-checklist.md` | 9-section production readiness checklist |
| `docs/prompts/08-production-deployment-runbook.md` | Step-by-step operator runbook |
| `docs/testing/phase9-production-smoke-test-checklist.md` | 96-test smoke test checklist |
| `docs/releases/phase9-deployment-readiness.md` | This file |

### Scripts Created

| Script | Purpose |
|--------|---------|
| `scripts/verify-production-env.ts` | Verify all required env vars present (without printing values) |
| `scripts/verify-rls-policies.ts` | Verify all waai_ tables have RLS enabled |
| `scripts/verify-health-endpoints.ts` | Verify all health endpoints respond correctly |

### Inherited Fixes from Phase 8 (previously applied)

- Fixed `WHAPI_API_KEY` → `WHAPI_TOKEN` in `.env.example` and health check route
- Fixed Tailwind dynamic class issue in `plan-usage-summary.tsx`
- Fixed `"missing"` → `"down"` status type in `system-health/page.tsx`
- Added missing `CRON_SECRET` to `.env.example`

### Package Version

- `package.json` version: `0.1.0` → `0.9.0`

---

## Required Environment Variables

Set all in Vercel Dashboard before deploying. See `docs/architecture/43-production-environment-variables.md` for full reference.

### Required for Boot

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Required for AI

```
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

### Required for Security

```
INTERNAL_API_SECRET
```

### Required for WhatsApp (when live)

```
WHATSAPP_PROVIDER
WHAPI_TOKEN
WHAPI_WEBHOOK_SECRET
ENCRYPTION_KEY
```

---

## Migration Commands

Apply in a single command to a linked Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all 9 migrations in order. See `docs/architecture/42-supabase-remote-migration-execution.md` for pre-migration checklist and rollback procedures.

---

## Verification Commands

```bash
# Local build validation
npm run lint
npm run build

# Environment variables check
npx ts-node --skipProject scripts/verify-production-env.ts

# Health endpoint check (against deployed app)
APP_URL=https://your-domain.vercel.app \
  INTERNAL_API_SECRET=your-secret \
  npx ts-node --skipProject scripts/verify-health-endpoints.ts
```

---

## Known Limitations

| Limitation | Impact | Resolution |
|-----------|--------|-----------|
| AI routes may timeout on Vercel Hobby (10s limit) | Sandbox/RAG fail on free plan | Use Vercel Pro; add `maxDuration = 60` to AI routes |
| `waai_ai_cost_snapshots` has no cron populating it | Cost analytics empty | Fase 10 work |
| `assertCanAddMember` not implemented | Member limit not enforced | Spec says "si aplica"; acceptable |

> **Update (post-0.9.0):** Stripe checkout + subscription-lifecycle webhooks and the
> Meta Cloud API WhatsApp provider are now implemented and merged (previously
> deferred to Fase 10). Activate Stripe by setting `STRIPE_*` env vars; select the
> Meta provider via `WHATSAPP_PROVIDER=meta`. Default LLM model is now
> `claude-fable-5` (see `.env.example` for the retention/cost caveats).

---

## Rollback Notes

**Application rollback:** Vercel Dashboard → Deployments → Promote previous deployment. Zero-downtime.

**Database rollback:** See `docs/architecture/44-release-and-rollback-plan.md`. Requires backup taken pre-migration.

---

## Deployment Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — clean
- [ ] Env vars set in Vercel Dashboard
- [ ] pgvector extension enabled in Supabase
- [ ] `supabase db push` completed — all 9 migrations applied
- [ ] Plans seeded in `waai_plans`
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Internal health endpoints return `{"status":"ok"}` with secret header
- [ ] Smoke test checklist completed (≥ 90/96)
- [ ] Production validation checklist signed off

---

## Phases Completed

| Phase | Name | Version |
|-------|------|---------|
| Fase 0 | Setup & Conventions | 0.0.x |
| Fase 1 | Core SaaS Multi-tenant | 0.1.x |
| Fase 2 | Agent Builder | 0.2.x |
| Fase 3 | Chat Sandbox | 0.3.x |
| Fase 4 | Knowledge Base / RAG | 0.4.x |
| Fase 5 | WhatsApp Integration | 0.5.x |
| Fase 6 | Leads & Human Handoff | 0.6.x |
| Fase 7 | Analytics & Dashboard | 0.7.x |
| Fase 8 | Production Hardening | 0.8.0 |
| Fase 9 | Deployment & Migration | 0.9.0 |
