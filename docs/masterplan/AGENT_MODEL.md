# WAAI v3 — Agent Model Design
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Current Agent Model (v0.9)

An agent today is essentially `Prompt + Knowledge + WhatsApp connection`. The `waai_agents` table stores name, system prompt, language, and business configuration. This is adequate for MVP but insufficient for enterprise use cases.

**Limitations:**
- No goals (how do you measure success?)
- No policies (what is the agent NOT allowed to do?)
- No tools (agent cannot act — only respond)
- No workflow integration (cannot trigger multi-step automation)
- No memory (forgets everything between sessions)
- No approval model (all actions are automatic)
- No lifecycle governance (no review, no staged rollout)
- No health model (no error rate, no SLA)

---

## v3 Agent Model

An agent in v3 is a **governed, goal-driven, tool-using autonomous entity** that operates within a defined policy envelope, with full audit and lifecycle management.

```
┌─────────────────────────────────────────────────────────┐
│                      WAAI Agent v3                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Identity   │  │    Goals     │  │   Policies   │  │
│  │ name, lang,  │  │ primary goal │  │ rules, tone, │  │
│  │ persona, tone│  │ OKRs, KPIs   │  │ forbidden    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Memory    │  │  Knowledge   │  │    Tools     │  │
│  │ session mem  │  │ doc bases    │  │ registered   │  │
│  │ user memory  │  │ live sources │  │ tool set     │  │
│  │ agent memory │  │ RAG config   │  │ approval req │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Workflows   │  │  Approvals   │  │ Permissions  │  │
│  │ linked flows │  │ risk policy  │  │ who can cfg  │  │
│  │ trigger cond │  │ approval     │  │ who can use  │  │
│  │ on_lead, etc │  │ chain, SLA   │  │ who can view │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Analytics   │  │    Audit     │  │  Lifecycle   │  │
│  │ CSAT, goals  │  │ all actions  │  │ draft→review │  │
│  │ cost/day     │  │ human review │  │ →published   │  │
│  │ latency p95  │  │ queue        │  │ →deprecated  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                    Health                         │   │
│  │  status · error_rate · latency_p95 · cost_day    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model Evolution

### Existing `waai_agents` (preserved)

```sql
-- All existing columns preserved — no breaking changes
id, workspace_id, name, description, language, tone,
business_name, business_type, system_prompt_template,
status, is_archived, created_at, updated_at
```

### New Tables (additive)

```sql
-- Goals
CREATE TABLE waai_agent_goals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references waai_agents(id) on delete cascade,
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  goal_type text not null check (goal_type in ('primary', 'secondary', 'kpi')),
  description text not null,
  metric_name text,              -- e.g., 'lead_conversion_rate'
  metric_target numeric,         -- e.g., 0.25 (25%)
  metric_unit text,              -- e.g., 'percentage', 'count', 'seconds'
  created_at timestamptz default now()
);

-- Policies
CREATE TABLE waai_agent_policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references waai_agents(id) on delete cascade,
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  policy_type text not null check (policy_type in (
    'forbidden_topic', 'required_disclosure', 'escalation_trigger',
    'tone_rule', 'response_length', 'language_rule'
  )),
  rule_definition jsonb not null,
  priority int not null default 0,
  is_active bool default true,
  created_at timestamptz default now()
);

-- Tool assignments
CREATE TABLE waai_agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references waai_agents(id) on delete cascade,
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  tool_name text not null,
  tool_config jsonb,             -- tool-specific configuration
  requires_approval bool default false,
  approval_policy_id uuid references waai_approval_policies(id),
  is_active bool default true,
  created_at timestamptz default now()
);

-- Approval policies
CREATE TABLE waai_approval_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  name text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  approver_role text not null,           -- which RBAC role must approve
  sla_hours int not null default 4,      -- auto-escalate after N hours
  escalation_role text,                  -- role to escalate to on SLA breach
  notification_channels jsonb,           -- ['email', 'slack', 'in_app']
  created_at timestamptz default now()
);

-- Approval requests
CREATE TABLE waai_approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  agent_id uuid references waai_agents(id),
  workflow_run_id uuid references waai_workflow_runs(id),
  workflow_step_id uuid references waai_workflow_steps(id),
  policy_id uuid not null references waai_approval_policies(id),
  risk_level text not null,
  action_description text not null,
  action_payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'escalated', 'expired')),
  requested_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decision_note text,
  requested_at timestamptz default now(),
  decided_at timestamptz,
  sla_deadline timestamptz not null
);

-- Prompt versions (already partially implemented — formalize)
CREATE TABLE waai_agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references waai_agents(id) on delete cascade,
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  version_number int not null,
  system_prompt text not null,
  change_summary text,
  deployed_at timestamptz,
  deployed_by uuid references auth.users(id),
  is_active bool default false,
  created_at timestamptz default now(),
  UNIQUE(agent_id, version_number)
);

-- Agent health snapshots (time-series)
CREATE TABLE waai_agent_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references waai_agents(id) on delete cascade,
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  sampled_at timestamptz not null,
  message_count_24h int,
  error_count_24h int,
  handoff_count_24h int,
  avg_latency_ms int,
  p95_latency_ms int,
  total_cost_cents_24h numeric,
  lead_count_24h int,
  resolution_rate numeric            -- % conversations resolved without handoff
);
```

---

## Agent Lifecycle

```
draft
  ↓ [agent_manager submits for review]
review
  ↓ [workspace_admin approves]
published
  ↓ [agent_manager archives OR newer version deployed]
deprecated
```

### Review Gate Checklist (automated)
- [ ] System prompt exists and has > 50 chars
- [ ] Language is set
- [ ] At least 1 goal defined
- [ ] At least 1 policy defined
- [ ] Knowledge base has at least 1 document (if RAG enabled)
- [ ] Test sandbox run succeeded with no safety filter triggers

---

## Agent Policies (Rule Engine)

### Policy Types

**1. Forbidden Topics**
```json
{
  "policy_type": "forbidden_topic",
  "rule_definition": {
    "topics": ["competitor pricing", "legal advice", "medical diagnosis"],
    "action": "redirect",
    "redirect_message": "I'm not able to discuss that. Let me connect you with our team."
  }
}
```

**2. Escalation Triggers**
```json
{
  "policy_type": "escalation_trigger",
  "rule_definition": {
    "keywords": ["emergency", "lawsuit", "refund", "urgent", "manager"],
    "sentiment_threshold": -0.7,
    "action": "request_handoff",
    "handoff_message": "I'm connecting you with a team member right away."
  }
}
```

**3. Required Disclosure**
```json
{
  "policy_type": "required_disclosure",
  "rule_definition": {
    "trigger": "first_message",
    "disclosure": "I'm an AI assistant. I can help with general questions, but for urgent matters please call +41 XXX XXX."
  }
}
```

**4. Response Length**
```json
{
  "policy_type": "response_length",
  "rule_definition": {
    "max_chars": 800,
    "split_strategy": "sentence_boundary"
  }
}
```

---

## Agent Health Model

### Health Status Computation

```typescript
// src/server/services/agent-health-service.ts
export class AgentHealthService {
  async computeHealth(agentId: string): Promise<AgentHealth> {
    const snapshot = await this.getLatestSnapshot(agentId);
    const errorRate = snapshot.error_count_24h / (snapshot.message_count_24h || 1);
    const handoffRate = snapshot.handoff_count_24h / (snapshot.message_count_24h || 1);

    const status: HealthStatus =
      errorRate > 0.1 ? 'critical' :
      errorRate > 0.05 ? 'degraded' :
      handoffRate > 0.5 ? 'warning' :
      snapshot.p95_latency_ms > 8000 ? 'warning' :
      'healthy';

    return { status, errorRate, handoffRate, p95LatencyMs: snapshot.p95_latency_ms };
  }
}
```

### Health Dashboard

Dashboard card per agent shows:
- Status indicator (green/yellow/red)
- Messages today vs 7-day avg
- Error rate (%)
- Avg response time
- Cost today (CHF / USD)
- Lead capture rate
- Human handoff rate

---

## Human Approval Engine

### Risk Scoring

Every agent action is assigned a risk level before execution:

```typescript
// src/server/services/risk-scorer.ts
export class RiskScorer {
  score(action: AgentAction): RiskLevel {
    if (action.tool === 'update_crm' && action.input.dealValue > 10000) return 'critical';
    if (action.tool === 'update_crm') return 'high';
    if (action.tool === 'create_lead') return 'low';
    if (action.tool === 'book_appointment') return 'medium';
    if (action.tool === 'send_document' && action.input.documentType === 'contract') return 'high';
    return 'low';
  }
}
```

### Approval Chain Routing

```
Risk Level → Approver Role → SLA → Escalation
─────────────────────────────────────────────
low        → auto-approve  → n/a → n/a
medium     → human_agent   → 2h  → agent_manager
high       → agent_manager → 4h  → workspace_admin
critical   → workspace_admin→8h  → org_admin
```

### Approval Notifications
1. In-app notification (dashboard badge)
2. Email via Resend (with action context)
3. Slack message (if Slack connector active)
4. WhatsApp message to approver (if configured)

---

## Agent Collaboration Model

### Orchestrator → Specialist Pattern

For complex queries, an Orchestrator Agent decomposes the request and delegates to Specialist Agents:

```
User: "Schedule a demo and send the pricing PDF"
     ↓
Orchestrator Agent
├── → Calendar Agent: "Book demo slot"
│         ↓ available slots
├── → Document Agent: "Retrieve pricing PDF"
│         ↓ PDF URL
└── Synthesize + send combined response
```

### Handoff Protocol between Agents

```typescript
interface AgentHandoffRequest {
  fromAgentId: string;
  toAgentId: string;
  conversationId: string;
  context: string;           // what the receiving agent needs to know
  handoffReason: string;
  resumeAfter: boolean;      // should orchestrator resume after specialist responds?
}
```

All agent-to-agent handoffs are logged in `waai_audit_logs` with full context.

---

## Migration from v0.9 to v3 Agent Model

| Step | Action | Impact |
|---|---|---|
| 1 | Add new tables (goals, policies, tools, etc.) | No existing agent affected |
| 2 | Existing agents get `status = 'published'` by default | No disruption |
| 3 | UI adds new tabs (Goals, Policies, Tools) | Additive — old tabs unchanged |
| 4 | Policy engine runs in shadow mode first (log violations, don't enforce) | Zero production risk |
| 5 | Enable policy enforcement opt-in per workspace | Gradual rollout |
| 6 | Approval engine opt-in per tool | Agents without tools unaffected |
