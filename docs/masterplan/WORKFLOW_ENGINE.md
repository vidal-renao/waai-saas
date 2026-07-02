# WAAI v3 — Workflow Engine Design
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Design Philosophy

The WAAI Workflow Engine is purpose-built for enterprise AI agent automation. It is NOT:
- A copy of n8n (generic ETL)
- A copy of LangGraph (code-first Python)
- A copy of Copilot Studio (Microsoft-locked)

It IS:
- **Agent-native** — workflows are first-class agents, not scripts
- **Approval-first** — human oversight is a core primitive, not an afterthought
- **Audit-complete** — every node execution is logged, immutable, replayable
- **WhatsApp-native** — conversation context flows through workflow nodes
- **Enterprise-grade** — RLS, workspace isolation, role-based workflow access

---

## Execution Model

### Workflow as a Directed Acyclic Graph (DAG)

```
[Trigger] → [Condition] → [Action] → [Approval] → [Output]
                ↓               ↓
            [Branch]       [SubWorkflow]
                ↓
            [Loop] → [Agent Node] → [Connector Node]
```

Workflows are stored as JSON graphs in `waai_workflows`. Execution is asynchronous, queue-based (Inngest or Supabase Edge Function queues). Every node execution is a separate, retriable unit.

---

## Node Types

### 1. Trigger Nodes (entry points)

| Trigger Type | Description | Example |
|---|---|---|
| `inbound_message` | WhatsApp/Email/Slack message received | Customer sends "book appointment" |
| `schedule` | Cron expression | Every Monday 9am, send weekly report |
| `webhook` | External HTTP POST to WAAI | CRM deal closed event |
| `manual` | Dashboard button or API call | Admin triggers onboarding workflow |
| `agent_event` | Agent emits an event | Agent detected a new lead |
| `conversation_ended` | Conversation resolved or timed out | Post-conversation CSAT survey |

### 2. Condition Nodes (branching)

```typescript
interface ConditionNode {
  type: 'condition';
  expression: ConditionExpression;
  trueBranch: NodeId;
  falseBranch: NodeId;
}

// Expression examples:
// { field: 'message.sentiment', operator: 'eq', value: 'negative' }
// { field: 'lead.score', operator: 'gte', value: 80 }
// { field: 'workspace.plan', operator: 'eq', value: 'pro' }
```

### 3. Action Nodes (side effects)

| Action Type | Description |
|---|---|
| `send_message` | Send via any active connector |
| `create_lead` | Write to leads table |
| `update_crm` | Write to CRM via connector |
| `book_appointment` | Create calendar event |
| `send_email` | Via email connector |
| `call_agent` | Invoke a WAAI agent with a message |
| `call_webhook` | HTTP POST to external URL |
| `wait` | Delay for N seconds/minutes/hours |
| `set_variable` | Set workflow variable for downstream nodes |

### 4. Agent Nodes (LLM invocation)

The core differentiator of WAAI's workflow engine:

```typescript
interface AgentNode {
  type: 'agent';
  agentId: string;          // which agent to invoke
  inputTemplate: string;    // handlebars template from workflow context
  outputVariable: string;   // where to store agent response
  timeoutMs: number;
  onTimeout: 'escalate' | 'fallback' | 'fail';
}
```

Agents invoked inside workflows have full access to knowledge base, memory, and tools — exactly as in direct conversations.

### 5. Approval Nodes (human-in-the-loop)

```typescript
interface ApprovalNode {
  type: 'approval';
  policy: ApprovalPolicy;         // who must approve
  slaHours: number;               // escalation timer
  escalationPolicy: EscalationPolicy;
  approvedBranch: NodeId;
  rejectedBranch: NodeId;
  timeoutBranch: NodeId;
}
```

See [AGENT_MODEL.md](AGENT_MODEL.md) for approval policy design.

### 6. Loop Nodes (iteration)

```typescript
interface LoopNode {
  type: 'loop';
  iterateOver: string;       // workflow variable (array)
  maxIterations: number;     // safety limit
  body: NodeId;              // first node of loop body
  afterLoop: NodeId;         // exit node
}
```

### 7. SubWorkflow Nodes (composition)

```typescript
interface SubWorkflowNode {
  type: 'subworkflow';
  workflowId: string;        // reference to another waai_workflow
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}
```

Workflows are composable. A "book appointment" workflow can be called from a "customer onboarding" workflow.

---

## Data Model

```sql
CREATE TABLE waai_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  name text not null,
  description text,
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'active', 'paused', 'deprecated')),
  graph jsonb not null,              -- { nodes: [], edges: [], variables: {} }
  trigger_config jsonb not null,     -- trigger type + parameters
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE waai_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references waai_workflows(id),
  workspace_id uuid not null references waai_workspaces(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'cancelled', 'waiting_approval')),
  trigger_event jsonb,               -- what triggered this run
  context jsonb not null default '{}', -- workflow variables at runtime
  started_at timestamptz default now(),
  completed_at timestamptz,
  error text,
  retry_count int default 0
);

CREATE TABLE waai_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references waai_workflow_runs(id) on delete cascade,
  node_id text not null,             -- node ID from workflow graph
  node_type text not null,
  status text not null
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting_approval')),
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int
);

-- RLS: workspace_id isolation on all workflow tables
ALTER TABLE waai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE waai_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waai_workflow_steps ENABLE ROW LEVEL SECURITY;
```

---

## Execution Engine

### Async Queue Architecture

```
Trigger Event
     ↓
TriggerService.emit(event)
     ↓
WorkflowExecutionService.enqueue(workflowId, event)
     ↓
Queue (Inngest / Supabase Edge Function Queues)
     ↓
WorkflowRunner.execute(runId)
     ↓
For each node:
  1. Load node definition
  2. Evaluate inputs from context
  3. Execute node (may be async, may wait for approval)
  4. Record step in waai_workflow_steps
  5. Update context with outputs
  6. Enqueue next node
```

### Why Inngest (recommendation)

Inngest is the recommended queue for Phase D:
- Serverless-native (runs inside Vercel functions)
- Built-in retry, delay, step functions
- No separate infrastructure (no Redis, no BullMQ worker)
- Durable execution — survives Vercel cold starts
- Dashboard for workflow debugging

Alternative: Supabase Edge Function Queues (if staying fully in Supabase ecosystem).

### Step Isolation

Every node execution is idempotent:
1. Load step record — if already completed, return cached output
2. Execute node logic
3. Write output to `waai_workflow_steps`
4. Enqueue next node

On failure: retry the failing node, not the entire workflow. Context is preserved.

---

## Approval Engine Integration

When the engine reaches an Approval Node:

```
WorkflowRunner hits ApprovalNode
     ↓
Create waai_approval_request
  { run_id, step_id, policy, sla_hours, context_snapshot }
     ↓
Notify approvers (email + in-app notification)
     ↓
Workflow run status = 'waiting_approval'
     ↓
[Human approves or rejects via dashboard]
     ↓
PUT /api/approvals/{id}/decision
     ↓
WorkflowRunner resumes from approval node
  → approved: follow approvedBranch
  → rejected: follow rejectedBranch
```

SLA timer: If no decision within `sla_hours`, Inngest triggers escalation to next level.

---

## Visual Editor (Phase D — UI)

The visual editor is a React-based node graph editor. Built with:
- **React Flow** (MIT license) — battle-tested graph editor library
- **No custom canvas rendering** — React Flow handles drag, connect, zoom
- WAAI implements: node types, validation, variable binding UI

### Editor Features
- Drag and drop node palette
- Connect nodes with typed edges
- Variable binding picker (output of Node A → input of Node B)
- Real-time validation (loop cycles, missing connections)
- Test run with mock inputs
- Run history visualization (show last 10 runs on the graph)

---

## Example Workflow: Customer Lead Qualification

```json
{
  "name": "Lead Qualification",
  "trigger": { "type": "inbound_message", "channel": "whatsapp" },
  "nodes": [
    {
      "id": "n1", "type": "agent",
      "agentId": "agent-xyz",
      "inputTemplate": "Classify this inquiry: {{message.text}}",
      "outputVariable": "classification"
    },
    {
      "id": "n2", "type": "condition",
      "expression": { "field": "classification.intent", "operator": "eq", "value": "purchase_intent" },
      "trueBranch": "n3", "falseBranch": "n5"
    },
    {
      "id": "n3", "type": "action",
      "actionType": "create_lead",
      "input": { "phone": "{{message.from}}", "intent": "{{classification.intent}}" }
    },
    {
      "id": "n4", "type": "approval",
      "policy": { "role": "agent_manager", "workspace_id": "{{workspace.id}}" },
      "slaHours": 4,
      "approvedBranch": "n_send_offer", "rejectedBranch": "n_send_standard"
    },
    {
      "id": "n5", "type": "action",
      "actionType": "send_message",
      "input": { "to": "{{message.from}}", "text": "Thanks for reaching out!" }
    }
  ]
}
```

---

## Workflow vs Direct Agent Pipeline

The existing 14-step `AgentRuntimeService` pipeline remains the default for direct WhatsApp conversations. Workflows are an opt-in layer for multi-step, conditional, approval-required, or cross-channel automation.

| Scenario | Use | Reason |
|---|---|---|
| Customer WhatsApp message → AI reply | Agent Pipeline (existing) | Direct, low-latency |
| Lead qualifies → create CRM record → notify manager | Workflow | Multi-step, cross-system |
| Schedule weekly digest email | Workflow | Scheduled trigger |
| New customer signs up → run onboarding sequence | Workflow | Event-driven, multi-step |
| Agent detects escalation keyword → human handoff | Agent Pipeline (existing) | Built-in handoff mechanism |
