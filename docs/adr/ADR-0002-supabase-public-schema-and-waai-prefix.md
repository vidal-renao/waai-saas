# ADR-0002 — Supabase Public Schema + `waai_` Prefix

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

The Supabase project used for this application may also host other projects (D'Namar, Omnisciencia, Lumen Invoice). A previous project (Omnisciencia) used a custom schema (`omnisciencia`) which caused friction with PostgREST, TypeScript type generation, and required manual `ALTER ROLE` configuration.

## Decision

1. **All tables stay in the `public` schema.** No custom schemas will be created for this project.
2. **All database objects (tables, views, functions, triggers, policies, storage buckets) must be prefixed with `waai_`.**

Examples:
- `waai_workspaces`
- `waai_agents`
- `waai_conversations`
- `waai_messages`
- `waai_documents`
- `waai_document_chunks`
- `waai_leads`
- `waai_whatsapp_connections`
- `waai_workspace_members`
- `waai_audit_logs`
- `waai_subscriptions`

3. **TypeScript type key** will be `Database["public"]["Tables"]["waai_*"]` — standard generated types.
4. **RLS policies** on every table are mandatory. No table may exist without RLS enabled.
5. **Every table must include `workspace_id uuid`** (except `waai_workspaces` itself) to enforce tenant isolation.

## Consequences

- **Positive:** No PostgREST schema config needed. No `db: { schema: "..." }` in Supabase clients. Standard type generation works out of the box.
- **Positive:** All objects coexist safely with other projects' tables in the same Supabase project.
- **Negative:** Prefix adds verbosity to SQL and TypeScript. Accepted tradeoff.

## Enforcement

- All migration files in `supabase/migrations/` must only create `waai_*` objects.
- Code review must reject any table or function without the prefix.
- Linter rule (custom) can be added if drift is detected.

## Related ADRs

- [ADR-0001](ADR-0001-tech-stack.md) — Tech stack
