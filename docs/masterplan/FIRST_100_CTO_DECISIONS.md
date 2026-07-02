# WAAI v3 — First 100 CTO Decisions
**Document Type:** Strategic Reference  
**Date:** 2026-06-30  
**Author:** CTO Office  
**Context:** If I became CTO of WAAI tomorrow, ordered by priority

---

## Week 1 — Stop the Bleeding

**1. Merge HTTP security headers to next.config.ts.**  
One day. Blocks every enterprise security review. Unacceptable at v0.9.

**2. Wire AiCostService into AgentRuntimeService.**  
30 minutes. Cost analytics are broken in production. Every Anthropic dollar is invisible.

**3. Start Stripe implementation on a feature branch.**  
No revenue is collectible. This is the highest-priority engineering task in the company.

**4. Start MetaCloudApiProvider implementation in parallel.**  
The product's primary channel claim has no backend. Two engineers, two branches, run in parallel with Stripe.

**5. Add TypeScript type-check (`tsc --noEmit`) to CI.**  
Broken types can reach production. Cheap insurance.

**6. Add `npm run lint` to CI.**  
Same reasoning. Zero cost, non-zero protection.

**7. Set SENTRY_DSN in all Vercel environments.**  
We are flying blind in production. Every unhandled exception is invisible.

**8. Fix /api/health to report version 0.9.0.**  
Monitors are reporting wrong version. 5-minute fix.

**9. Add password reset flow.**  
Cannot launch a SaaS without it. Users locked out of their accounts is a support crisis waiting to happen.

**10. Write the first 10 unit tests on AgentRuntimeService.**  
Establish the pattern and the tooling (vitest). 10 tests unlock the habit.

---

## Week 2 — Revenue Foundation

**11. Complete Stripe checkout implementation.**  
The path from "I want to upgrade" to "I'm paying" must work without manual intervention.

**12. Implement Stripe webhook handler.**  
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Without this, successful payments don't activate subscriptions.

**13. Deploy Stripe to staging, complete checkout end-to-end test.**  
Never release payment flows untested.

**14. Set up Stripe test vs live key strategy in Vercel.**  
No production Stripe key during development. Enforce this with naming convention.

**15. Add exponential backoff to AnthropicClaudeProvider.**  
3 attempts, 1s/2s/4s. A 529 Overloaded response today fails silently.

**16. Activate Anthropic prompt caching.**  
ADR-0004 documents this decision. It was never implemented. Reduces cost immediately.

**17. Enable PgBouncer connection pooler.**  
One configuration change in Supabase. Prevents connection exhaustion at 100 customers.

**18. Add pg_cron monthly counter reset.**  
Without this, message counters never reset. Free users stay locked out after month 1.

**19. Add WhatsApp token encryption at rest.**  
ENCRYPTION_KEY env var is defined but never used. Customer credentials stored plaintext.

**20. Complete MetaCloudApiProvider.**  
Implement sendTextMessage, verifyWebhookSignature, normalize. Add "meta" case to factory.

---

## Week 3–4 — Stability Sprint

**21. Integrate Sentry into all catch blocks and error boundaries.**  
`Sentry.captureException(err)` in every service catch clause.

**22. Add Sentry alert rules: CLAUDE_ERROR, webhook_failed, embedding_error.**  
Reactive monitoring without these is useless.

**23. Establish Sentry performance monitoring on agent runtime.**  
I want to see p95 latency of the 14-step pipeline in a dashboard.

**24. Write 40 more unit tests (total: 50).**  
Test the billing enforcement, RAG retrieval, and webhook handler paths.

**25. Add Playwright E2E test: login → create agent → sandbox chat.**  
The golden path must be tested. Every deploy.

**26. Add Playwright E2E test: signup → onboarding → Stripe checkout.**  
Revenue path must be tested. Every deploy.

**27. Fix the two parallel message-limit check paths (service + RPC).**  
Minor inconsistency risk. Consolidate to RPC path.

**28. Add workspace resolution middleware.**  
Workspace ID should be injected once in middleware, not re-resolved in every API route.

**29. Add rate limiting to AI-consuming API routes.**  
Upstash Rate Limit. /api/agents/*/sandbox and /api/webhooks/whatsapp first.

**30. Fix version mismatch in /api/health by automating it from package.json.**  
Read version at startup, never hardcode.

---

## Month 2 — Enterprise Pilot Readiness

**31. Design and implement Organization data model.**  
Add waai_organizations, waai_departments. Backfill existing workspaces.

**32. Remove single-workspace-per-user constraint.**  
Critical for enterprise (one user, multiple teams).

**33. Build workspace switcher in navigation.**  
Without this, multi-workspace is useless to users.

**34. Design and implement SSO: Azure AD SAML 2.0.**  
Required for every DACH enterprise customer. Azure AD is the dominant IdP.

**35. Design and implement SSO: Google Workspace OIDC.**  
Covers SME segment.

**36. Add API key authentication.**  
Enterprise integrations require API keys. Bearer token auth on all /v1/ routes.

**37. Build API key management UI.**  
Create, revoke, show last-used-at.

**38. Implement user invitation flow.**  
Email invite → accept → workspace member. Currently impossible to onboard a team.

**39. Build audit log export UI.**  
CSV/JSON download with date range and actor filter.

**40. Implement MFA: TOTP via Supabase MFA.**  
Supabase supports this natively. Enterprise requires MFA.

---

**41. Write Data Processing Agreement (DPA) template.**  
Required before any enterprise contract. Legal template, not engineering work.

**42. Document GDPR Article 30 records of processing.**  
What data we process, for what purpose, how long retained.

**43. Add Swiss DSG/nDSG compliance statement to docs.**  
We are in Basel. This is our home market.

**44. Implement streaming SSE for sandbox chat.**  
ReadableStream from LLM provider to frontend. First UX improvement with immediate impact.

**45. Add Suspense boundaries and loading skeletons to all data-loading routes.**  
UX quality signal that enterprise evaluators notice.

**46. Add Lighthouse CI to the CI pipeline.**  
Performance regression alerts before they hit users.

**47. Implement Knowledge feedback loop: thumbs up/down on retrieved chunks.**  
Retrieval quality data is the foundation of RAG improvement.

**48. Switch pgvector IVFFlat to HNSW index.**  
Non-destructive migration. Better recall without periodic reindex.

**49. Tune RAG similarity threshold from 0.75 to 0.70.**  
Based on ADR-0005. Current 0.75 is conservative. Lower threshold reduces false negatives.

**50. Add OpenAI GPT-4o provider implementation.**  
LLM interface already supports it. Factory hardcoded. Wire the env var routing.

---

## Month 3 — Agent Platform v3

**51. Design and migrate Agent Goals data model.**  
Add waai_agent_goals. Existing agents get default goals. Additive migration.

**52. Build Agent Goals UI.**  
Goal name, metric, target. Display goal completion in analytics.

**53. Design and implement Agent Policies rule engine.**  
Policy evaluation service. Run in shadow mode (log, don't enforce) first.

**54. Build Agent Policy editor UI.**  
Add/remove rules. Test rule against sample message.

**55. Enable policy enforcement (after shadow mode validation).**  
Rollout opt-in per workspace first.

**56. Implement Agent Versioning.**  
waai_agent_versions table. Rollback button in UI.

**57. Build Agent Health dashboard.**  
Error rate, latency p95, cost/day, handoff rate per agent.

**58. Design Tool Registry infrastructure.**  
Tool interface, registry singleton, tool discovery for agent.

**59. Implement tool: search_knowledge.**  
Already exists as RAG retrieval. Expose as callable tool.

**60. Implement tool: create_lead.**  
Lead creation via agent decision, not just detection.

---

**61. Implement tool: request_handoff.**  
Agent detects need for human, triggers handoff programmatically.

**62. Design Approval Engine: policies and routing.**  
waai_approval_policies, waai_approval_requests tables.

**63. Implement approval request flow.**  
Agent action flagged → request created → approver notified.

**64. Build approval decision UI.**  
Dashboard queue. Approve/reject with note.

**65. Implement approval notifications via email.**  
Resend integration for approval request emails.

**66. Implement approval SLA timers.**  
Inngest job: auto-escalate if no decision within SLA hours.

**67. Implement Agent Lifecycle: draft → review → published.**  
Review gate checklist automated. Workspace admin approves.

**68. Build Memory Service v1: per-user facts across sessions.**  
Store facts extracted from conversations. Inject in next conversation.

**69. Implement fact extraction from conversations.**  
Post-conversation Claude Haiku call to extract persistent facts about user.

**70. Add memory injection to system prompt assembly.**  
`<user_context>` block with facts. Cached if stable.

---

## Month 4–5 — Workflow Platform

**71. Design Workflow data model.**  
waai_workflows, waai_workflow_runs, waai_workflow_steps. RLS on all.

**72. Implement WorkflowExecutionEngine with Inngest.**  
Async, retriable, per-node step records.

**73. Implement Trigger nodes: inbound_message, schedule, manual.**  
Entry points for all workflow types.

**74. Implement Condition nodes.**  
JSON expression evaluator. Boolean branching.

**75. Implement Action nodes: send_message, create_lead, call_webhook.**  
Side-effect nodes. Idempotent where possible.

**76. Implement Agent nodes.**  
Invoke WAAI agent as a workflow step.

**77. Implement Approval nodes.**  
Pause execution, wait for human decision.

**78. Install React Flow. Build visual editor canvas.**  
Node palette, drag-and-drop, connect nodes.

**79. Build node configuration panels (right-side drawer).**  
Edit each node's parameters inline.

**80. Build workflow run history view.**  
Show last 10 runs. Per-step status with duration. Click node to see I/O.

---

**81. Build 5 workflow templates.**  
Lead qualification, appointment booking, weekly report, onboarding sequence, escalation.

**82. Implement SubWorkflow node.**  
Call another workflow from within a workflow.

**83. Implement Loop node.**  
Iterate over a list. Safety limit: max 100 iterations.

**84. Add workflow variable binding UI.**  
Map output of Node A → input of Node B with a picker.

**85. Add workflow validation (pre-save).**  
Detect: missing connections, cycles, unreachable nodes.

---

## Month 6+ — Connectors, Enterprise, Scale

**86. Implement ConnectorRegistry base infrastructure.**  
Replace current WhatsApp provider factory with ConnectorRegistry pattern.

**87. Implement Email Connector: Resend inbound + outbound.**  
Webhook for inbound. Resend API for outbound.

**88. Implement Telegram Bot Connector.**  
sendMessage + setWebhook + normalize.

**89. Implement HubSpot CRM Connector.**  
OAuth2. create_contact, search_contact, get_deal.

**90. Implement Google Calendar Connector.**  
get_available_slots, create_event.

**91. Design and implement SCIM 2.0 provisioning.**  
/api/scim/v2/Users and /api/scim/v2/Groups. Azure AD + Okta.

**92. Implement Microsoft Teams Bot Connector.**  
Bot Framework Activity Handler. Register Azure Bot.

**93. Implement Slack Events API Connector.**  
Event subscriptions. chat.postMessage.

**94. Build white-label: custom domain + logo per workspace.**  
next.config.ts domain rewrites. Logo stored in Supabase Storage.

**95. Implement Enterprise Agreement billing.**  
Custom limits beyond plan tiers. Manual activation by platform admin.

---

**96. Implement Multi-Agent Orchestrator.**  
Orchestrator delegates to specialist agents. Synthesizes results.

**97. Launch public REST API v1.**  
/v1/ routes, API key auth, versioned, rate-limited.

**98. Build TypeScript SDK.**  
`npm install @waai/sdk`. Generated from OpenAPI spec.

**99. Implement MCP Server.**  
WAAI as an MCP server. Expose search_knowledge, send_message, create_lead as tools.

**100. Initiate SOC 2 Type II audit.**  
Engage third-party auditor. 6-month observation period starts. Target certification in Q1 2028.

---

## Decision Principles Applied

Every decision above follows these rules:

1. **Revenue before features** — if it doesn't enable payment or unblock enterprise sale, it's not P0.
2. **Fix before build** — broken cost analytics before new analytics features.
3. **Protect the foundation** — RLS, audit logs, provider abstractions are never touched without migration plan.
4. **Test the critical paths** — the agent pipeline and payment flow must have E2E tests before any other test.
5. **Observe before optimizing** — Sentry, latency tracking, and cost visibility before performance work.
6. **Enterprise from Day 1 of Phase B** — SSO, SCIM, audit export are designed right the first time, not retrofitted.
7. **No over-engineering** — HNSW before dedicated vector DB. Redis before sharding. Monolith before microservices.
