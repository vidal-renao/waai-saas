# WAAI SaaS — Architecture Audit
**Audit Date:** 2026-06-30 | Evidence: Source code analysis

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 App Router                                       │
│  ┌────────────────┐  ┌──────────────────────────────────┐   │
│  │ (auth) group   │  │ (dashboard) group — protected    │   │
│  │ /login         │  │ /dashboard/**                    │   │
│  │ /register      │  │ /onboarding                      │   │
│  └────────────────┘  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ /api/**  — Route Handlers (server-side)              │   │
│  │  agents / knowledge / conversations / analytics      │   │
│  │  billing / health / leads / whatsapp / webhooks      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ src/proxy.ts — Middleware (auth guard + redirects)   │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Server Layer                                                │
│  Use Cases → Services → Repositories → Supabase Client      │
├─────────────────────────────────────────────────────────────┤
│  External Services                                           │
│  Anthropic API │ OpenAI Embeddings │ Whapi.cloud │ Vercel   │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  Supabase PostgreSQL + pgvector + RLS + Supabase Auth       │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Analysis

### Middleware / Proxy (`src/proxy.ts`)

**Status: Functional with gaps.**

The middleware implements 4 routing guards:
1. Unauthenticated → redirect to `/login` for protected routes ✅
2. Authenticated on auth pages → redirect to `/dashboard` or `/onboarding` ✅
3. Authenticated on `/onboarding` with existing workspace → redirect to `/dashboard` ✅
4. Authenticated on `/dashboard` without workspace → redirect to `/onboarding` ✅

**Gap:** No tenant context headers injected (`x-tenant-id`, `x-user-role`). API routes must resolve workspace from user session independently — this is acceptable but means each route re-fetches the membership record.

**Gap:** Public API routes (webhooks, health) are correctly excluded by the matcher pattern, but there is no rate limiting middleware applied at this layer.

**Matcher pattern:**
```
/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```
This correctly excludes Next.js internals and static assets.

### Use Case Layer (`src/server/use-cases/`)

**Status: Excellent.**  
46 use case files covering every domain operation. Each use case is a single exported function that:
- Validates input via Zod schemas (from `src/lib/validators/`)
- Calls the appropriate service
- Returns typed result or error

Evidence: `create-workspace.ts` validates with `createWorkspaceSchema.safeParse()`, checks for existing workspace, then delegates to `WorkspaceService.createWorkspace()`.

### Service Layer (`src/server/services/`)

**Status: Very good.**  
30+ services. Clean single-responsibility design. Services orchestrate multiple repositories and emit to `ObservabilityService`.

`WorkspaceService.createWorkspace()` is a good example:
1. Creates workspace
2. Adds creator as owner member
3. Creates free subscription
4. Logs to audit

No transaction wrapping — if step 3 or 4 fails, workspace and member records are left orphaned. **Risk: orphaned workspaces.**

### Repository Layer (`src/server/repositories/`)

**Status: Excellent.**  
30+ repositories, each wrapping a single Supabase table. Consistent pattern: typed input/output, error propagation via `throw`. No business logic in repositories.

### Provider Abstraction

**LLM Provider:**
- Interface: `src/lib/llm/types.ts` → `LLMProvider` (good) ✅
- Factory: `src/lib/llm/llm-provider.ts` → always returns `AnthropicClaudeProvider` ❌
- Multi-provider (OpenAI, Azure, Gemini): interface supports it, factory does not route to it

**Embedding Provider:**
- Interface: `src/lib/embeddings/types.ts` → `EmbeddingProvider` ✅
- Factory: routes to `openai` or `mock` — actually multi-provider ✅

**WhatsApp Provider:**
- Interface: `src/lib/whatsapp/types.ts` → `WhatsAppProvider` ✅
- Factory routes: `whapi` or `mock` — no `meta` case ❌
- `WhapiCloudProvider` fully implemented ✅
- `MetaCloudApiProvider`: **does not exist** ❌

---

## ADR Compliance

| ADR | Title | Compliance |
|---|---|---|
| ADR-0001 | Tech Stack | ✅ Next.js 16 / TS / Supabase / Tailwind v4 |
| ADR-0002 | Supabase public schema + waai_ prefix | ✅ All tables prefixed `waai_` |
| ADR-0003 | WhatsApp provider abstraction | ⚠️ Interface correct, Meta not implemented |
| ADR-0004 | LLM provider abstraction | ⚠️ Interface correct, factory not multi-provider |
| ADR-0005 | Embedding model + RAG | ✅ OpenAI text-embedding-3-small, vector(1536) |
| ADR-0006 | Plan limits enforcement | ✅ Service + DB-level enforcement |
| ADR-0007 | WhatsApp Business API onboarding | ❌ UI committed, backend not implemented |

---

## Technical Findings

| Finding | File | Severity |
|---|---|---|
| `next.config.ts` is empty | `next.config.ts` | High — no security headers, no image optimization config |
| No transaction wrapping in workspace creation | `workspace.service.ts:41` | Medium — orphan risk on partial failure |
| `createLLMProvider()` hardcoded | `src/lib/llm/llm-provider.ts:4` | Medium — multi-provider claim false |
| Health endpoint reports wrong version (0.8.0) | `src/app/api/health/route.ts:8` | Low — monitoring confusion |
| Single workspace per user enforced | `create-workspace.ts:25` | By design — limits B2B scenarios |
