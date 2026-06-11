# Architecture 31 — Analytics Architecture

## Overview

Analytics for WAAI SaaS is implemented as a **read-only query layer** on top of existing tables. No new data tables are created. All data already exists across Fases 1–6 tables.

## Design Principles

1. **No new tables** — analytics reads existing tables, never duplicates data
2. **Workspace isolation** — every query filters by `workspace_id` via RLS + explicit filter
3. **Date-range parameterized** — all queries accept `from_date` / `to_date` ISO timestamps
4. **Views for complex aggregations** — SQL views (non-materialized) for portability
5. **TypeScript aggregation** — simple counts done in repository layer
6. **Role enforcement at use-case layer** — checked before any DB query

## Layer Diagram

```
Dashboard Pages (Server Components)
        ↓
    Use Cases (get-workspace-analytics, get-agent-performance-analytics, ...)
        ↓
    Analytics Service (orchestrates multiple queries)
        ↓
    Analytics Repository (raw parameterized queries)
        ↓
    Supabase (existing tables + SQL views)
```

## SQL Views (7)

All views created in `public` schema with `waai_` prefix:

| View | Purpose |
|---|---|
| `waai_analytics_workspace_overview` | Counts per workspace across all key entities |
| `waai_analytics_agent_performance` | Per-agent aggregates (conversations, messages, leads, handoffs, RAG, errors) |
| `waai_analytics_lead_funnel` | Lead counts by status + conversion rate |
| `waai_analytics_channel_usage` | Conversations and messages by channel |
| `waai_analytics_handoff_metrics` | Handoff counts by status + trigger type |
| `waai_analytics_usage_limits` | Current usage counters vs plan limits |
| `waai_analytics_error_events` | Recent errors across all subsystems |

Views do NOT have RLS — they are accessed through the TypeScript repository layer which always adds `workspace_id` filter. This avoids complex security definer view setup while keeping security at the application layer.

## RPCs (3)

| RPC | Purpose |
|---|---|
| `waai_get_workspace_analytics(p_workspace_id, p_from, p_to)` | Full workspace overview in one call |
| `waai_get_agent_performance(p_workspace_id, p_from, p_to)` | Per-agent performance array |
| `waai_get_operational_alerts(p_workspace_id)` | Urgent items needing attention |

All RPCs are `STABLE` or `VOLATILE` as appropriate, `SECURITY DEFINER`, `SET search_path = public`.

## Date Filtering

- All time-series queries accept `p_from timestamptz` and `p_to timestamptz`
- Default: last 30 days (`now() - interval '30 days'` to `now()`)
- Validator enforces: max 366 days range, `from` < `to`
- Preset labels: `today` | `7d` | `30d` | `month` | `custom`

## Performance

For MVP with small workspaces (< 10,000 rows per table), real-time SQL views are sufficient.

Existing indexes leverage analytics:
- `waai_conversations (workspace_id, created_at)`
- `waai_messages (workspace_id, created_at)`
- `waai_agent_runs (workspace_id, created_at)`
- `waai_leads (workspace_id, created_at)`
- `waai_handoffs (workspace_id, created_at)`

New indexes added in Fase 7 migration for analytics hotpaths:
- `waai_agent_runs (workspace_id, status, created_at)`
- `waai_whatsapp_messages (workspace_id, direction, created_at)`

## Security

- Views are not directly accessible via RLS (they're used through SECURITY DEFINER RPCs or TS queries with workspace filter)
- TypeScript repository layer always adds `workspace_id` equality filter
- Use-case layer validates role before invoking analytics
- No raw SQL exposed to client
- No API key or secret in analytics output
