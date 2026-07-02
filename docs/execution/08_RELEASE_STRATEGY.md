# WAAI — Release Strategy
**Document Type:** Engineering Process  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative

---

## 1. Versioning

WAAI uses Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`).

| Increment | Trigger | Example |
|---|---|---|
| MAJOR | Breaking change to the public `/api/v1/` contract (Phase G onwards) | `1.0.0 → 2.0.0` |
| MINOR | New feature, backwards-compatible. End of each phase. | `0.9.0 → 1.0.0` |
| PATCH | Bug fix, security patch, dependency update | `1.0.0 → 1.0.1` |

### Version Milestones

| Version | Milestone | Target Date |
|---|---|---|
| `0.9.0` | Current — pre-revenue, audit score 63/120 | Now |
| `1.0.0` | Phase A complete — first paying customer | August 2026 |
| `1.1.0` | Phase B complete — enterprise pilot ready | October 2026 |
| `1.2.0` | Phase C complete — Agent v3 | December 2026 |
| `2.0.0` | Phase D complete — Workflow Platform | March 2027 |
| `2.1.0` | Phase E complete — Connector Platform | May 2027 |
| `2.2.0` | Phase F complete — Enterprise GA | July 2027 |
| `3.0.0` | Phase G complete — AI Operating System | November 2027 |

### Version Source of Truth

Version is defined in `package.json` and read programmatically by `/api/health`:

```typescript
// src/app/api/health/route.ts
import { version } from '../../package.json';

export async function GET() {
  return Response.json({
    status: 'ok',
    version,              // reads from package.json — never hardcoded
    environment: process.env.VERCEL_ENV ?? 'development',
  });
}
```

---

## 2. Branch Strategy

```
main (production)
│
├── release/v1.0.0 (Phase A integration branch)
│   ├── feat/stripe-checkout
│   ├── feat/meta-cloud-provider
│   ├── fix/cost-service-wiring
│   └── fix/security-headers
│
├── release/v1.1.0 (Phase B — starts when v1.0.0 ships)
│   ├── feat/org-data-model
│   └── feat/azure-sso
│
└── hotfix/v1.0.1 (branches from main, merges to main AND release/*)
```

### Branch Rules

| Branch | Protection | Who Can Push |
|---|---|---|
| `main` | Required: CI pass + 1 review + linear history | No one directly — PR only |
| `release/*` | Required: CI pass + 1 review | No one directly — PR only |
| `feat/*` | None | Assigned engineer |
| `fix/*` | None | Assigned engineer |
| `hotfix/*` | None | On-call engineer |

### Branch Naming

```
feat/{task-id}-{brief-description}     feat/001.2.2-stripe-checkout-api
fix/{task-id}-{brief-description}      fix/001.4.1-cost-service-wiring
hotfix/{version}-{description}         hotfix/v1.0.1-webhook-signature-verification
chore/{description}                    chore/update-dependencies-july-2026
docs/{description}                     docs/update-env-vars-documentation
```

---

## 3. Release Train

WAAI runs a **phase-based release train**, not a time-boxed sprint release.

A release is cut when:
1. All acceptance criteria for the current phase are verified in staging
2. All P0/P1 tasks for the phase are in "Production" column on the Engineering Board
3. Staging smoke test passes (reference: `docs/operations/staging-smoke-test-execution.md`)
4. Release notes are written
5. Database migrations have been applied in staging and rollback verified

There is no fixed release date. The release ships when it's done. Quality gates, not calendar gates.

---

## 4. Release Process (Step by Step)

### 4.1 Pre-Release Checklist

```
□ All phase tasks in "Staging" or "Production" column
□ Staging environment reflects production data model (migrations applied)
□ Staging smoke test: login, create agent, sandbox message, check health endpoint
□ All new environment variables added to Vercel (confirm in Vercel dashboard)
□ Stripe: confirm webhook endpoint registered with new signing secret
□ Sentry: confirm new release notification configured
□ Release notes written in docs/releases/
□ package.json version bumped to target version
□ git tag created: git tag -a v1.0.0 -m "Phase A — Platform Stabilisation"
```

### 4.2 Production Deployment

```bash
# 1. Merge release branch to main (via PR, not directly)
# 2. Vercel auto-deploys from main to production
# 3. Apply database migrations (if any)
#    supabase db push --linked   (via Supabase CLI against production)
# 4. Verify health endpoint
curl https://waai.ai/api/health
# Expected: { "status": "ok", "version": "1.0.0" }
# 5. Monitor Sentry for 2 hours
# 6. Confirm first user login, agent creation, and message flow in production
```

### 4.3 Post-Deploy Monitoring (2 Hours)

| Metric | Check | Pass Threshold |
|---|---|---|
| Sentry error rate | No new error types introduced | 0 new error types |
| Vercel function errors | No spike above baseline | < 1% error rate |
| Supabase connections | Not approaching pool limit | < 80% of max connections |
| API health check | Returns 200 | 100% |
| Agent runtime | Sandbox message processes end-to-end | < 8000ms p95 |

---

## 5. Hotfix Strategy

A hotfix is a production bug fix that cannot wait for the next release train.

### Hotfix Triggers

| Trigger | Severity | Hotfix Required |
|---|---|---|
| Production down (all users) | P1 | Yes — immediate |
| Payment processing broken | P1 | Yes — within 1 hour |
| Auth broken (login fails) | P1 | Yes — within 1 hour |
| Data breach / exposure risk | P1 | Yes — immediate + security review |
| Feature broken for all users | P2 | Yes — within 4 hours |
| Feature broken for some users | P3 | No — next release |

### Hotfix Process

```
1. Branch from main: git checkout -b hotfix/v1.0.1-{description} main
2. Fix the issue (minimum viable fix — no refactoring)
3. Add regression test that reproduces the bug
4. PR: requires CTO approval (1 reviewer minimum, skip normal 48h wait)
5. Merge to main → Vercel auto-deploys
6. Cherry-pick to active release/* branch: git cherry-pick {commit-hash}
7. Tag: git tag -a v1.0.1 -m "Hotfix: {description}"
8. Post-mortem within 48 hours for P1 incidents
```

---

## 6. Feature Flags

Feature flags allow shipping code to production that is not yet visible to all users.

### When to Use Feature Flags

- Features that require staged rollout (new AI model, new connector)
- Features that need real production data to test (A/B testing)
- Features where the backend is ready but the UI is not (or vice versa)
- Phase G capabilities being previewed in Phase F for design partners

### Feature Flag Implementation

WAAI uses environment variables as feature flags (simple, no external dependency):

```typescript
// src/lib/features.ts
export const features = {
  streamingSSE: process.env.NEXT_PUBLIC_FEATURE_STREAMING === 'true',
  agentPolicies: process.env.NEXT_PUBLIC_FEATURE_POLICIES === 'true',
  workflowEngine: process.env.NEXT_PUBLIC_FEATURE_WORKFLOWS === 'true',
  multiAgent: process.env.NEXT_PUBLIC_FEATURE_MULTI_AGENT === 'true',
} as const;
```

For workspace-level flags (feature available to specific workspaces only):

```sql
-- Add to waai_workspaces
ALTER TABLE waai_workspaces 
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}';

-- Enable for a specific workspace
UPDATE waai_workspaces 
SET feature_flags = '{"streaming_sse": true, "agent_policies": true}'
WHERE id = '{design_partner_workspace_id}';
```

```typescript
// src/server/services/workspace-service.ts
async function isFeatureEnabled(workspaceId: string, feature: string): Promise<boolean> {
  const workspace = await workspaceRepository.findById(workspaceId);
  return workspace?.feature_flags?.[feature] === true;
}
```

---

## 7. Rollback Strategy

Every deployment has a defined rollback path.

### Vercel Rollback (Code)

Instant rollback via Vercel dashboard: Deployments → Previous Deployment → Promote to Production.  
Time to rollback: < 60 seconds.

### Database Rollback

Database migrations are not automatically reversible. Every migration must include a documented rollback in its PR:

```sql
-- Migration: 20260702_add_org_tables.sql (UP)
CREATE TABLE waai_organizations (...);
ALTER TABLE waai_workspaces ADD COLUMN org_id uuid;

-- Rollback script (keep in docs/migrations/rollbacks/20260702_rollback.sql)
ALTER TABLE waai_workspaces DROP COLUMN IF EXISTS org_id;
DROP TABLE IF EXISTS waai_organizations;
```

**Critical rule:** Schema migrations must be backwards-compatible with the previous code version. This means:
1. Deploy the migration first (new column added, old code still works — column nullable)
2. Deploy the new code (reads the new column)
3. Never deploy code that requires a column that doesn't exist yet

### Full Rollback Procedure

```
P1 Incident - Full Rollback:

1. Vercel: Promote previous deployment (< 1 min)
2. Verify health endpoint returns 200 with previous version
3. Assess: is DB migration reversible?
   - YES: Apply rollback SQL against production Supabase
   - NO: Keep previous code running against new schema (acceptable if migration was additive)
4. Alert team: rollback executed, incident active
5. Post-mortem within 48 hours
```

---

## 8. Release Notes Template

Stored in `docs/releases/v{VERSION}.md`:

```markdown
# WAAI v{VERSION} — Release Notes
**Release Date:** YYYY-MM-DD  
**Phase:** {Phase Name}

## What's New
- {Feature}: {one-line description}

## Bug Fixes
- {Description of fix}: {affected users or context}

## Security
- {Any security improvements}

## Breaking Changes
- None / {description if any}

## Database Migrations
- {Migration file name}: {what it does}

## Environment Variables Added
- `{VAR_NAME}`: {description, required/optional}

## Known Issues
- {Any known issues or limitations}

## Upgrade Notes
{Any special steps required for existing customers or self-hosted deployments}
```
