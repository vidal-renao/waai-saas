# WAAI — Execution Roadmap
**Document Type:** Programme Plan  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Horizon:** 12 months (July 2026 — June 2027)

---

## Roadmap Overview

```
Jul 2026          Aug 2026          Oct 2026          Dec 2026
────────────────────────────────────────────────────────────
PHASE A (4w)     PHASE B (6w)      PHASE C (8w)
Stabilisation    Enterprise        Agent Platform v3
Revenue-Ready    Foundations       
                                  
Jan 2027          Mar 2027          May 2027
────────────────────────────────────────────
PHASE D (8w)     PHASE E (6w)
Workflow         Connector Platform
Platform         
```

---

## Month 1 — Phase A: Revenue Foundation (July 2026)

**Theme:** Fix everything that blocks revenue collection and enterprise security reviews.  
**Team size:** 1–2 engineers  
**Target milestone:** First paying customer by end of month.

---

### Week 1 (July 1–4, 2026) — Stop the Bleeding

**Goal:** Close the 7 P0 security and observability gaps.

| Day | Task | Owner | Expected Output |
|---|---|---|---|
| Mon | TASK-001.1.1.1: Security headers in `next.config.ts` | Eng 1 | All 6 headers present, securityheaders.com B+ |
| Mon | TASK-001.7.1.1–2: TypeScript + lint in CI | Eng 1 | CI fails on type errors |
| Tue | TASK-001.4.1.1: Wire `AiCostService` into `AgentRuntimeService` | Eng 1 | `estimated_cost_cents` non-null in DB |
| Tue | TASK-001.6.1.1: Install Sentry, configure Next.js | Eng 1 | Sentry DSN active in Vercel |
| Wed | TASK-001.5.1.1: Forgot password page | Eng 1 | Email form sends reset link |
| Thu | TASK-001.5.1.2: Reset password page | Eng 1 | New password accepted, login works |
| Thu | TASK-001.6.1.5: Sentry alert rules | Eng 1 | Alerts configured for CLAUDE_ERROR, webhook_failed |
| Fri | TASK-001.3.1.1–3: Start MetaCloudApiProvider (signature + send) | Eng 1 | `verify()` and `send()` implemented |

**Week 1 Checkpoint:** Security headers live. Cost tracking live. Sentry live. Password reset live.

---

### Week 2 (July 7–11, 2026) — Revenue Foundation

**Goal:** Stripe checkout + Meta WhatsApp provider + Anthropic reliability.

| Day | Task | Owner | Expected Output |
|---|---|---|---|
| Mon | TASK-001.2.1.1–3: Stripe products and prices in test mode | Eng 1 | Price IDs created and in `.env` |
| Mon | TASK-001.8.1.1: Anthropic retry logic | Eng 1 | 3 retries on 429/529 |
| Tue | TASK-001.2.2.1–2: Stripe checkout session API | Eng 1 | `POST /api/billing/checkout` returns Stripe URL |
| Tue | TASK-001.9.1.1–2: Token encryption implementation | Eng 1 | AES-256-GCM encrypt/decrypt working |
| Wed | TASK-001.2.3.1–3: Stripe webhook handler | Eng 1 | `checkout.session.completed` activates subscription |
| Wed | TASK-001.3.1.4–6: Meta `normalize()` + factory case | Eng 1 | Meta webhooks normalized to `InboundMessage` |
| Thu | Enable PgBouncer in Supabase dashboard | Eng 1 | Port 6543 active, tested |
| Thu | TASK-001.2.4.1: Stripe billing portal | Eng 1 | `POST /api/billing/portal` returns portal URL |
| Fri | TASK-001.13.1: pg_cron monthly counter reset | Eng 1 | Counter resets on 1st of month |
| Fri | End-to-end Stripe test: checkout → subscription activation | Eng 1 | Full payment flow verified |

**Week 2 Checkpoint:** Stripe E2E working in test mode. Meta provider processes real webhook.

---

### Week 3 (July 14–18, 2026) — Stability Sprint (Part 1)

**Goal:** Observability, reliability, and billing UI.

| Day | Task | Owner | Expected Output |
|---|---|---|---|
| Mon | TASK-001.6.1.2–3: Sentry on all service catch blocks | Eng 1 | All exceptions captured |
| Mon | TASK-001.6.1.6: Sentry performance on agent runtime | Eng 1 | p95 latency visible in Sentry |
| Tue | TASK-001.2.2.4: Upgrade modal UI | Eng 1 | Upgrade button in dashboard |
| Tue | TASK-001.9.1.3: Token encryption migration (existing tokens) | Eng 1 | All tokens encrypted at rest |
| Wed | TASK-001.3.1.7–8: Meta env vars + unit tests | Eng 1 | Meta provider fully tested |
| Thu | TASK-001.12.1.1: Activate Anthropic prompt caching | Eng 1 | `cache_control` applied to system prompt layer |
| Fri | Week 3 review: smoke test all Phase A features in staging | All | All features verified in staging |

---

### Week 4 (July 21–25, 2026) — Phase A Hardening + Launch

**Goal:** Consolidate, test, prepare for production launch.

| Day | Task | Owner | Expected Output |
|---|---|---|---|
| Mon | TASK-001.15.1: Health endpoint reads version from `package.json` | Eng 1 | `/api/health` returns correct version |
| Mon | Fix DEBT-009: Consolidate message limit checks to RPC path | Eng 1 | Single limit check path |
| Tue | Write 10 unit tests on `AgentRuntimeService` | Eng 1 | 10 passing tests in CI |
| Wed | Stripe go-live: switch from test keys to live keys | Eng 1 | Live payments enabled |
| Wed | Meta App sandbox registration (if not already submitted) | Eng 1 | Sandbox messaging working |
| Thu | Phase A acceptance criteria verification — full checklist | Eng 1 | All criteria checked off |
| Fri | **Phase A production deployment** — version `1.0.0` | Eng 1 | First paying customer can convert |
| Fri | Post-deploy monitoring: 2 hours watching Sentry + Vercel | Eng 1 | No new error types |

**Month 1 Milestone:** WAAI `v1.0.0` — Revenue-ready, secure, observable.

---

## Month 2 (August 2026) — Phase B: Enterprise Foundations (Part 1)

**Theme:** Build the org hierarchy and identity infrastructure for enterprise deals.

### Week 5–6 — Organisation Data Model

- Write and apply Supabase migration: `waai_organizations`, `waai_departments`, `waai_organization_members`
- `ALTER TABLE waai_workspaces ADD COLUMN org_id, department_id`
- Add RLS policies for all new tables
- Implement `OrganizationRepository`, `DepartmentRepository`
- Implement `CreateOrganizationUseCase`, API routes
- Remove single-workspace-per-user constraint (schema change + service layer)
- Build workspace switcher in navigation header

**Deliverable:** Users can create an organization, departments, and multiple workspaces.

### Week 7 — API Keys

- Implement `waai_api_keys` migration + `ApiKeyService` + `ApiKeyAuthMiddleware`
- Apply middleware to all `/api/v1/` routes
- Build API key management UI: create, revoke, last-used-at

**Deliverable:** Enterprise integrations can authenticate via API key.

---

## Month 3 (September 2026) — Phase B: Enterprise Foundations (Part 2)

### Week 9–10 — SSO

- Implement `waai_sso_configs` migration
- Configure Supabase Auth SAML 2.0 (Azure AD)
- Email domain → SSO detection API
- JIT user provisioning on SSO callback
- SSO configuration UI in admin portal
- Google Workspace OIDC implementation

**Deliverable:** Enterprise customers can authenticate with Azure AD and Google Workspace.

### Week 11 — Compliance + User Management

- GDPR Article 30 records of processing (legal document)
- Audit log export UI (CSV/JSON with filters)
- User invitation flow (email invite → accept → workspace member)
- MFA enforcement policy (org-level TOTP toggle)

### Week 12–13 — Streaming + Tests

- Streaming SSE for sandbox chat (SSE stream from LLM to browser)
- 50 unit tests on services (billing, agent runtime, workspace, plan enforcement)
- Phase B acceptance criteria verification
- **Phase B release: v1.1.0** — first enterprise pilot onboarded

**Month 3 Milestone:** WAAI `v1.1.0` — Enterprise pilot-ready. First enterprise pilot onboarded.

---

## Month 4 (October 2026) — Phase C: Agent Platform v3 (Part 1)

**Theme:** Give agents goals, policies, tools, versioning, and a health dashboard.

### Week 13–14 — Agent Goals + Policies

- `waai_agent_goals` migration + CRUD API + Goals UI
- `waai_agent_policies` migration + `PolicyEvaluationService`
- Shadow mode policy enforcement (log violations, don't block)
- Policy editor UI (add/remove rules, test against sample)
- Integrate policy evaluation into `AgentRuntimeService` (steps 1 and post-LLM)

### Week 15–16 — Agent Versioning + Health

- `waai_agent_versions` migration
- Version increment on every config change
- Version history UI with rollback button
- Agent health dashboard: error rate, latency p95, cost/day, handoff rate
- Health status computation and visual health indicator

---

## Month 5 (November 2026) — Phase C: Agent Platform v3 (Part 2)

### Week 17–18 — Tool Registry + Approvals

- `Tool` interface + `ToolRegistry` singleton
- Built-in tools: `search_knowledge`, `create_lead`, `request_handoff`
- `waai_approval_policies`, `waai_approval_requests` migrations
- `ApprovalService` with risk routing
- Approval queue UI
- Email notifications via Resend
- Inngest SLA timer for auto-escalation

### Week 19–20 — Memory Service + LLM Router

- `waai_user_memories` migration
- Fact extraction: Claude Haiku call after conversation
- Memory injection in Layer 3 of prompt assembly
- Memory UI: view/delete user memories
- LLM Router with 4 routing rules
- OpenAI GPT-4o provider implementation
- 100 unit tests total
- **Phase C release: v1.2.0**

**Month 5 Milestone:** WAAI `v1.2.0` — Agent v3 with goals, policies, tools, versioning, approvals, memory.

---

## Month 6 (December 2026) — Phase D: Workflow Platform (Part 1)

**Theme:** Visual no-code workflow engine with DAG execution.

### Week 21–22 — Workflow Data Model + Execution Engine

- `waai_workflows`, `waai_workflow_runs`, `waai_workflow_steps` migrations + RLS
- `WorkflowExecutionEngine` with Inngest-based async DAG
- Node types: Trigger (inbound_message, schedule, manual), Condition (JSON expression evaluator)
- Node output → next node input variable binding
- Step idempotency using Inngest event IDs

### Week 23–24 — Workflow Nodes

- Action nodes: `send_message`, `create_lead`, `call_webhook`
- Agent node: invoke WAAI agent as workflow step
- Approval node: pause DAG + resume on decision
- Loop node with safety max-iterations limit
- SubWorkflow composition

---

## Month 7 (January 2027) — Phase D: Workflow Platform (Part 2)

### Week 25–28 — Visual Editor + Templates

- Install React Flow, build canvas + node palette
- Node configuration panels (right-side drawer)
- Variable binding UI (map Node A output → Node B input)
- Workflow validation (pre-save: detect cycles, missing connections)
- Workflow run history view (per-step status, duration, I/O)
- 5 workflow templates (Lead Qualification, Appointment Booking, Weekly Report, Follow-up, Escalation)
- Inngest dashboard integration for debugging
- Upstash Redis caching layer (agent config, plan limits, session tokens)
- Integration tests on workflow execution
- **Phase D release: v2.0.0**

**Month 7 Milestone:** WAAI `v2.0.0` — Visual Workflow Platform live. New revenue segment unlocked.

---

## Month 8 (February 2027) — Phase E: Connector Platform (Part 1)

- `ConnectorRegistry` base infrastructure (replaces `WhatsappProviderFactory`)
- Email Connector: Resend inbound webhook + outbound send
- Telegram Bot Connector
- Connector health monitoring + circuit breaker
- Channel-specific response formatting (Email HTML, Telegram Markdown)

---

## Month 9 (March 2027) — Phase E: Connector Platform (Part 2)

- HubSpot CRM Connector (OAuth2, create/search contact)
- Google Calendar Connector (available slots, create event)
- Multi-channel unified inbox (all channels in one view)
- **Phase E release: v2.1.0**

**Month 9 Milestone:** WAAI `v2.1.0` — Multi-channel. Email, Telegram, HubSpot, Google Calendar live.

---

## Month 10 (April 2027) — Phase F: Enterprise GA (Part 1)

- SCIM 2.0 user provisioning (Azure AD + Okta): Users, Groups endpoints
- Microsoft Teams Bot connector (Bot Framework Activity Handler)
- Slack Events API connector (HMAC-SHA256 verification, chat.postMessage)
- SIEM log export (Splunk/Elastic webhook)

---

## Month 11 (May 2027) — Phase F: Enterprise GA (Part 2)

- Salesforce CRM connector (OAuth2, contacts + opportunities)
- SharePoint document → Knowledge connector
- ISO 27001 gap assessment (engage assessor)
- Enterprise billing: custom agreements, overage tracking
- White-label: custom domain (next.config.ts rewrites) + logo per workspace
- A/B testing: prompt variant comparison
- 250 tests (unit + E2E Playwright)
- **Phase F release: v2.2.0**

**Month 11 Milestone:** WAAI `v2.2.0` — Enterprise GA. First major enterprise contract target.

---

## Month 12 (June 2027) — Buffer + Phase G Kickoff

**Buffer week (June 1–7):** Any slippage from Phase F resolved.

**Phase G Kickoff (June 8–30):**
- Architecture design for Multi-Agent Orchestrator (ADR-0009)
- Spike: Execution service extraction (determine feasibility and boundary)
- Developer platform API design (OpenAPI spec draft for `/v1/`)
- Onboard Phase G engineers

**Month 12 Milestone:** Phase G design complete. Implementation team assembled.

---

## Critical Path

The critical path through Month 12:

```
Stripe (Week 2) 
    → First Paying Customer (Week 4) 
    → SSO (Month 3) 
    → First Enterprise Pilot (Month 3) 
    → Agent Policies (Month 4) 
    → Agent Approvals (Month 5) 
    → Workflow Engine (Month 6–7) 
    → ConnectorRegistry (Month 8) 
    → SCIM (Month 10) 
    → ISO 27001 Assessment (Month 11) 
    → Enterprise Contract (Month 11)
```

Any delay on the critical path delays revenue. The Stripe implementation in Week 2 is the single most important engineering task in the company right now.

---

## Risk and Contingency

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Meta App approval takes 4+ weeks | HIGH | Phase A delayed | Keep Whapi as production. Meta in sandbox/parallel |
| Stripe go-live requires PCI compliance evidence | MEDIUM | Week 4 delayed | Complete Stripe checklist in `docs/architecture/40-stripe-readiness-plan.md` week 1 |
| React Flow learning curve > estimated | MEDIUM | Phase D +1 week | Spike in week 21 before committing to implementation approach |
| ISO 27001 assessment finds major gaps | MEDIUM | Phase F +4 weeks | Start assessment in Month 10 to allow remediation time |
| Engineer capacity < 2 engineers | HIGH | All phases +50% | Single engineer can still complete A–C, just more slowly |
