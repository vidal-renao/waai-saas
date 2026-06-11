# Spec 16 — Deployment & Supabase Remote Production Migration

## Fase 9 — Scope

Prepare and execute the safe deployment of WAAI SaaS to Vercel (frontend/API) and Supabase Cloud (database). This phase produces the production-ready artifact from Fase 0–8 work, documents all deployment procedures, verifies environment configuration, and validates the full stack is functional before go-live.

### In Scope

- Vercel deployment architecture and configuration
- Supabase remote migration execution (Phases 1–8, in order)
- Production environment variables documentation and verification
- Health check validation (all 4 endpoints)
- Security validation (service role, secrets, RLS, webhook)
- RLS multi-tenant isolation verification
- RPC existence and SECURITY DEFINER verification
- Smoke test checklist (26 scenarios)
- Release notes and rollback strategy
- Local lint + build validation

### Out of Scope

- Stripe real checkout activation (Fase 10+)
- Meta Cloud API full onboarding (Fase 10+)
- New product features
- Real WhatsApp message sending (test mode only)
- Real billing charges

---

## Migration Order

Migrations must be applied strictly in timestamp order:

| # | File | Phase |
|---|------|-------|
| 1 | `20260607000001_phase1_core_saas.sql` | Core SaaS multi-tenant |
| 2 | `20260607000002_phase2_agent_builder.sql` | Agent Builder |
| 3 | `20260609000003_phase3_chat_sandbox.sql` | Chat Sandbox |
| 4 | `20260610000001_phase3_conversation_scope_integrity.sql` | Conversation scope fix |
| 5 | `20260610000004_phase4_knowledge_base_rag.sql` | Knowledge Base + pgvector |
| 6 | `20260610000005_phase5_whatsapp_integration.sql` | WhatsApp Integration |
| 7 | `20260610000006_phase6_leads_handoff.sql` | Leads & Human Handoff |
| 8 | `20260611000007_phase7_analytics_dashboard.sql` | Analytics Dashboard |
| 9 | `20260611000008_phase8_production_hardening_billing_readiness.sql` | Production Hardening |

Never skip a migration. If `supabase migration list` shows inconsistencies, use `supabase migration repair`.

---

## Security Constraints (Non-Negotiable)

- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client bundles
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `WHAPI_TOKEN` must never be exposed to the browser
- `INTERNAL_API_SECRET` must remain server-only
- No secrets in `.env.example` (placeholder values only)
- No secrets in documentation files
- `ENCRYPTION_KEY` required in production for WhatsApp token storage
- Webhook routes must validate signature/secret before processing
- Health internal endpoints require `x-internal-secret` header

---

## Deployment Strategy

### Vercel (Frontend + API Routes)

- Framework: Next.js 16.2 App Router
- Build command: `next build`
- Output: `.next/` (standard Next.js output)
- Region: Auto (Vercel Edge Network)
- Node.js runtime: 20.x
- No persistent local filesystem usage (safe for Vercel serverless)
- Webhook routes: serverless functions, compatible with Vercel
- AI/RAG routes: potential timeout risk documented (see Architecture 41)

### Supabase (Database + Auth)

- Hosted on Supabase Cloud
- `supabase db push` for migrations
- pgvector extension must be enabled before migration 5
- All 9 migrations applied via Supabase CLI
- RLS enforced on all `waai_*` tables
- RPCs use `SECURITY DEFINER` + `SET search_path = public`

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Fase 9 spec exists | This document |
| 2 | Vercel deployment architecture documented | docs/architecture/41 |
| 3 | Supabase remote migration execution documented | docs/architecture/42 |
| 4 | Production env vars documented | docs/architecture/43 |
| 5 | Release and rollback plan documented | docs/architecture/44 |
| 6 | Production validation checklist exists | docs/architecture/45 |
| 7 | Smoke test checklist exists | docs/testing/phase9 |
| 8 | Release notes exist | docs/releases/phase9 |
| 9 | .env.example verified complete | File reviewed |
| 10 | No secrets hardcoded | Security audit |
| 11 | No secrets exposed to frontend | grep audit |
| 12 | Service role usage server-only | grep audit |
| 13 | Health endpoints verified | Manual test |
| 14 | Internal health endpoints require x-internal-secret | Code review |
| 15 | Supabase migration order documented | docs/architecture/42 |
| 16 | RLS verification checklist/script exists | scripts/ |
| 17 | RPC verification checklist/script exists | scripts/ |
| 18 | Build works locally | npm run build |
| 19 | Lint works locally | npm run lint |
| 20 | App compatible with Vercel | Architecture review |
| 21 | Sandbox still works | Smoke test |
| 22 | WhatsApp mock/simulate still works | Smoke test |
| 23 | RAG still works | Smoke test |
| 24 | Leads/handoff still works | Smoke test |
| 25 | Analytics still works | Smoke test |
| 26 | Billing readiness still works | Smoke test |
| 27 | System health still works | Smoke test |
| 28 | No Stripe checkout real | Code review |
| 29 | No Meta Cloud API full onboarding | Code review |
| 30 | No heavy unnecessary dependencies | package.json review |
| 31 | Known production risks documented | docs/architecture/44 |
| 32 | Rollback strategy documented | docs/architecture/44 |
| 33 | Remote migration commands documented | docs/architecture/42 |
| 34 | Manual smoke test documented | docs/testing/phase9 |
| 35 | Scripts run or are documented | scripts/ |
| 36 | Lint passes | npm run lint |
| 37 | Build passes | npm run build |

---

## Known Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| RAG document processing timeout on Vercel (>30s) | HIGH | Document 60s timeout config; use async processing if needed |
| pgvector extension not enabled on remote Supabase | HIGH | Verify before migration 5; enable via Dashboard |
| Environment variables missing on Vercel | HIGH | Use verify-production-env.ts script before deploy |
| Migration conflict if remote DB has partial state | MEDIUM | Use `supabase migration repair` if needed |
| Webhook secret not configured — silent processing without validation | HIGH | Require WHAPI_WEBHOOK_SECRET in production |
| ENCRYPTION_KEY missing — WhatsApp tokens stored in plaintext | HIGH | Required before WhatsApp goes live |

---

## Technical Debt Inherited from Fase 8

- `assertCanAddMember` not implemented (spec says "si aplica") — acceptable for now
- `humanHandoffEnabled` hardcoded `false` in billing page (display only, enforcement is correct)
- `waai_ai_cost_snapshots` has no cron populating it yet (Fase 10 work)
- AiCostService pricing table can become stale as model pricing changes
