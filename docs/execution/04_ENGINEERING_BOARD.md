# WAAI — Engineering Board
**Document Type:** Process Reference  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative

---

## Board Overview

WAAI uses a single Kanban board with nine columns. Every engineering task on the board must have: a task ID (from `03_EPIC_BREAKDOWN.md`), an owner, a phase tag, and a priority label.

---

## Board Columns

### 1. BACKLOG

All approved tasks that are not yet ready for development. Tasks remain in Backlog until they have:
- [ ] Written acceptance criteria
- [ ] Assigned engineer
- [ ] Dependencies resolved or explicitly acknowledged
- [ ] Task size estimate (XS/S/M/L/XL)
- [ ] Phase tag (A/B/C/D/E/F/G)

**WIP Limit:** None — this is the parking lot.

**Board Rules:**
- Tasks are ordered by priority (P0 at top, P3 at bottom)
- Blocked tasks stay in Backlog with a `[BLOCKED: reason]` prefix until unblocked
- Tasks in Backlog do not count toward sprint capacity

---

### 2. READY

Tasks that meet all Backlog criteria and are ready to be picked up by an engineer in the next daily cycle.

**WIP Limit:** Max 10 tasks at any time. If this limit is reached, do not pull from Backlog — clear the board first.

**Entry Criteria:**
- All Backlog criteria met
- Engineer has been briefed and confirms they understand the task
- No unresolved questions about implementation approach

**Board Rules:**
- Tasks move from Ready → Architecture Review if they require an ARB review
- Tasks move from Ready → In Development if no ARB review required
- A task in Ready that has not been picked up in 3 days is a process failure: escalate

---

### 3. ARCHITECTURE REVIEW

Tasks that require Architecture Review Board (ARB) approval before implementation begins.

**WIP Limit:** Max 5 tasks.

**Required for:**
- New database table or schema change
- New provider abstraction or interface
- Changes to RLS policies
- Changes to `AgentRuntimeService` pipeline (14 steps)
- Any new external API dependency
- Any new `npm` package with no prior equivalent in the codebase
- AI prompt template changes affecting production agents

**ARB Review SLA:** 48 hours. If not reviewed in 48 hours, CTO escalates.

**Exit Criteria:**
- ADR written and approved (if required by `07_ADR_POLICY.md`)
- Architecture approach documented in task description
- Implementation checklist updated to reflect ARB feedback

---

### 4. IN DEVELOPMENT

Active engineering work. One engineer per task.

**WIP Limit:** Max 2 tasks per engineer at any time. Context switching kills velocity.

**Entry Criteria:**
- Task has exited Architecture Review (or was never required to enter it)
- Engineer has pulled the task into their local environment
- Feature branch created: `feat/{task-id}-{brief-description}`

**Board Rules:**
- Tasks in development for > 5 business days must be escalated. Either split the task or call for help.
- Daily async standup update must reference task ID
- No task moves to Code Review unless all automated checks pass locally

**WIP Limit Exceptions:** Hotfixes bypass WIP limits. A P1/P2 production incident fix takes immediate slot.

---

### 5. CODE REVIEW

PR open, waiting for peer review.

**WIP Limit:** Max 3 open PRs per engineer at any time.

**PR Requirements (mandatory before opening):**
- [ ] All automated CI checks passing (TypeScript, lint, tests)
- [ ] Self-review completed (engineer reviews their own diff first)
- [ ] PR description includes: what changed, why, how to test, screenshots/recordings for UI changes
- [ ] Definition of Done checklist completed (`05_DEFINITION_OF_DONE.md`)
- [ ] No `console.log` statements left in production code paths
- [ ] No `any` types introduced
- [ ] Secrets/tokens not committed (checked by `src/lib/security/redact-secrets.ts` pattern)

**Review SLA:**
- P0/P1 tasks: 4-hour review SLA
- P2/P3 tasks: next business day

**Reviewer Requirements:**
- At minimum 1 peer engineer review
- For changes in `src/lib/supabase/`, `src/app/api/webhooks/`, `src/lib/security/`: additional security review required
- For changes to `AgentRuntimeService` pipeline: tech lead review required

**Merge Strategy:** Squash merge to `release/*` branch. Commit message must be descriptive: `feat(billing): implement Stripe checkout session [TASK-001.2.2.1]`

---

### 6. QA

PR merged to `release/*` branch. Deployed to staging environment. Under QA verification.

**WIP Limit:** Max 5 tasks in QA simultaneously.

**QA Process:**
1. Automated E2E tests run in staging (Playwright)
2. Manual smoke test of acceptance criteria from task definition
3. For billing features: manual Stripe test payment end-to-end
4. For webhook features: send test webhook payload and verify processing
5. For auth features: test with real IdP (staging Azure AD tenant)

**QA Failure Protocol:**
- Task moves back to In Development with detailed failure note
- Original engineer picks it up (not a new engineer)
- Bug fix is a new commit on the same feature branch, PR updated

**QA Pass Criteria:**
- All acceptance criteria from task definition verified
- No regressions in existing automated test suite
- Performance: no P95 latency increase > 20% from baseline

---

### 7. STAGING

QA complete. Awaiting production deployment window.

**WIP Limit:** Max 10 tasks in Staging (= one release candidate).

**Release Candidate Criteria (all required before production deployment):**
- [ ] All tasks in the release have passed QA
- [ ] Staging smoke test completed (see `docs/operations/staging-smoke-test-execution.md`)
- [ ] DB migrations tested in staging and rollback verified
- [ ] Sentry configured in staging environment and capturing errors
- [ ] Release notes written
- [ ] On-call engineer identified for post-deploy monitoring (minimum 2h)

**Staging to Production SLA:** Maximum 5 business days in Staging. If blocked longer, escalate.

---

### 8. PRODUCTION

Deployed to production. Under observation.

**WIP Limit:** None — this is the done state.

**Post-Deployment Monitoring Protocol:**
- Monitor Sentry for 2 hours post-deploy: no new error types
- Check Supabase connection count: no spike > 50% above baseline
- Verify Vercel function invocation count: no unexpected anomalies
- For billing deployments: verify one real Stripe test transaction in live mode (if possible) or confirm test mode disabled
- For WhatsApp deployments: verify inbound test message processed end-to-end

**Production Incident Protocol:**
- Any unhandled exception appearing in Sentry within 2h of deploy = investigate immediately
- If rollback required: use Vercel deployment rollback (instant) and Supabase migration rollback script (in `docs/architecture/44-release-and-rollback-plan.md`)

---

### 9. BLOCKED

Tasks that cannot progress due to an external dependency.

**WIP Limit:** None — but every task in Blocked is a risk register item.

**Required for Blocked Tasks:**
- Clear description of what is blocking it
- Owner of the blocking dependency (person's name or team)
- Expected resolution date
- Workaround in place (if applicable)

**Common Blockers:**
- Meta App approval pending (external, 1–4 weeks)
- Stripe account activation pending
- Azure AD test tenant not provisioned
- Inngest account not set up
- Third-party API credentials not provided by customer

**Blocked Review:** Every Thursday architecture sync reviews all Blocked tasks. If a task has been blocked > 1 week, CTO escalates.

---

## Board Labels

| Label | Colour | Meaning |
|---|---|---|
| `P0` | Red | Revenue blocker or security issue. Drop everything. |
| `P1` | Orange | Current sprint. Must ship this phase. |
| `P2` | Yellow | This phase if capacity allows. |
| `P3` | Grey | Next phase. |
| `phase-a` through `phase-g` | Blue | Phase tag |
| `needs-adr` | Purple | Requires ADR before implementation |
| `security` | Dark red | Security-sensitive change |
| `breaking-change` | Black | API contract change |
| `debt` | Brown | Technical debt item |

---

## Sprint Ceremonies

| Ceremony | Frequency | Duration | Format |
|---|---|---|---|
| Sprint Planning | Monday | 2h | Synchronous — review Backlog, move to Ready, confirm capacity |
| Daily Standup | Every day | — | Async written update in team channel |
| Architecture Sync | Thursday | 30min | Synchronous — ADR reviews, design proposals |
| Sprint Demo | Friday | 1h | Show working software in staging |
| Retrospective | Friday (after demo) | 30min | What shipped, what blocked us, what we improve next week |

---

## Capacity Planning

| Team Size | Velocity Target | Rationale |
|---|---|---|
| 1 engineer | 3–4 tasks/week | Single dev: shipping + review + ops |
| 2 engineers | 6–8 tasks/week | Cross-review overhead adds latency |
| 3–4 engineers | 10–14 tasks/week | Parallel tracks viable (product + platform) |
| 5–6 engineers | 15–18 tasks/week | Phase G peak capacity |

20% of capacity reserved for Platform Track (tech debt, observability, security) at all team sizes.
