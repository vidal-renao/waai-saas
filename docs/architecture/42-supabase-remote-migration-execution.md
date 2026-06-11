# Architecture 42 — Supabase Remote Migration Execution

## Overview

This document describes the complete procedure for applying all WAAI SaaS database migrations (Phases 1–8) to a remote Supabase project. It supersedes and extends `docs/architecture/39-supabase-production-migration-plan.md` with Fase 9 execution detail.

---

## Prerequisites

### Tooling

```bash
# Install Supabase CLI (global)
npm install -g supabase

# Verify version
supabase --version
# Minimum: 1.170.0

# Login to Supabase
supabase login
```

### Required Information

Before starting, have ready:
- Supabase project ref (from Dashboard URL: `https://supabase.com/dashboard/project/<ref>`)
- Supabase database password (Settings → Database → Database Settings)
- `DATABASE_URL` (direct connection string) — needed for `pg_dump` backup
- pgvector extension must be **manually enabled** before migrations via Supabase Dashboard

---

## Pre-Migration Checklist

- [ ] Backup taken (see Backup section below)
- [ ] pgvector extension enabled (Database → Extensions → vector)
- [ ] Local `supabase db reset` passes without errors
- [ ] `supabase migration list` shows no pending local-only migrations from previous partial deploys
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured in `.env.local` for verification scripts
- [ ] No active traffic during migration window (recommended)

---

## Step 1 — Backup

```bash
# Option A: pg_dump (requires direct DB access)
pg_dump "$DATABASE_URL" --no-owner --no-acl -F c \
  -f backup_pre_phase9_$(date +%Y%m%d%H%M).dump

# Option B: Supabase Dashboard
# Settings → Database → Backups → Download latest backup
# (Available on Pro plan and above)
```

Store backup outside the project repository.

---

## Step 2 — Link Project

```bash
# Link local CLI to remote project
supabase link --project-ref <your-project-ref>
# Enter your database password when prompted
```

---

## Step 3 — Enable pgvector

pgvector must be enabled **before** migration 5 runs, as it uses `CREATE EXTENSION IF NOT EXISTS vector`.

```sql
-- Run in Supabase Dashboard → SQL Editor, OR via CLI:
supabase db execute --command "CREATE EXTENSION IF NOT EXISTS vector;"

-- Verify
supabase db execute --command "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
-- Expected: vector | 0.8.x (or higher)
```

---

## Step 4 — Dry Run

```bash
# Verify migrations would apply cleanly without actually running them
supabase db push --dry-run
```

Review output for any errors before proceeding.

---

## Step 5 — Apply Migrations

```bash
# Apply all pending migrations in order
supabase db push

# Monitor output — all 9 migrations should complete successfully
```

### Migration Order (strictly enforced by timestamp)

```
20260607000001_phase1_core_saas.sql
20260607000002_phase2_agent_builder.sql
20260609000003_phase3_chat_sandbox.sql
20260610000001_phase3_conversation_scope_integrity.sql
20260610000004_phase4_knowledge_base_rag.sql
20260610000005_phase5_whatsapp_integration.sql
20260610000006_phase6_leads_handoff.sql
20260611000007_phase7_analytics_dashboard.sql
20260611000008_phase8_production_hardening_billing_readiness.sql
```

---

## Step 6 — Verify Migrations Applied

```bash
# List all migrations with status
supabase migration list
# All 9 should show status: applied
```

---

## Step 7 — Post-Migration Verification

### Tables

```sql
-- All waai_ tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'waai_%'
ORDER BY table_name;

-- Expected tables include:
-- waai_workspaces, waai_workspace_members, waai_plans, waai_subscriptions,
-- waai_agents, waai_agent_runs, waai_conversations, waai_messages,
-- waai_knowledge_documents, waai_knowledge_chunks,
-- waai_whatsapp_connections, waai_whatsapp_messages, waai_webhook_events,
-- waai_leads, waai_conversation_notes, waai_conversation_assignments,
-- waai_handoff_requests, waai_usage_counters,
-- waai_system_health_events, waai_billing_events, waai_ai_cost_snapshots
```

### RLS

```sql
-- All waai_ tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'waai_%'
ORDER BY tablename;
-- All rows must have rowsecurity = true
```

### RPCs (SECURITY DEFINER + search_path)

```sql
-- Verify all waai_ functions exist with SECURITY DEFINER
SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'waai_%'
ORDER BY p.proname;

-- prosecdef must be true for all RPCs
-- proconfig must include 'search_path=public'
```

### Expected RPCs

| RPC Name | Phase | Purpose |
|----------|-------|---------|
| `waai_can_create_agent` | 8 | Billing enforcement |
| `waai_can_use_message` | 8 | Billing enforcement |
| `waai_can_upload_document` | 8 | Billing enforcement |
| `waai_can_create_whatsapp_connection` | 8 | Billing enforcement |
| `waai_increment_usage_counter` | 8 | Atomic usage increment |
| `waai_has_active_handoff` | 6 | Handoff detection |
| `waai_match_agent_knowledge` | 4 | RAG retrieval |
| `waai_get_workspace_analytics` | 7 | Analytics aggregation |
| `waai_get_production_health` | 8 | Health dashboard |
| `waai_get_billing_readiness_snapshot` | 8 | Billing readiness |

### pgvector

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Must return: vector | 0.5.0+ (typically 0.8.x on Supabase)
```

---

## Step 8 — Seed Plans (if fresh database)

If this is a fresh Supabase project with no data, the billing plans must be seeded:

```sql
-- Insert default plans (adjust pricing as needed)
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

## Migration Repair (if needed)

```bash
# If a migration was applied manually and CLI shows it as pending:
supabase migration repair --status applied 20260611000008

# If a migration needs to be marked as not applied (to re-run):
supabase migration repair --status reverted 20260611000008
```

---

## Rollback Plan

### Database Rollback (partial migration failure)

If a migration fails partway through:

```sql
-- Phase 8 rollback (tables + functions)
DROP TABLE IF EXISTS waai_system_health_events CASCADE;
DROP TABLE IF EXISTS waai_billing_events CASCADE;
DROP TABLE IF EXISTS waai_ai_cost_snapshots CASCADE;

DROP FUNCTION IF EXISTS waai_get_production_health(uuid);
DROP FUNCTION IF EXISTS waai_get_billing_readiness_snapshot(uuid);
DROP FUNCTION IF EXISTS waai_get_ai_cost_snapshot(uuid, date, date);
DROP FUNCTION IF EXISTS waai_log_system_health_event(uuid, text, text, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS waai_log_billing_event(uuid, uuid, text, text, text, integer, text, text, jsonb);
DROP FUNCTION IF EXISTS waai_increment_usage_counter(uuid, text, integer);

-- Then restore from backup if needed
pg_restore --clean -d "$DATABASE_URL" backup_pre_phase9_YYYYMMDDHHMM.dump
```

### Application Rollback

1. In Vercel Dashboard, go to Deployments
2. Find the last known-good deployment
3. Click "Promote to Production"
4. No database changes needed (rollback is application-only)

---

## Post-Deploy Verification Checklist

- [ ] `supabase migration list` — all 9 migrations show `applied`
- [ ] `SELECT count(*) FROM waai_plans` returns ≥ 1 row
- [ ] All expected tables exist (see table list above)
- [ ] All tables have `rowsecurity = true`
- [ ] All RPCs exist with `prosecdef = true`
- [ ] pgvector extension installed
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `GET /api/health/db` with secret header returns `{"status":"ok"}`
- [ ] Sandbox conversation works (Claude API responds)
- [ ] No error logs in Supabase Dashboard → Logs → Edge Functions
