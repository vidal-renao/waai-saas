# Prompt 08 — Production Deployment Runbook

## Purpose

Step-by-step operator runbook for deploying WAAI SaaS to production (Vercel + Supabase Cloud). Follow in order. Do not skip steps.

---

## Phase A — Pre-Deployment Preparation

### A1. Verify local build

```bash
cd waai-saas
npm run lint     # must exit 0
npm run build    # must complete without errors
```

Expected build output: `✓ Compiled successfully` and ≥ 77 routes.

### A2. Verify environment variables locally

```bash
node scripts/verify-production-env.js
# OR
npx ts-node --skipProject scripts/verify-production-env.ts
```

Fix any MISSING entries before continuing.

### A3. Confirm no secrets in source

```bash
grep -rn "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|OPENAI_API_KEY\|WHAPI_TOKEN\|ENCRYPTION_KEY\|INTERNAL_API_SECRET" \
  src/app src/features src/components \
  --include="*.tsx" --include="*.ts" \
  | grep -v "src/app/api/"
```

Expected: 0 results.

### A4. Confirm migration dry-run

```bash
supabase link --project-ref <your-project-ref>
supabase db push --dry-run
```

Resolve any conflicts before proceeding.

---

## Phase B — Supabase Remote Migration

### B1. Enable pgvector (if fresh project)

Via Supabase Dashboard → Database → Extensions → Search "vector" → Enable.

Or via SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### B2. Take a database backup

```bash
# If pg_dump available:
pg_dump "$DATABASE_URL" --no-owner --no-acl -F c \
  -f backup_pre_deploy_$(date +%Y%m%d%H%M).dump

# Otherwise: Supabase Dashboard → Settings → Database → Backups
```

### B3. Apply migrations

```bash
supabase db push
```

Monitor output. All 9 migrations should complete without error.

### B4. Verify migration state

```bash
supabase migration list
# All 9 migrations should show: applied
```

### B5. Verify database structure

Run these in Supabase Dashboard → SQL Editor:

```sql
-- Tables (expect 20+)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'waai_%'
ORDER BY table_name;

-- RLS (all must be true)
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'waai_%';

-- RPCs (all must have prosecdef = true)
SELECT proname, prosecdef FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'waai_%';

-- pgvector
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

### B6. Seed plans (first-time deploy only)

If `waai_plans` is empty:

```sql
INSERT INTO waai_plans (id, name, slug, price_monthly_cents, price_yearly_cents,
  max_agents, max_messages_per_month, max_knowledge_documents,
  max_whatsapp_connections, max_members, human_handoff_enabled)
VALUES
  (gen_random_uuid(), 'Free', 'free', 0, 0, 1, 100, 5, 1, 2, false),
  (gen_random_uuid(), 'Starter', 'starter', 2900, 29000, 3, 1000, 20, 2, 5, true),
  (gen_random_uuid(), 'Pro', 'pro', 7900, 79000, 10, 5000, 100, 5, 15, true),
  (gen_random_uuid(), 'Agency', 'agency', 19900, 199000, -1, -1, -1, -1, -1, true)
ON CONFLICT (slug) DO NOTHING;
```

---

## Phase C — Vercel Deployment

### C1. Set environment variables in Vercel

Go to: Vercel Dashboard → Project → Settings → Environment Variables

Set all variables from `docs/architecture/43-production-environment-variables.md`.

Mark secret variables as "Sensitive" (hides value after save).

### C2. Configure webhook URL in Whapi (if using WhatsApp)

In Whapi Dashboard, set webhook URL to:
```
https://your-domain.vercel.app/api/whatsapp/webhook
```

### C3. Deploy

**Option A — GitHub integration (recommended):**
```bash
git push origin main
# Vercel auto-deploys
```

**Option B — Manual deploy from Vercel CLI:**
```bash
npm install -g vercel
vercel --prod
```

**Option C — Deploy from Vercel Dashboard:**
Deployments → Redeploy latest commit.

### C4. Monitor deployment

Watch Vercel Dashboard → Deployments for build status. Build typically takes 60–90 seconds.

---

## Phase D — Post-Deploy Verification

### D1. Health checks

```bash
BASE_URL="https://your-domain.vercel.app"
SECRET="$INTERNAL_API_SECRET"

# Public
curl "$BASE_URL/api/health"
# Expected: {"status":"ok","version":"0.9.0",...}

# Database
curl -H "x-internal-secret: $SECRET" "$BASE_URL/api/health/db"
# Expected: {"status":"ok",...}

# AI
curl -H "x-internal-secret: $SECRET" "$BASE_URL/api/health/ai"
# Expected: {"status":"ok","checks":{...}}

# WhatsApp
curl -H "x-internal-secret: $SECRET" "$BASE_URL/api/health/whatsapp"
# Expected: {"status":"ok","provider":"whapi",...}
```

### D2. Smoke tests

Run all 26 items from `docs/testing/phase9-production-smoke-test-checklist.md`.

### D3. Production validation checklist

Complete `docs/architecture/45-production-validation-checklist.md`.

---

## Phase E — Rollback (if needed)

### Application rollback

1. Vercel Dashboard → Deployments
2. Find last known-good deployment
3. Click "Promote to Production"

### Database rollback

Only if application rollback is insufficient and migration caused issues.

```bash
pg_restore --clean -d "$DATABASE_URL" --no-owner --no-acl \
  backup_pre_deploy_YYYYMMDDHHMM.dump
```

See `docs/architecture/44-release-and-rollback-plan.md` for detailed rollback SQL.

---

## Phase F — Go-Live Confirmation

- [ ] All health checks return expected responses
- [ ] Smoke tests pass (≥ 24/26)
- [ ] No critical errors in Vercel Functions logs
- [ ] No critical errors in Supabase Dashboard logs
- [ ] Production validation checklist signed off
- [ ] Rollback plan accessible and confirmed

**Go-live approved by:** _________________ **Date:** _________________
