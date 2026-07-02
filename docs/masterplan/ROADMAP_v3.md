# WAAI v3 — Technical Roadmap
**Document Type:** Strategic Planning  
**Date:** 2026-06-30  
**Status:** Authoritative  
**Horizon:** 3–5 years (2026–2031)

---

## Roadmap Overview

```
2026 H2                    2027 H1              2027 H2         2028+
────────────────────────────────────────────────────────────────────
Phase A          Phase B         Phase C     Phase D    Phase E
Platform         Enterprise      Agent       Workflow   Connector
Stabilization    Foundations     Platform    Platform   Platform
(4 weeks)        (6 weeks)       (8 weeks)   (8 weeks)  (6 weeks)
                                                  Phase F   Phase G
                                                  Enterprise AI OS
                                                  (6w)      (12w)
```

---

## Phase A — Platform Stabilization
**Duration:** 4 weeks  
**Start:** July 2026 (immediate)  
**End:** August 2026  

### Objective
Make WAAI revenue-ready, secure, and observable. Remove all blockers identified in the Enterprise Audit.

### Deliverables

| # | Deliverable | Owner | Effort | Blocker? |
|---|---|---|---|---|
| A1 | HTTP security headers in next.config.ts | Backend | 1 day | 🔴 YES |
| A2 | Stripe checkout + webhook implementation | Backend | 2 weeks | 🔴 YES |
| A3 | MetaCloudApiProvider implementation | Backend | 1 week | 🔴 YES |
| A4 | Wire AiCostService into AgentRuntimeService | Backend | 30 min | 🔴 YES |
| A5 | Password reset flow (UI + API) | Frontend + Backend | 2 days | 🔴 YES |
| A6 | Sentry error tracking activated | Infra | 1 day | 🟠 HIGH |
| A7 | TypeScript type-check + lint in CI | DevOps | 1 day | 🟠 HIGH |
| A8 | Anthropic API retry logic (3 attempts, exponential backoff) | Backend | 1 day | 🟠 HIGH |
| A9 | WhatsApp token encryption at rest | Backend | 2 days | 🟠 HIGH |
| A10 | /api/health version mismatch fix (0.8.0 → 0.9.0) | Backend | 5 min | 🟡 LOW |
| A11 | PgBouncer connection pooler enabled | Infra | 1 day | 🟡 LOW |
| A12 | Activate Anthropic prompt caching (ADR-0004 documented) | Backend | 1 day | 🟡 LOW |
| A13 | pg_cron: monthly usage counter reset | DB | 1 day | 🟡 LOW |

### Acceptance Criteria
- [ ] Stripe checkout page renders, payment processes, subscription activates
- [ ] Meta WhatsApp webhook receives and processes messages
- [ ] All security headers present (verify with securityheaders.com)
- [ ] AiCostService returns non-null `estimated_cost_cents` in production runs
- [ ] Password reset email delivered, password change works
- [ ] Sentry captures at least one test error
- [ ] CI blocks deploy on type errors

### Dependencies
- Stripe account with products and price IDs
- Meta Business Manager App approval (may run in sandbox initially)

### Risks
- Meta App approval can take 1–4 weeks; use sandbox mode in parallel
- Stripe webhook signing secret must be set in Vercel env before go-live

---

## Phase B — Enterprise Foundations
**Duration:** 6 weeks  
**Start:** August 2026  
**End:** October 2026  

### Objective
Lay the foundations required to close enterprise deals: multi-workspace support, API keys, GDPR documentation, audit export, and basic SSO.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| B1 | Organization + Department data model migration | 1 week |
| B2 | Multi-workspace per user (remove single-workspace constraint) | 1 week |
| B3 | Workspace switcher in navigation | 3 days |
| B4 | API Keys: create, revoke, scope, authenticate | 1 week |
| B5 | SSO: Azure AD SAML 2.0 integration | 1 week |
| B6 | SSO: Google Workspace OIDC | 3 days |
| B7 | GDPR Article 30 records of processing | 2 days |
| B8 | Audit log export (CSV/JSON download) | 3 days |
| B9 | User invitation flow (email invite to workspace) | 4 days |
| B10 | MFA enforcement policy (org-level toggle) | 3 days |
| B11 | Streaming SSE for sandbox chat | 1 week |
| B12 | Vitest baseline: first 50 unit tests on services | 2 weeks |

### Acceptance Criteria
- [ ] Enterprise customer can create org, departments, and workspaces
- [ ] Azure AD SSO login flow works end-to-end
- [ ] API key authentication works on all /v1/ routes
- [ ] Audit log exported with actor, action, timestamp, IP
- [ ] Sandbox chat shows streaming tokens in real-time

### Dependencies
- Phase A complete (security headers, auth stable)
- Azure AD test tenant for SSO development

---

## Phase C — Agent Platform
**Duration:** 8 weeks  
**Start:** October 2026  
**End:** December 2026  

### Objective
Launch the rich Agent v3 model. Agents gain goals, policies, tools, versioning, approvals, and health monitoring.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| C1 | Agent Goals: DB model + CRUD UI | 1 week |
| C2 | Agent Policies: rule engine + evaluation | 2 weeks |
| C3 | Agent Policy editor UI | 1 week |
| C4 | Agent Versioning: prompt history, rollback | 1 week |
| C5 | Agent Health dashboard (error rate, latency p95, cost/day) | 1 week |
| C6 | Tool Registry infrastructure | 2 weeks |
| C7 | Built-in tools: search_knowledge, create_lead, request_handoff | 1 week |
| C8 | Approval Engine: policies, request flow, decision UI | 2 weeks |
| C9 | Approval notifications (email + in-app) | 3 days |
| C10 | Agent Lifecycle: draft → review → published | 1 week |
| C11 | LLM Router: multi-provider routing (env-var based) | 1 week |
| C12 | Memory Service v1: per-user facts persisted across sessions | 2 weeks |
| C13 | OpenAI GPT-4o provider implementation | 1 week |
| C14 | Test coverage: 100 tests, core services | 2 weeks |

### Acceptance Criteria
- [ ] Agent with forbidden topic policy blocks those topics in sandbox
- [ ] Agent version rollback works (restore previous prompt, no data loss)
- [ ] Approval request created, notified, approved, workflow continues
- [ ] Tool `create_lead` called from agent and lead appears in dashboard
- [ ] Agent health card shows accurate error rate from last 24h data
- [ ] Memory: agent recalls user's name from previous conversation

### Dependencies
- Phase B complete (org structure, API keys)
- Inngest account set up (for async approval notifications)

---

## Phase D — Workflow Platform
**Duration:** 8 weeks  
**Start:** January 2027  
**End:** March 2027  

### Objective
Launch the visual workflow engine. Allow non-technical users to build multi-step agent automations with conditions, approvals, and scheduling.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| D1 | Workflow data model (waai_workflows, runs, steps) | 1 week |
| D2 | Workflow execution engine (Inngest-based) | 3 weeks |
| D3 | Node types: Trigger, Condition, Action, Agent, Approval, Loop | 2 weeks |
| D4 | React Flow visual editor (drag-and-drop) | 3 weeks |
| D5 | Trigger types: inbound_message, schedule, webhook, manual | 1 week |
| D6 | Action nodes: send_message, create_lead, call_webhook | 1 week |
| D7 | Workflow run history + step visualization | 1 week |
| D8 | Workflow template library (5 pre-built templates) | 1 week |
| D9 | SubWorkflow composition (call workflow from workflow) | 1 week |
| D10 | Inngest dashboard integration for debugging | 3 days |
| D11 | Upstash Redis caching layer | 1 week |
| D12 | Test coverage: integration tests on workflow execution | 2 weeks |

### Acceptance Criteria
- [ ] Workflow built in visual editor and saved
- [ ] Inbound WhatsApp message triggers workflow, executes all nodes
- [ ] Condition node branches correctly on message content
- [ ] Approval node pauses execution, notifies approver, resumes on decision
- [ ] Scheduled workflow runs at correct cron time
- [ ] Failed node retries automatically (3 attempts)
- [ ] Run history shows per-step success/failure with duration

### Dependencies
- Phase C complete (Agent v3 model, Tool Registry)
- React Flow library licensed/configured

---

## Phase E — Connector Platform
**Duration:** 6 weeks  
**Start:** April 2027  
**End:** May 2027  

### Objective
Expand WAAI beyond WhatsApp. Launch Email, Telegram, and basic CRM connectors. Establish the pluggable connector architecture.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| E1 | ConnectorRegistry + base Connector interface | 1 week |
| E2 | Email Connector: Resend inbound + outbound | 2 weeks |
| E3 | Telegram Bot Connector | 1 week |
| E4 | HubSpot CRM Connector (read + create_contact) | 2 weeks |
| E5 | Google Calendar Connector (read slots + create event) | 2 weeks |
| E6 | Connector health monitoring (circuit breaker) | 1 week |
| E7 | Multi-channel conversation routing (unified inbox) | 2 weeks |
| E8 | Channel-specific response formatting (Email HTML, Telegram Markdown) | 1 week |

### Acceptance Criteria
- [ ] Agent responds to email (inbound → processing → outbound reply)
- [ ] Telegram bot sends and receives messages via agent
- [ ] HubSpot contact created from lead detection
- [ ] Calendar slot booked from natural language ("book me for Thursday")
- [ ] Unified inbox shows messages from all channels in one view

### Dependencies
- Phase D complete (workflow engine for multi-step connector actions)
- HubSpot sandbox account
- Google Cloud OAuth app registration

---

## Phase F — Enterprise Features
**Duration:** 6 weeks  
**Start:** June 2027  
**End:** July 2027  

### Objective
Close enterprise sales. Ship SCIM, Microsoft Teams, Slack, Salesforce, and compliance certifications.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| F1 | SCIM 2.0 user provisioning (Azure AD + Okta) | 2 weeks |
| F2 | Microsoft Teams Bot connector | 2 weeks |
| F3 | Slack Events API connector | 2 weeks |
| F4 | Salesforce CRM connector | 2 weeks |
| F5 | SharePoint document connector → Knowledge Domain | 2 weeks |
| F6 | ISO 27001 readiness assessment | 2 weeks |
| F7 | Enterprise billing: custom agreements, overage | 1 week |
| F8 | White-label: custom domain, logo per workspace | 2 weeks |
| F9 | SIEM log export (Splunk/Elastic webhook) | 1 week |
| F10 | A/B testing: prompt variant comparison | 2 weeks |
| F11 | Test coverage: 250 tests, E2E with Playwright | 4 weeks |

### Acceptance Criteria
- [ ] Azure AD SCIM sync creates/deactivates WAAI users automatically
- [ ] Teams bot deployed, receives and replies to channel messages
- [ ] Enterprise customer on custom domain with org logo
- [ ] Overage billing tracked and invoiced
- [ ] ISO 27001 gap assessment complete with remediation plan

### Dependencies
- Phase E complete
- Azure Bot Framework app registration
- Slack app approval

---

## Phase G — AI Operating System
**Duration:** 12 weeks  
**Start:** August 2027  
**End:** November 2027  

### Objective
Transform WAAI into a full AI Operating System. Multi-agent collaboration, autonomous planning, advanced memory, and SOC 2 certification.

### Deliverables

| # | Deliverable | Effort |
|---|---|---|
| G1 | Multi-Agent Orchestrator (orchestrator + specialist pattern) | 4 weeks |
| G2 | Autonomous agent mode (proactive outreach, follow-ups) | 3 weeks |
| G3 | Advanced Memory: agent learning, cross-workspace insights | 3 weeks |
| G4 | Model Evaluation: per-model performance, cost comparison | 2 weeks |
| G5 | Developer Platform: public API v1 + webhook subscriptions | 3 weeks |
| G6 | MCP Server: WAAI as MCP server for external AI agents | 2 weeks |
| G7 | TypeScript + Python SDK | 2 weeks |
| G8 | Execution service extraction (separate deployment) | 4 weeks |
| G9 | Multi-region deployment (EU + US + CH) | 4 weeks |
| G10 | SOC 2 Type II audit initiation | Ongoing |
| G11 | Reasoning Engine: chain-of-thought for complex decisions | 3 weeks |
| G12 | Agent Marketplace: publish/share agent templates | 3 weeks |

### Acceptance Criteria
- [ ] Orchestrator delegates to 3 specialist agents and synthesizes response
- [ ] Autonomous agent sends proactive follow-up 24h after lead captured
- [ ] Agent recalls user preference from conversation 30 days prior
- [ ] Public API: external developer sends message to agent via API key
- [ ] SOC 2 audit initiated with third-party auditor

### Dependencies
- Phases A–F complete
- Dedicated infrastructure for execution service

---

## Effort Summary

| Phase | Duration | Primary Investment | Expected Outcome |
|---|---|---|---|
| A | 4 weeks | 2 engineers | Revenue-ready |
| B | 6 weeks | 2–3 engineers | Enterprise POC-ready |
| C | 8 weeks | 3 engineers | Agent v3 — competitive differentiation |
| D | 8 weeks | 3–4 engineers | Workflow platform — new revenue segment |
| E | 6 weeks | 2–3 engineers | Multi-channel expansion |
| F | 6 weeks | 3–4 engineers | Enterprise closed |
| G | 12 weeks | 4–6 engineers | AI Operating System — market leadership |
| **Total** | **~50 weeks** | **Peak: 6 engineers** | **Enterprise AI Agent Platform** |

---

## Key Milestones

| Date | Milestone |
|---|---|
| Aug 2026 | Phase A complete — first paying customer |
| Oct 2026 | Phase B complete — first enterprise pilot |
| Dec 2026 | Phase C complete — Agent v3 launch |
| Mar 2027 | Phase D complete — workflow platform launch |
| May 2027 | Phase E complete — multi-channel launch |
| Jul 2027 | Phase F complete — enterprise GA |
| Nov 2027 | Phase G complete — AI Operating System |
| Q1 2028 | SOC 2 Type II certification |
