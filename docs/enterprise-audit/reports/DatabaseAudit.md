# WAAI SaaS — Database Audit
**Audit Date:** 2026-06-30 | Evidence: All 9 migration files

---

## Migration Inventory

| File | Phase | Tables / Objects |
|---|---|---|
| `20260607000001_phase1_core_saas.sql` | Core SaaS | profiles, workspaces, members, plans, subscriptions, usage_events, usage_counters, audit_logs |
| `20260607000002_phase2_agent_builder.sql` | Agent Builder | agents, agent_configs, agent_prompt_versions, agent_questions, agent_events |
| `20260609000003_phase3_chat_sandbox.sql` | Chat Sandbox | conversations, messages, sandbox_sessions, agent_runs |
| `20260610000001_phase3_conversation_scope_integrity.sql` | Scope Integrity | constraints, indexes for conversation integrity |
| `20260610000004_phase4_knowledge_base_rag.sql` | Knowledge Base | knowledge_documents, knowledge_chunks (vector), agent_knowledge_sources, knowledge_events |
| `20260610000005_phase5_whatsapp_integration.sql` | WhatsApp | whatsapp_connections, whatsapp_messages, whatsapp_webhook_events, whatsapp_connection_events |
| `20260610000006_phase6_leads_handoff.sql` | Leads & Handoff | leads, lead_events, lead_detection_runs, handoffs, conversation_assignments, internal_notes |
| `20260611000007_phase7_analytics_dashboard.sql` | Analytics | analytics views / materialized data |
| `20260611000008_phase8_production_hardening_billing_readiness.sql` | Production | system_health_events, billing_events, ai_cost_snapshots, production RPCs |

---

## RLS Verification

All tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` confirmed in migrations. Every table has at minimum:
- A SELECT policy scoped to workspace membership
- Mutations restricted to appropriate roles or service_role

**Immutability enforced at DB policy level:**
- `waai_audit_logs`: INSERT-only — no UPDATE or DELETE policies defined (comment in migration: "Audit logs are immutable — no UPDATE or DELETE policies")
- `waai_billing_events`: INSERT service_role only — no UPDATE policy
- `waai_knowledge_events`: INSERT via SECURITY DEFINER function only — no direct INSERT policy

---

## Key RPCs and Functions

| Function | Type | Purpose | Safe? |
|---|---|---|---|
| `waai_is_workspace_member(uuid)` | STABLE, SECURITY DEFINER | RLS helper | ✅ |
| `waai_get_workspace_role(uuid)` | STABLE, SECURITY DEFINER | RLS helper | ✅ |
| `waai_is_workspace_admin(uuid)` | STABLE, SECURITY DEFINER | RLS helper | ✅ |
| `waai_increment_message_counter(uuid)` | VOLATILE, SECURITY DEFINER | Atomic counter upsert | ✅ |
| `waai_check_message_limit(uuid)` | STABLE, SECURITY DEFINER | Phase 1 limit check | ✅ |
| `waai_can_use_message(uuid)` | STABLE, SECURITY DEFINER | Phase 3 limit check (used by runtime) | ✅ |
| `waai_match_agent_knowledge(vector, uuid, uuid, int, float)` | STABLE, SECURITY DEFINER | RAG cosine search | ✅ |
| `waai_get_production_health(uuid)` | STABLE, SECURITY DEFINER | Health snapshot | ✅ |
| `waai_get_billing_readiness_snapshot(uuid)` | STABLE, SECURITY DEFINER | Billing status | ✅ |
| `waai_get_ai_cost_snapshot(uuid, date, date)` | STABLE, SECURITY DEFINER | Cost analytics | ✅ |
| `waai_log_billing_event(...)` | VOLATILE, SECURITY DEFINER | Idempotent billing event insert | ✅ |
| `waai_increment_usage_counter(uuid, text, text)` | VOLATILE, SECURITY DEFINER | Phase 8 generic counter | ✅ |

All RPCs use `SET search_path = public` — no schema injection risk. ✅

---

## pgvector (RAG) Analysis

```sql
-- Migration: 20260610000004_phase4_knowledge_base_rag.sql
CREATE TABLE public.waai_knowledge_chunks (
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimensions
  ...
);

CREATE INDEX idx_waai_knowledge_chunks_embedding
  ON public.waai_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**IVFFlat assessment:**
- `lists = 100` appropriate for datasets up to ~1M vectors (rule of thumb: sqrt(rows))
- IVFFlat requires periodic `VACUUM` and `REINDEX` as data grows — no pg_cron maintenance job configured
- Alternative: HNSW (better recall, no reindex needed) — not used here
- For current scale (early SaaS), IVFFlat is acceptable

**RAG retrieval function:**
```sql
-- waai_match_agent_knowledge enforces:
-- aks.agent_id = match_agent_id          (agent scoping)
-- aks.workspace_id = match_workspace_id  (workspace isolation)
-- d.workspace_id = match_workspace_id    (document ownership)
-- d.status = 'ready'                     (no failed docs)
-- c.embedding IS NOT NULL                (no unprocessed chunks)
-- similarity >= threshold                (quality gate)
```
Cross-tenant data leak via RAG: **Not possible** — triple workspace_id check. ✅

---

## Schema Design Notes

**Strengths:**
- Consistent `waai_` prefix across all 30+ tables ✅
- `gen_random_uuid()` as primary keys (no sequential ID leakage) ✅
- `ON DELETE CASCADE` on tenant-scoped tables (workspace deletion cleans up all data) ✅
- `ON CONFLICT DO UPDATE` for atomic counter upserts ✅
- `CHECK` constraints on enums (workspace status, billing event status, document status) ✅
- Unique constraints on critical join tables (`UNIQUE (workspace_id, user_id)` on members) ✅
- Billing event idempotency: `UNIQUE (provider, provider_event_id) WHERE provider_event_id IS NOT NULL` ✅

**Gaps:**
- **No pg_cron** — no automated maintenance for IVFFlat reindex, counter reset, or stale session cleanup
- **No soft-delete on workspace_members** — hard DELETE (admin can remove member with no recovery)
- **No read replicas configured** — single primary Supabase instance (acceptable at MVP scale)
- **`entity_id` in audit_logs is `uuid`** — only UUID entities can be referenced; text keys cannot
- **Workspace `slug` not immutable** — no trigger preventing slug changes after creation (could break URL references)

---

## Indexes Assessment

All foreign keys have corresponding indexes. Key analytical indexes:

| Index | Table | Purpose |
|---|---|---|
| `waai_usage_events_workspace_idx` | usage_events | Workspace + time range queries |
| `waai_usage_counters_workspace_idx` | usage_counters | Monthly period lookup |
| `waai_audit_logs_workspace_idx` | audit_logs | Workspace event log queries |
| `waai_workspace_members_user_idx` | workspace_members | User → workspace lookup (used in middleware) |
| `idx_waai_knowledge_chunks_embedding` | knowledge_chunks | Vector similarity search (IVFFlat) |
| `idx_waai_billing_events_workspace_created` | billing_events | Billing history queries |

---

## Summary

| Dimension | Rating |
|---|---|
| RLS coverage | ✅ Complete |
| Immutable audit trail | ✅ Enforced at DB level |
| Atomic counters | ✅ UPSERT pattern |
| pgvector RAG | ✅ Correct implementation |
| Multi-tenant isolation | ✅ Triple-validated in RAG |
| Maintenance jobs | ❌ No pg_cron |
| Schema versioning | ✅ 9 sequential migrations |
| Stripe readiness | ✅ Columns present, not activated |
