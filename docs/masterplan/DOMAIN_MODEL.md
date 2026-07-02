# WAAI v3 — Domain Model
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Overview

WAAI v3 is decomposed into 12 bounded domains. Each domain owns its data, its logic, and its API contract. Domains communicate through well-defined interfaces — never through shared tables or direct service calls across domain boundaries.

This model protects the existing monorepo (Next.js + Supabase) while defining clear ownership and enabling future decomposition if scale demands it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Developer Platform                            │
│              REST API · Webhooks · SDK · MCP Server                  │
├───────────────────┬─────────────────────────────────────────────────┤
│  Identity Domain  │               Workspace Domain                   │
│  Auth · SSO · MFA │        Org → Dept → Workspace · RBAC            │
├───────────────────┴──────────────┬──────────────────────────────────┤
│         Agent Domain             │        Knowledge Domain           │
│  Config · Lifecycle · Health     │  Documents · Chunks · RAG        │
├──────────────────────────────────┼──────────────────────────────────┤
│       Connector Domain           │       Workflow Domain             │
│  WhatsApp · Email · Teams · CRM  │  Engine · Nodes · Execution      │
├──────────────────────────────────┼──────────────────────────────────┤
│       Execution Domain           │        Billing Domain            │
│  LLM · RAG · Memory · Safety     │  Plans · Stripe · Usage          │
├──────────────────────────────────┼──────────────────────────────────┤
│       Analytics Domain           │         Audit Domain             │
│  Metrics · ROI · A/B Testing     │  Immutable Log · Export · SIEM   │
├──────────────────────────────────┴──────────────────────────────────┤
│                     Observability Domain                             │
│              Sentry · Alerting · Distributed Tracing                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Domain 1 — Identity Platform

### Responsibility
Authentication, authorization, session management, and identity federation. The source of truth for who a user is and what they can access.

### Current State
Supabase Auth (email/password), 5-role RBAC encoded in `waai_workspace_members`. No SSO. No MFA enforcement. No password reset.

### v3 Target
```
Identity Platform
├── AuthService           — sign-up, sign-in, sign-out, reset-password
├── SessionService        — JWT validation, session refresh, device management
├── MFAService            — TOTP enrollment, WebAuthn registration
├── SSOService            — SAML 2.0 / OIDC federation
├── SCIMService           — automated user provisioning from IdP
├── ApiKeyService         — workspace API keys, scoped permissions
└── RBACService           — role resolution, permission check (fast, cached)
```

### DB Tables (v3 additions)
```sql
waai_sso_configs         -- SAML/OIDC config per org
waai_api_keys            -- key hash, scope, last_used_at, revoked_at
waai_mfa_configs         -- TOTP/WebAuthn per user
waai_sessions            -- extended session metadata, device fingerprint
```

### Role Hierarchy
```
platform_owner (WAAI internal)
  └── platform_admin (WAAI support)
       └── org_owner (customer primary admin)
            └── org_admin (customer secondary admin)
                 └── workspace_owner (team workspace owner)
                      └── workspace_admin
                           └── agent_manager
                                └── human_agent
                                     └── viewer
```

### Dependencies
- **Consumes:** None (foundation layer)
- **Consumed by:** Every other domain

### Ownership
Identity Team. No other team modifies RLS policies or auth logic.

---

## Domain 2 — Workspace Platform

### Responsibility
Tenant hierarchy, membership management, workspace configuration, and organizational structure.

### Current State
Single workspace per user, 5 roles, `waai_workspaces` + `waai_workspace_members`. No organization layer. No department grouping. No multi-workspace support.

### v3 Target
```
Workspace Platform
├── OrganizationService   — org CRUD, plan assignment, SSO binding
├── DepartmentService     — department CRUD, workspace grouping
├── WorkspaceService      — workspace CRUD, settings, status
├── MembershipService     — invite, accept, remove, role change
└── OnboardingService     — guided setup flow, wizard state machine
```

### Org Hierarchy
```sql
waai_organizations (
  id uuid, name text, slug text,
  plan text,                     -- enterprise agreement
  sso_config_id uuid,            -- SSO binding
  data_residency text,           -- 'ch' | 'eu' | 'us'
  created_at timestamptz
)

waai_departments (
  id uuid, org_id uuid, name text, slug text
)

waai_workspaces (
  -- existing columns preserved
  org_id uuid,          -- NEW: nullable for v1, required for v2 enterprise
  department_id uuid    -- NEW: nullable
)
```

### Migration Strategy
- Add `org_id` and `department_id` nullable to `waai_workspaces`
- On new org signup, auto-create org and backfill existing workspace
- Existing solo workspaces become single-workspace orgs automatically
- No data loss, no user action required

### Dependencies
- **Consumes:** Identity Domain (roles, users)
- **Consumed by:** Agent, Billing, Analytics, Audit domains

### Ownership
Platform Team. No feature team modifies workspace membership directly.

---

## Domain 3 — Agent Domain

### Responsibility
Agent definition, lifecycle management, configuration, health monitoring, and deployment.

### Current State
Agent = Prompt + Knowledge + WhatsApp connection. `waai_agents` table with basic fields. Lifecycle: draft → active. No goals, no tools, no workflow association.

### v3 Target
See [AGENT_MODEL.md](AGENT_MODEL.md) for full design.

```
Agent Domain
├── AgentService          — CRUD, lifecycle, validation
├── AgentBuilderService   — wizard, prompt generation, preview
├── AgentHealthService    — error rate, latency p95, cost/day
├── AgentVersionService   — prompt versioning, rollback
├── AgentPolicyService    — response rules, escalation triggers
├── AgentPermissionService— role-based access to agent actions
└── AgentAnalyticsService — performance metrics, goal completion
```

### DB Tables (v3 additions)
```sql
waai_agent_goals          -- goal definitions per agent
waai_agent_policies       -- rule set (forbidden topics, tone, escalation)
waai_agent_tools          -- registered tools per agent (connector, function)
waai_agent_workflows      -- linked workflow definitions
waai_agent_versions       -- prompt version history, rollback support
waai_agent_health_events  -- time-series health snapshots
```

### Dependencies
- **Consumes:** Workspace Domain, Knowledge Domain, Connector Domain
- **Consumed by:** Execution Domain, Analytics Domain, Audit Domain

---

## Domain 4 — Knowledge Domain

### Responsibility
Document ingestion, chunking, vectorization, retrieval, and knowledge base management.

### Current State
Documents → chunks → pgvector (IVFFlat, 1536 dim, cosine). Workspace + agent isolation. TOP_K=5, threshold=0.75.

### v3 Target
```
Knowledge Domain
├── DocumentService       — upload, archive, processing status
├── ChunkingService       — configurable chunking strategy per doc type
├── EmbeddingService      — provider-agnostic (OpenAI/Voyage/local)
├── RetrievalService      — pgvector HNSW, hybrid BM25+vector, reranking
├── KnowledgeFeedbackService — thumbs up/down on retrievals → index tuning
└── AutoRefreshService    — detect stale documents, re-embed on change
```

### DB Tables (v3 additions)
```sql
waai_knowledge_retrievals  -- per-query retrieval log (for feedback)
waai_knowledge_feedback    -- user/agent feedback on retrieval quality
waai_knowledge_sources     -- live sources (URLs, SharePoint, Drive)
```

### HNSW Migration Plan
```sql
-- Non-destructive: add HNSW alongside IVFFlat
CREATE INDEX CONCURRENTLY idx_knowledge_chunks_hnsw
  ON public.waai_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- After validation period: drop IVFFlat
DROP INDEX idx_waai_knowledge_chunks_embedding;
```

### Dependencies
- **Consumes:** Agent Domain (which agent owns which knowledge base)
- **Consumed by:** Execution Domain (RAG retrieval during agent runs)

---

## Domain 5 — Connector Domain

### Responsibility
All external channel integrations. Inbound message normalization, outbound message dispatch, webhook verification, connection health.

### Current State
WhatsApp via Whapi + mock provider. Interface defined (ADR-0003). Meta Cloud API missing.

### v3 Target
See [CONNECTOR_PLATFORM.md](CONNECTOR_PLATFORM.md) for full design.

```
Connector Domain
├── ConnectorRegistry     — runtime registry, discovery
├── WhatsAppConnector     — Whapi + Meta Cloud API
├── EmailConnector        — Resend/SendGrid, IMAP/SMTP
├── TeamsConnector        — Microsoft Teams Bot Framework
├── SlackConnector        — Slack Events API
├── TelegramConnector     — Telegram Bot API
├── CRMConnector          — Salesforce/HubSpot read/write
├── CalendarConnector     — Google/Outlook calendar
├── MCPConnector          — Model Context Protocol server bridge
└── WebhookConnector      — Generic outbound webhook
```

### Dependencies
- **Consumes:** Identity (workspace auth), Workspace (connection config)
- **Consumed by:** Execution Domain (send/receive), Workflow Domain (trigger/action)

---

## Domain 6 — Workflow Domain

### Responsibility
Visual workflow definition, execution scheduling, node evaluation, retry management, and approval orchestration.

### Current State
No workflow engine. Agent pipeline is a hardcoded 14-step sequence in `agent-runtime-service.ts`.

### v3 Target
See [WORKFLOW_ENGINE.md](WORKFLOW_ENGINE.md) for full design.

```
Workflow Domain
├── WorkflowDefinitionService — node graph CRUD, validation
├── WorkflowExecutionService  — run orchestration, state machine
├── NodeEvaluatorService      — per-node execution (condition, action, loop)
├── TriggerService            — inbound events → workflow activations
├── SchedulerService          — cron-based and delay-based triggers
└── ApprovalOrchestrationService — human decision routing, SLA timers
```

### DB Tables (new)
```sql
waai_workflows         -- workflow graph definition (JSON)
waai_workflow_runs     -- execution instances
waai_workflow_steps    -- per-node step records (replayable)
waai_approval_requests -- pending human decisions
waai_approval_policies -- workspace-level routing rules
```

### Dependencies
- **Consumes:** Agent Domain, Connector Domain, Execution Domain
- **Consumed by:** Nothing (terminal domain for user-initiated actions)

---

## Domain 7 — Execution Domain

### Responsibility
LLM invocation, RAG retrieval, prompt construction, safety filtering, memory management, and cost tracking. The AI brain.

### Current State
14-step pipeline in `AgentRuntimeService`. Single-threaded. No streaming. No retries. No cost tracking wired.

### v3 Target
See [AI_PLATFORM.md](AI_PLATFORM.md) for full design.

```
Execution Domain
├── LLMRouter             — model selection, provider routing
├── PromptEngine          — system prompt assembly, variable injection
├── ContextEngine         — conversation history, memory, RAG context
├── MemoryService         — per-user memory, cross-session context
├── SafetyFilter          — output validation, policy enforcement
├── StreamingService      — SSE/ReadableStream adapter
├── RetryOrchestrator     — exponential backoff, provider failover
└── CostTracker           — per-run cost, budget enforcement
```

### Dependencies
- **Consumes:** Agent Domain (config), Knowledge Domain (RAG), Connector Domain (send)
- **Consumed by:** Workflow Domain, Developer Platform (API callers)

---

## Domain 8 — Billing Domain

### Responsibility
Plan management, usage accounting, Stripe integration, invoice generation, and revenue reporting.

### Current State
Plans in DB, `BillingEnforcementService` working, `waai_billing_events` with idempotency. Stripe stub (always disabled).

### v3 Target
```
Billing Domain
├── PlanService           — plan CRUD, feature flags per plan
├── StripeService         — checkout, portal, webhooks, customer management
├── UsageAccountingService— real-time counter, monthly reset, overage
├── InvoiceService        — usage-based invoice generation
├── EnterpriseAgreementService — custom contracts, negotiated limits
└── RevenueAnalyticsService — MRR, churn, expansion, LTV
```

### DB Tables (v3 additions)
```sql
waai_invoices           -- generated invoice records
waai_overage_events     -- usage above plan limit (for pay-as-you-go)
waai_enterprise_agreements -- custom enterprise contract terms
```

### Dependencies
- **Consumes:** Workspace Domain (workspace plan), Identity Domain (org billing)
- **Consumed by:** All domains (plan limits checked before resource creation)

---

## Domain 9 — Analytics Domain

### Responsibility
Usage metrics, business intelligence, agent performance, ROI measurement, and A/B testing.

### Current State
Usage counters, agent run records, basic analytics API (`/api/analytics/*`). No ROI, no A/B, no business intelligence.

### v3 Target
```
Analytics Domain
├── UsageMetricsService   — messages, agents, docs, active workspaces
├── AgentPerformanceService— CSAT, resolution rate, handoff rate, latency
├── ROICalculatorService  — cost per conversation vs human agent cost
├── BusinessIntelligenceService — trend analysis, cohort retention
├── ABTestingService      — prompt variant comparison, statistical significance
└── ReportingService      — scheduled reports, exports, custom dashboards
```

### Dependencies
- **Consumes:** Execution Domain (run data), Workflow Domain (run data), Billing Domain (revenue data)
- **Consumed by:** Developer Platform (analytics API)

---

## Domain 10 — Audit Domain

### Responsibility
Immutable event recording, compliance reporting, SIEM integration, and audit log export.

### Current State
`waai_audit_logs` with INSERT-only RLS (no UPDATE/DELETE policies). Correct foundation.

### v3 Target
```
Audit Domain
├── AuditLogService       — event recording (INSERT-only, never modify)
├── AuditQueryService     — filtered search (actor, event type, date range)
├── ComplianceReportService — DSG/GDPR reports, data access log
├── SIEMExportService     — Splunk/Elastic/CloudWatch stream
└── AuditAlertService     — anomaly detection on audit patterns
```

### DB Tables (v3 additions)
```sql
waai_audit_exports      -- export job records (what was exported, when, to whom)
```

### Compliance Certifications Target
- Swiss DSG / nDSG ✅ (already)
- ISO 27001 (Phase F)
- SOC 2 Type II (Phase G)
- GDPR Article 30 records (Phase B)

### Dependencies
- **Consumes:** Identity Domain (actor identity)
- **Consumed by:** Nothing (terminal — audit logs are never consumed for business logic)

---

## Domain 11 — Observability Domain

### Responsibility
Error tracking, performance monitoring, alerting, and distributed tracing.

### Current State
Structured JSON logging with secret redaction. Sentry DSN empty. No alerting. No tracing.

### v3 Target
```
Observability Domain
├── ErrorTrackingService  — Sentry integration, error grouping
├── PerformanceMonitoring — p50/p95/p99 latency per endpoint
├── AlertingService       — threshold alerts, PagerDuty/Slack integration
├── DistributedTracingService — OpenTelemetry spans across async workflows
└── HealthDashboardService — real-time system health, per-domain status
```

### Key SLOs (Phase A targets)
- API p95 latency < 2000ms
- Agent runtime p95 < 5000ms (with RAG)
- Webhook processing < 60s (Vercel maxDuration)
- Uptime SLA: 99.5% (MVP) → 99.9% (Enterprise)

### Dependencies
- **Consumes:** All domains (instrument all services)
- **Consumed by:** Nothing (terminal monitoring layer)

---

## Domain 12 — Developer Platform

### Responsibility
Public REST API, webhook subscriptions, developer SDK, MCP server, and API documentation.

### Current State
No public API. No webhooks to external systems. No developer portal.

### v3 Target
```
Developer Platform
├── PublicAPIService      — versioned REST API (v1), rate-limited, key-auth
├── WebhookSubscriptionService — outbound webhooks on platform events
├── SDKPublisher          — TypeScript/Python SDK generation
├── MCPServerService      — WAAI as MCP server (tools for AI agents)
└── DeveloperPortalService— API docs, key management, usage analytics
```

### API Surface (v1)
```
GET  /v1/workspaces/{id}/agents
POST /v1/agents/{id}/messages
GET  /v1/agents/{id}/conversations
POST /v1/agents/{id}/knowledge
GET  /v1/analytics/usage
POST /v1/webhooks/subscribe
```

### Dependencies
- **Consumes:** All domains (exposes their capabilities via API)
- **Consumed by:** External developers, enterprise integrations

---

## Domain Dependency Graph

```
Identity ←────────── all domains read
Workspace ←────────── all domains scope to workspace
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Agent        Knowledge   Connector
              │            │            │
              └────────────┼────────────┘
                           ▼
                       Execution
                           │
                      ┌────┴────┐
                      ▼         ▼
                   Workflow   Analytics
                           │
                         Audit
                           │
                      Observability
                           │
                   Developer Platform
                    (exposes all)
```

**Rule:** No circular dependencies. Lower domains never import from higher domains.
