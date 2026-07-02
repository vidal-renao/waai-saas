# WAAI — Product Backlog
**Document Type:** Engineering Backlog  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Source:** ROADMAP_v3.md + Enterprise Audit CTOVerdict.md

---

## Backlog Legend

**Priority:** P0 (blocker) · P1 (next sprint) · P2 (this phase) · P3 (next phase)  
**Effort:** XS (< 1 day) · S (1–3 days) · M (1 week) · L (2 weeks) · XL (3+ weeks)  
**Status:** Backlog · Ready · In Progress · Done

---

## EPIC-001 — Platform Stabilisation (Phase A)

**Objective:** Remove every blocker that prevents revenue collection and enterprise security review.  
**Business Value:** No revenue is collectable in the current state. Phase A makes WAAI legally and technically able to accept its first paying customer.  
**Technical Value:** Closes the three CTO Audit critical blockers; establishes monitoring baseline.  
**Dependencies:** None — this is the foundation.  
**Priority:** P0 — must complete before any other epic.  
**Estimated Duration:** 4 weeks  

**Acceptance Criteria:**
- [ ] `securityheaders.com` scan returns A or B grade for waai.ai
- [ ] Stripe checkout page loads, card processes, subscription row created in `waai_subscriptions`
- [ ] Meta WhatsApp webhook receives real message, agent responds
- [ ] `AiCostService.estimateCost()` returns non-null `estimated_cost_cents` in Sentry breadcrumbs
- [ ] Password reset: user receives email, resets password, logs in
- [ ] Sentry captures at least one intentional test error in production
- [ ] CI pipeline blocks on TypeScript errors and lint failures
- [ ] `/api/health` returns version `1.0.0`

**Definition of Done:**  
All acceptance criteria verified in production. Sentry alert rules configured. Stripe test mode confirmed off. Post-deploy smoke test passed (see `docs/testing/phase9-production-smoke-test-checklist.md`).

---

### Features in EPIC-001

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-001.1 | HTTP Security Headers | P0 | XS |
| FEAT-001.2 | Stripe Billing Implementation | P0 | L |
| FEAT-001.3 | Meta WhatsApp Cloud API Provider | P0 | M |
| FEAT-001.4 | AI Cost Service Wiring | P0 | XS |
| FEAT-001.5 | Password Reset Flow | P0 | S |
| FEAT-001.6 | Sentry Error Tracking | P1 | S |
| FEAT-001.7 | CI Type-Check + Lint | P1 | XS |
| FEAT-001.8 | Anthropic Retry Logic | P1 | S |
| FEAT-001.9 | WhatsApp Token Encryption | P1 | S |
| FEAT-001.10 | PgBouncer Connection Pooler | P1 | XS |
| FEAT-001.11 | Anthropic Prompt Caching | P2 | S |
| FEAT-001.12 | pg_cron Monthly Counter Reset | P2 | S |
| FEAT-001.13 | Health Endpoint Version Fix | P2 | XS |

---

## EPIC-002 — Enterprise Foundations (Phase B)

**Objective:** Build the organizational, identity, and API infrastructure required for the first enterprise pilot.  
**Business Value:** Enterprise deals (CHF 10,000–50,000 ARR) are blocked without SSO, API keys, and multi-workspace support. These capabilities unlock the DACH enterprise segment.  
**Technical Value:** Establishes the org hierarchy that all future enterprise features build on. SSO and SCIM are designed once, never retrofitted.  
**Dependencies:** EPIC-001 complete (stable auth baseline required).  
**Priority:** P1  
**Estimated Duration:** 6 weeks  

**Acceptance Criteria:**
- [ ] Enterprise customer creates organization, two departments, three workspaces
- [ ] One user switches between two workspaces without re-login
- [ ] Azure AD SAML 2.0 SSO: login with corporate credentials, land in correct workspace
- [ ] Google Workspace OIDC: same flow
- [ ] API key created, used in curl to POST `/v1/agents/{id}/messages`, succeeds
- [ ] Audit log exported as CSV with actor, action, IP, timestamp columns
- [ ] Team member invited via email, accepts, joins workspace
- [ ] MFA enrollment via TOTP works and is enforced for workspace_admin role
- [ ] Sandbox chat shows streaming tokens in real-time (SSE)
- [ ] Test suite: 50 unit tests passing in CI

**Definition of Done:**  
All acceptance criteria verified in staging by QA. One real enterprise pilot customer onboarded. DPA template reviewed by legal.

---

### Features in EPIC-002

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-002.1 | Organization + Department Data Model | P1 | M |
| FEAT-002.2 | Multi-Workspace Per User | P1 | M |
| FEAT-002.3 | Workspace Switcher UI | P1 | S |
| FEAT-002.4 | API Key Management (Create/Revoke/Auth) | P1 | M |
| FEAT-002.5 | SSO — Azure AD SAML 2.0 | P1 | M |
| FEAT-002.6 | SSO — Google Workspace OIDC | P1 | S |
| FEAT-002.7 | GDPR Article 30 Records of Processing | P1 | S |
| FEAT-002.8 | Audit Log Export (CSV/JSON) | P1 | S |
| FEAT-002.9 | User Invitation Flow | P1 | S |
| FEAT-002.10 | MFA Enforcement (TOTP via Supabase MFA) | P2 | S |
| FEAT-002.11 | Streaming SSE for Sandbox Chat | P1 | M |
| FEAT-002.12 | Vitest Baseline: 50 Unit Tests | P1 | L |

---

## EPIC-003 — Agent Platform v3 (Phase C)

**Objective:** Transform WAAI agents from simple prompt wrappers into governed, goal-driven, policy-enforced AI entities.  
**Business Value:** Agent v3 is the core competitive differentiator. Policies, approvals, and versioning are the features that enterprise buyers cannot find elsewhere in the DACH WhatsApp AI market.  
**Technical Value:** Establishes the Tool Registry, Policy Engine, and Memory Service — the infrastructure that makes agents extensible without code changes.  
**Dependencies:** EPIC-002 complete (org model required for multi-workspace agent management).  
**Priority:** P1  
**Estimated Duration:** 8 weeks  

**Acceptance Criteria:**
- [ ] Agent with `forbidden_topic` policy blocks those topics and logs violation
- [ ] Agent version rolled back: previous prompt restored, conversation history preserved
- [ ] Approval request created by agent, emailed to human_agent, approved, workflow continues
- [ ] `create_lead` tool called by agent, lead appears in dashboard with correct data
- [ ] Agent health card: error rate, latency p95, cost/day — all accurate from last 24h
- [ ] Memory: returning user addressed by name from memory of previous conversation
- [ ] OpenAI GPT-4o routes correctly when `LLM_PROVIDER=openai` env var set
- [ ] 100 unit tests passing in CI

**Definition of Done:**  
Policies tested in shadow mode with one real workspace. One agent version rollback performed in production. Approval round-trip (create → notify → approve → continue) verified in staging.

---

### Features in EPIC-003

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-003.1 | Agent Goals Data Model + CRUD UI | P1 | M |
| FEAT-003.2 | Agent Policy Rule Engine | P1 | L |
| FEAT-003.3 | Agent Policy Editor UI | P1 | M |
| FEAT-003.4 | Agent Versioning (Prompt History + Rollback) | P1 | M |
| FEAT-003.5 | Agent Health Dashboard | P1 | M |
| FEAT-003.6 | Tool Registry Infrastructure | P1 | L |
| FEAT-003.7 | Built-in Tools (search_knowledge, create_lead, request_handoff) | P1 | M |
| FEAT-003.8 | Approval Engine (Policies + Request Flow + Decision UI) | P1 | L |
| FEAT-003.9 | Approval Notifications (Email + In-App) | P2 | S |
| FEAT-003.10 | Agent Lifecycle (Draft → Review → Published) | P1 | M |
| FEAT-003.11 | LLM Router (Multi-Provider Env-Var Routing) | P1 | M |
| FEAT-003.12 | Memory Service v1 (Per-User Facts) | P1 | L |
| FEAT-003.13 | OpenAI GPT-4o Provider | P2 | M |
| FEAT-003.14 | Test Coverage: 100 Tests | P1 | L |

---

## EPIC-004 — Workflow Platform (Phase D)

**Objective:** Launch a visual, no-code workflow engine allowing non-technical users to build multi-step agent automations.  
**Business Value:** Unlocks a new revenue segment (workflow automation buyers) and increases WAAI's enterprise ACV by 40–60% (estimated) by replacing point solutions for appointment booking, lead qualification, and follow-up sequences.  
**Technical Value:** Establishes the DAG execution model and Inngest async queue — the infrastructure for all Phase E and F connector integrations.  
**Dependencies:** EPIC-003 complete (Tool Registry and Approval Engine required as workflow nodes).  
**Priority:** P1  
**Estimated Duration:** 8 weeks  

**Acceptance Criteria:**
- [ ] Workflow built in visual editor, saved, and executed end-to-end
- [ ] Inbound WhatsApp message triggers workflow, all nodes execute in correct order
- [ ] Condition node branches correctly on `lead_score > 7` expression
- [ ] Approval node pauses execution, email sent, approver approves, workflow resumes
- [ ] Scheduled workflow runs at configured cron time (± 1 minute)
- [ ] Failed node retries 3 times with exponential backoff before marking step failed
- [ ] Run history shows per-step success/failure with duration in ms
- [ ] SubWorkflow composition: parent workflow calls child workflow, receives output

**Definition of Done:**  
Three workflow templates shipped (Lead Qualification, Appointment Booking, Weekly Report). One real customer workflow running in production. Inngest dashboard integrated for debugging.

---

### Features in EPIC-004

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-004.1 | Workflow Data Model (waai_workflows, runs, steps) | P1 | M |
| FEAT-004.2 | WorkflowExecutionEngine (Inngest-Based) | P1 | XL |
| FEAT-004.3 | Node Types: Trigger, Condition, Action, Agent, Approval, Loop | P1 | L |
| FEAT-004.4 | React Flow Visual Editor (Canvas + Palette) | P1 | XL |
| FEAT-004.5 | Trigger Types (inbound_message, schedule, webhook, manual) | P1 | M |
| FEAT-004.6 | Action Nodes (send_message, create_lead, call_webhook) | P1 | M |
| FEAT-004.7 | Workflow Run History + Step Visualisation | P1 | M |
| FEAT-004.8 | Workflow Template Library (5 Templates) | P2 | M |
| FEAT-004.9 | SubWorkflow Composition | P2 | M |
| FEAT-004.10 | Inngest Dashboard Integration | P2 | S |
| FEAT-004.11 | Upstash Redis Caching Layer | P2 | M |
| FEAT-004.12 | Integration Tests: Workflow Execution | P1 | L |

---

## EPIC-005 — Connector Platform (Phase E)

**Objective:** Expand WAAI beyond WhatsApp with a pluggable connector architecture and launch Email, Telegram, and basic CRM connectors.  
**Business Value:** 37% of DACH SMEs use email as primary customer communication (estimated). Telegram is the #2 messaging app in CH. HubSpot/Google Calendar integration closes deals for professional services verticals.  
**Technical Value:** ConnectorRegistry replaces the current WhatsApp-specific `WhatsappProviderFactory`, making channel addition a configuration exercise, not an engineering sprint.  
**Dependencies:** EPIC-004 complete (Workflow Engine required for multi-step connector sequences).  
**Priority:** P1  
**Estimated Duration:** 6 weeks  

**Acceptance Criteria:**
- [ ] ConnectorRegistry: adding a new connector requires zero changes to `AgentRuntimeService`
- [ ] Email Connector: inbound email triggers agent, agent replies via Resend
- [ ] Telegram: bot sends and receives messages through agent
- [ ] HubSpot: `create_contact` tool creates HubSpot contact from agent lead detection
- [ ] Google Calendar: `get_available_slots` returns real slots, `create_event` books them
- [ ] Unified inbox shows messages from WhatsApp, Email, Telegram in one view

**Definition of Done:**  
All connectors have health monitoring and circuit breaker. At least one customer using Email connector in production. Connector development guide (`docs/execution/11_CONNECTOR_GUIDE.md`) updated with first connector implementation example.

---

### Features in EPIC-005

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-005.1 | ConnectorRegistry + Base Connector Interface | P1 | M |
| FEAT-005.2 | Email Connector (Resend Inbound + Outbound) | P1 | L |
| FEAT-005.3 | Telegram Bot Connector | P1 | M |
| FEAT-005.4 | HubSpot CRM Connector | P1 | L |
| FEAT-005.5 | Google Calendar Connector | P1 | L |
| FEAT-005.6 | Connector Health Monitoring (Circuit Breaker) | P1 | M |
| FEAT-005.7 | Multi-Channel Unified Inbox | P1 | L |
| FEAT-005.8 | Channel-Specific Response Formatting | P2 | M |

---

## EPIC-006 — Enterprise GA (Phase F)

**Objective:** Close enterprise contracts. Ship SCIM, Microsoft Teams, Slack, Salesforce, and ISO 27001 readiness.  
**Business Value:** CHF 50,000+ enterprise contracts in DACH require Teams/Slack, Salesforce, and SCIM provisioning. ISO 27001 is a procurement gate for Swiss financial and healthcare customers.  
**Technical Value:** SCIM completes the identity lifecycle. Salesforce connector enables agent-to-CRM data flow at enterprise scale.  
**Dependencies:** EPIC-005 complete (ConnectorRegistry required for Teams and Slack connectors).  
**Priority:** P1  
**Estimated Duration:** 6 weeks  

**Acceptance Criteria:**
- [ ] Azure AD SCIM: user created in Azure AD → user created in WAAI (< 5 min)
- [ ] Azure AD SCIM: user disabled in Azure AD → user deactivated in WAAI
- [ ] Microsoft Teams: bot deployed, agent receives and responds to channel message
- [ ] Slack: agent receives message via Events API, responds via chat.postMessage
- [ ] Enterprise customer on custom domain (customer.waai.ai) with org logo
- [ ] ISO 27001 gap assessment complete with prioritised remediation plan
- [ ] 250 tests (unit + E2E) passing in CI

**Definition of Done:**  
First enterprise contract signed with SCIM provisioning active. ISO 27001 gap assessment delivered. White-label domain working in production.

---

### Features in EPIC-006

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-006.1 | SCIM 2.0 User Provisioning (Azure AD + Okta) | P1 | L |
| FEAT-006.2 | Microsoft Teams Bot Connector | P1 | L |
| FEAT-006.3 | Slack Events API Connector | P1 | L |
| FEAT-006.4 | Salesforce CRM Connector | P1 | L |
| FEAT-006.5 | SharePoint Document → Knowledge Connector | P2 | L |
| FEAT-006.6 | ISO 27001 Readiness Assessment | P1 | L |
| FEAT-006.7 | Enterprise Billing (Custom Agreements, Overage) | P1 | M |
| FEAT-006.8 | White-Label (Custom Domain + Logo) | P1 | L |
| FEAT-006.9 | SIEM Log Export (Splunk/Elastic Webhook) | P2 | M |
| FEAT-006.10 | A/B Testing: Prompt Variant Comparison | P3 | L |
| FEAT-006.11 | Test Coverage: 250 Tests + Playwright E2E | P1 | XL |

---

## EPIC-007 — AI Operating System (Phase G)

**Objective:** Transform WAAI into a fully autonomous, multi-agent AI operating system with a public developer platform.  
**Business Value:** Enables a marketplace and developer ecosystem play, multiplying distribution by 10x without proportional sales cost.  
**Technical Value:** Multi-Agent Orchestrator and MCP Server establish WAAI as a platform, not a product.  
**Dependencies:** EPIC-006 complete. Dedicated execution infrastructure provisioned.  
**Priority:** P2  
**Estimated Duration:** 12 weeks  

**Acceptance Criteria:**
- [ ] Orchestrator: delegates to 3 specialist agents, synthesises response in < 10s
- [ ] Autonomous agent: proactive follow-up sent 24h after lead captured (no human trigger)
- [ ] Public API: external developer sends message to agent via API key, receives response
- [ ] TypeScript SDK: `@waai/sdk` installable from npm, example script works
- [ ] MCP Server: Claude Desktop connects to WAAI MCP server, can invoke `search_knowledge`
- [ ] SOC 2 Type II audit engaged with third-party auditor

**Definition of Done:**  
Developer portal launched. SDK published to npm. First external developer integration live. SOC 2 observation period started.

---

### Features in EPIC-007

| Feature ID | Feature Name | Priority | Effort |
|---|---|---|---|
| FEAT-007.1 | Multi-Agent Orchestrator (Orchestrator + Specialist Pattern) | P1 | XL |
| FEAT-007.2 | Autonomous Agent Mode (Proactive Outreach) | P2 | XL |
| FEAT-007.3 | Advanced Memory (Agent Learning, Cross-Workspace) | P2 | XL |
| FEAT-007.4 | Model Evaluation (Per-Model Performance + Cost) | P2 | L |
| FEAT-007.5 | Developer Platform: Public REST API v1 | P1 | XL |
| FEAT-007.6 | MCP Server: WAAI as MCP Server | P1 | L |
| FEAT-007.7 | TypeScript + Python SDK | P1 | L |
| FEAT-007.8 | Execution Service Extraction | P2 | XL |
| FEAT-007.9 | Multi-Region Deployment (EU + US + CH) | P2 | XL |
| FEAT-007.10 | SOC 2 Type II Audit Initiation | P1 | Ongoing |
| FEAT-007.11 | Agent Marketplace: Templates | P3 | XL |

---

## Technical Debt Backlog

Technical debt items are tracked in `docs/execution/13_TECHNICAL_DEBT_REGISTER.md`. The following are the top-priority items that must be addressed within Phase A and B:

| Debt ID | Description | Phase | Priority |
|---|---|---|---|
| DEBT-001 | `AiCostService` not wired to `AgentRuntimeService` | A | P0 |
| DEBT-002 | WhatsApp token stored plaintext (ENCRYPTION_KEY unused) | A | P0 |
| DEBT-003 | Two parallel message-limit check paths (service + RPC) | A/B | P1 |
| DEBT-004 | Workspace resolution re-executed in every API route | B | P1 |
| DEBT-005 | No retry logic on Anthropic 529/429 responses | A | P0 |
| DEBT-006 | IVFFlat pgvector index (should migrate to HNSW at 100k vectors) | B/C | P2 |
| DEBT-007 | `estimated_cost_cents` always null in production | A | P0 |
| DEBT-008 | `/api/health` returns hardcoded version 0.8.0 | A | P3 |
