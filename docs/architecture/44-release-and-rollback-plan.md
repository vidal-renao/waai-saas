# Architecture 44 — Release and Rollback Plan

## Overview

This document defines the release process, versioning strategy, and rollback procedures for WAAI SaaS production deployments.

---

## Versioning

| Version | Phase | Status |
|---------|-------|--------|
| 0.1.0 – 0.7.0 | Fase 0–7 | Development |
| 0.8.0 | Fase 8 — Production Hardening | Released |
| 0.9.0 | Fase 9 — Deployment & Production Migration | Current |

Version is tracked in `package.json`. Update before each phase release.

---

## Release Process

### Pre-Release Checklist

- [ ] All acceptance criteria for the phase are met
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — clean build
- [ ] `.env.example` is up to date
- [ ] No secrets hardcoded anywhere
- [ ] Migration `--dry-run` passes
- [ ] Phase spec doc exists and is complete
- [ ] Smoke test checklist prepared

### Release Steps

```
1. Update package.json version
2. Create git tag: git tag v0.9.0
3. Push tag: git push origin v0.9.0
4. Vercel auto-deploys from main branch (or manual deploy from Vercel Dashboard)
5. Apply Supabase migrations: supabase db push
6. Run smoke tests against production URL
7. Mark phase as complete in README
```

---

## Rollback Procedures

### Application Rollback (Vercel)

Vercel stores all deployments and supports instant rollback:

```
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"
4. Deployment switches within ~30 seconds
```

This is a zero-downtime rollback — no database changes needed if the schema is backward-compatible.

### Database Rollback

**IMPORTANT:** Database rollbacks are destructive. Only proceed if application rollback alone is insufficient.

#### Rollback to pre-Phase 8 state

```sql
-- Drop Phase 8 tables and functions
DROP TABLE IF EXISTS waai_system_health_events CASCADE;
DROP TABLE IF EXISTS waai_billing_events CASCADE;
DROP TABLE IF EXISTS waai_ai_cost_snapshots CASCADE;

DROP FUNCTION IF EXISTS waai_get_production_health(uuid);
DROP FUNCTION IF EXISTS waai_get_billing_readiness_snapshot(uuid);
DROP FUNCTION IF EXISTS waai_get_ai_cost_snapshot(uuid, date, date);
DROP FUNCTION IF EXISTS waai_log_system_health_event(uuid, text, text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS waai_log_billing_event(uuid, uuid, text, text, text, integer, text, text, jsonb);
DROP FUNCTION IF EXISTS waai_increment_usage_counter(uuid, text, integer);
DROP FUNCTION IF EXISTS waai_can_create_agent(uuid);
DROP FUNCTION IF EXISTS waai_can_use_message(uuid);
DROP FUNCTION IF EXISTS waai_can_upload_document(uuid);
DROP FUNCTION IF EXISTS waai_can_create_whatsapp_connection(uuid);
```

#### Full restore from backup

```bash
pg_restore --clean -d "$DATABASE_URL" \
  --no-owner --no-acl \
  backup_pre_phase9_YYYYMMDDHHMM.dump
```

**Warning:** Full restore overwrites all data. Use only if migration caused data corruption.

---

## Known Risks

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| AI routes timeout on Vercel Hobby (10s limit) | HIGH | Use Pro plan; add `maxDuration = 60` | Documented — action required |
| pgvector not enabled on remote Supabase | HIGH | Manual enable before migration 5 | Checklist item |
| Missing env vars on Vercel | HIGH | Run `verify-production-env.ts` script | Script created |
| Webhook not validated in production | HIGH | `WHAPI_WEBHOOK_SECRET` must be set | Security constraint |
| `ENCRYPTION_KEY` missing — tokens in plaintext | HIGH | Required before WhatsApp live | Security constraint |
| Migration partial failure | MEDIUM | Backup before every migration run | Backup step mandatory |
| Supabase pgvector version too old | MEDIUM | Verify extversion >= 0.5.0 | Pre-migration check |
| Cold-start latency on serverless functions | LOW | Accept; first request may be slow | Informational |

---

## Deployment Environments

| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| Production | `https://app.yourdomain.com` | `main` | Yes (on push) |
| Preview | Auto-generated Vercel URL | Feature branches | Yes |
| Local | `http://localhost:3000` | Any | Manual (`npm run dev`) |

---

## Incident Response

### Application is down (all routes returning 5xx)

1. Check Vercel Dashboard → Functions tab for errors
2. Check Supabase Dashboard → Logs → API for DB errors
3. If recent deployment caused it: rollback via Vercel Dashboard
4. Check environment variables are all set correctly

### Database is unreachable

1. Check Supabase Dashboard → Project → Status
2. If project is paused (free tier inactivity): restore via Dashboard
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### AI responses failing

1. Check `GET /api/health/ai` with `x-internal-secret` header
2. Verify `ANTHROPIC_API_KEY` is valid and has credits
3. Check Anthropic status page for outages

### WhatsApp not receiving/sending

1. Check `GET /api/health/whatsapp` with `x-internal-secret` header
2. Verify `WHAPI_TOKEN` is valid
3. Check Whapi dashboard for connection status
4. Verify webhook URL configured in Whapi points to production domain
