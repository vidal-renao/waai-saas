# ADR-0001 — Tech Stack

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

We need to choose a production-ready, full-stack framework and toolset for a multi-tenant SaaS product targeting SMBs in Switzerland and Spain. The team already has deep experience with Next.js, Supabase and Tailwind across multiple live projects (D'Namar, Omnisciencia, Lumen Invoice).

## Decision

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR/SSG/RSC, API routes, proven at scale |
| Language | TypeScript (strict) | Type safety across full stack |
| Styling | Tailwind CSS 4 | Utility-first, consistent with ecosystem |
| Component library | shadcn/ui | Accessible, unstyled, customizable |
| Forms | React Hook Form + Zod | Performance, runtime validation |
| Server state | TanStack Query | Caching, mutations, invalidation |
| Auth | Supabase Auth | JWT, OAuth, RLS integration |
| Database | Supabase PostgreSQL | RDBMS, RLS, pgvector, real-time |
| Edge Functions | Supabase Edge Functions | Webhook handlers, async processing |
| Storage | Supabase Storage | Document uploads |
| Deploy | Vercel + Supabase Cloud | Zero-config, scales automatically |
| CI/CD | GitHub Actions | Automated lint/test/build on push |

## Consequences

- **Positive:** Reuses existing team knowledge. No new runtime to learn. Vercel + Supabase have generous free tiers for MVP.
- **Negative:** Supabase Edge Functions run on Deno — small ecosystem difference for server-side code.
- **Neutral:** Next.js App Router requires understanding of Server Components vs. Client Components boundary.

## Related ADRs

- [ADR-0002](ADR-0002-supabase-public-schema-and-waai-prefix.md) — Database conventions
- [ADR-0004](ADR-0004-llm-provider-abstraction.md) — LLM layer
