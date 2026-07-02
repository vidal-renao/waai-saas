# WAAI — Agent Development Guide
**Document Type:** Engineering Standard  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Reference:** docs/masterplan/AGENT_MODEL.md, docs/architecture/14-agent-builder-architecture.md

---

## What is a WAAI Agent?

A WAAI Agent is not a simple chatbot. It is a governed AI entity with:
- An **identity** (name, persona, language, tone)
- **Goals** (measurable outcomes it is designed to achieve)
- **Policies** (rules it must follow; some enforced, some advisory)
- **Tools** (callable functions it can invoke to take action)
- **Memory** (user facts persisted across conversations)
- **Knowledge** (workspace documents retrieved via RAG)
- **Approvals** (high-risk actions require human approval before execution)
- **Analytics** (every interaction measured for health, cost, and goal progress)
- **Lifecycle** (draft → review → published → deprecated)

---

## 1. Agent Identity

### Database Representation

```sql
-- waai_agents (existing table, extends with new Phase C columns)
CREATE TABLE waai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES waai_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  language text NOT NULL DEFAULT 'auto',
  tone text NOT NULL DEFAULT 'professional',   -- professional, friendly, formal, casual
  status text NOT NULL DEFAULT 'draft'          -- draft | review | published | deprecated
    CHECK (status IN ('draft', 'review', 'published', 'deprecated')),
  current_version_id uuid,                      -- FK to waai_agent_versions (Phase C)
  policy_enforcement_enabled bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Identity Rules

- Agent `name` is customer-facing and can contain emojis or special characters
- `system_prompt` is assembled from the identity layer by `prompt-builder.ts` — not stored as raw text; stored as structured template
- `language: 'auto'` means the agent responds in the same language as the user
- `status` drives the lifecycle gate. Only `published` agents can serve production traffic

---

## 2. Agent Goals (Phase C)

Goals are measurable outcomes linked to KPIs.

```sql
CREATE TABLE waai_agent_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES waai_agents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES waai_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,                  -- "Lead Conversion Rate"
  description text,
  metric text NOT NULL,                -- "lead_conversion_rate" (maps to analytics event)
  target_value numeric NOT NULL,       -- 0.15 (15%)
  target_period text NOT NULL DEFAULT 'monthly',  -- daily | weekly | monthly
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Goal Evaluation

Goals are evaluated daily by a background job reading from `waai_analytics_events`. Results displayed in the Agent Health dashboard.

---

## 3. Agent Policies (Phase C)

Policies are rules evaluated against every inbound message and every agent output.

### Policy Types

| Policy Type | What It Does | Example |
|---|---|---|
| `forbidden_topic` | Block agent from responding to specified topics | Never discuss competitor pricing |
| `required_disclosure` | Force agent to include a disclosure in specific contexts | Always mention "I'm an AI" when asked |
| `escalation_trigger` | Auto-trigger handoff when keywords detected | If user says "legal" or "lawyer", request handoff |
| `tone_rule` | Enforce a specific communication tone | Always use formal German (Sie, not Du) |
| `response_length` | Limit or require minimum response length | Keep WhatsApp responses under 300 characters |
| `language_rule` | Force response language regardless of user language | Always respond in German |

### Policy Rule Definition Schema

```typescript
interface PolicyRule {
  type: PolicyType;
  definition: {
    // For forbidden_topic:
    keywords?: string[];
    patterns?: string[];  // regex
    
    // For required_disclosure:
    triggerKeywords?: string[];
    disclosureText?: string;
    
    // For escalation_trigger:
    triggerKeywords?: string[];
    handoffReason?: string;
    
    // For tone_rule:
    tone?: 'formal' | 'friendly' | 'professional' | 'empathetic';
    language?: string;  // BCP 47 code
    
    // For response_length:
    maxChars?: number;
    minChars?: number;
    
    // For language_rule:
    language?: string;  // BCP 47 code
  };
  action: 'block' | 'warn' | 'log' | 'transform';
}
```

### Policy Enforcement Model

Policies are evaluated in `PolicyEvaluationService` in two phases:

1. **Input phase** (before RAG retrieval): check `forbidden_topic`, `escalation_trigger`
2. **Output phase** (before sending response to user): check `required_disclosure`, `tone_rule`, `response_length`, `language_rule`

**Shadow Mode** (default for new policies): Violations are logged to `waai_audit_logs` with `metadata.shadow_mode: true`. Agent is not blocked. Used to validate policy accuracy before enforcement.

**Enforcement Mode** (opt-in per workspace): Violations result in blocked response or auto-modified response depending on `action` type.

---

## 4. Agent Tools (Phase C)

Tools are callable functions that agents invoke to take real-world actions.

### Tool Interface

```typescript
// src/lib/tools/tool.ts
export interface Tool {
  name: string;
  description: string;          // shown to the LLM in the system prompt
  parameters: JsonSchema;       // OpenAI function calling compatible
  requiresApproval: (params: Record<string, unknown>) => boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  workspaceId: string;
  agentId: string;
  conversationId: string;
  userId: string;  // the human user, not the agent
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

### Built-In Tools (Phase C)

| Tool Name | Risk | Approval Required | Description |
|---|---|---|---|
| `search_knowledge` | low | Never | Query RAG knowledge base |
| `create_lead` | medium | Sometimes (if policy set) | Create lead record in workspace |
| `request_handoff` | low | Never | Transfer conversation to human agent |
| `get_conversation_history` | low | Never | Fetch recent messages in conversation |
| `send_calendar_invite` | high | Always | Book a calendar appointment |
| `lookup_crm_record` | low | Never | Search CRM for contact |
| `update_crm_record` | high | Always | Modify CRM contact or deal |
| `fetch_order_status` | low | Never | Query e-commerce order status |

### Tool Registration

```typescript
// src/lib/tools/tool-registry.ts
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, Tool>();
  
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
      ToolRegistry.instance.registerBuiltIns();
    }
    return ToolRegistry.instance;
  }
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  getToolsForAgent(agentId: string): Tool[] {
    // Return only tools assigned to this agent in waai_agent_tools
    return [...this.tools.values()].filter(t => agentToolIds.includes(t.name));
  }
  
  getToolDefinitions(tools: Tool[]): LLMToolDefinition[] {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }
}
```

---

## 5. Agent Memory (Phase C)

See `docs/execution/10_AI_ENGINEERING_GUIDE.md` Section 5 for implementation details.

### Memory Rules

- Facts extracted after each completed conversation (idle > 30min or handoff resolved)
- Extraction uses `claude-haiku-4-5-20251001` (cost-efficient, sufficient for classification)
- Only `high` and `medium` confidence facts are stored
- Facts are surfaced to the agent in the `<user_context>` XML block (Layer 3 of prompt)
- Users can request their memory be deleted (GDPR right to erasure) — delete all rows in `waai_user_memories` for that user

---

## 6. Agent Knowledge

Knowledge is retrieved from the workspace's knowledge base via RAG.

### Knowledge Base Architecture

```
Document Upload
    ↓
TextExtractor (PDF → plain text)
    ↓
Chunker (max 512 tokens per chunk, 50 token overlap)
    ↓
OpenAI text-embedding-3-small (1536 dimensions)
    ↓
waai_knowledge_chunks (pgvector, cosine similarity)
    ↓
Similarity Search (threshold: 0.70, top_k: 5)
    ↓
Injected into Layer 2 of prompt
```

### Knowledge Rules

- Agents only access knowledge from their linked knowledge bases (`waai_agent_knowledge_sources`)
- Cross-workspace knowledge access is blocked by RLS
- Document processing status tracked: `pending → processing → ready | failed`
- Failed embeddings must be retried (at most 3 attempts, then `failed` status)

---

## 7. Agent Versioning (Phase C)

Every change to an agent's configuration creates a new version:

```sql
CREATE TABLE waai_agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES waai_agents(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  system_prompt text NOT NULL,
  configuration jsonb NOT NULL,          -- goals, policies, tools at this version
  change_summary text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Versioning Rules

- Version is incremented on any change to `system_prompt`, goals, policies, or tool assignments
- `waai_agents.current_version_id` points to the active version
- Rollback: set `current_version_id` to a previous version's ID — no data loss
- Previous versions are never deleted (compliance audit trail)
- Version diff visible in Agent Builder UI: what changed between v3 and v4

---

## 8. Agent Approvals (Phase C)

High-risk agent actions require human approval before execution.

### Approval Risk Routing

| Risk Level | Default Approver | SLA |
|---|---|---|
| `low` | Auto-approved | Immediate |
| `medium` | `human_agent` role | 2 hours |
| `high` | `agent_manager` role | 4 hours |
| `critical` | `workspace_admin` role | 8 hours |

### Approval Request Lifecycle

```
Agent calls Tool with requiresApproval() = true
    ↓
ApprovalService.createRequest() called
    ↓
waai_approval_requests INSERT: status = 'pending'
    ↓
Notification sent (email + in-app)
    ↓
Inngest timer started (SLA hours)
    ↓
Approver acts: approve or reject
    ↓
If approved: tool.execute() called, conversation continues
If rejected: agent notifies user (politely), conversation ends or continues without tool
If SLA expired: escalate to next role, new notification sent
```

---

## 9. Agent Health (Phase C)

The Agent Health dashboard shows operational health for each agent:

### Health Metrics

| Metric | Calculation | Warning | Critical |
|---|---|---|---|
| Error rate | `errors / total_runs` (last 24h) | > 5% | > 10% |
| Handoff rate | `handoffs / total_conversations` (last 24h) | > 30% | > 50% |
| Avg latency | p95 of `waai_agent_runs.duration_ms` | > 6000ms | > 10000ms |
| Cost/day | `SUM(estimated_cost_cents)` (today) | > 80% of budget | > 100% of budget |
| Message volume | Count of `waai_agent_runs` (today) | — | — |
| Policy violations | Count from `waai_audit_logs` (today) | > 5 | > 20 |

### Health Status Computation

```typescript
function computeHealthStatus(metrics: AgentMetrics): 'healthy' | 'warning' | 'degraded' | 'critical' {
  if (metrics.errorRate > 0.10) return 'critical';
  if (metrics.handoffRate > 0.50) return 'critical';
  if (metrics.errorRate > 0.05) return 'degraded';
  if (metrics.handoffRate > 0.30) return 'warning';
  if (metrics.avgLatencyMs > 6000) return 'warning';
  if (metrics.costPercentOfBudget > 0.80) return 'warning';
  return 'healthy';
}
```

---

## 10. Agent Lifecycle (Phase C)

```
Draft → Review → Published → Deprecated
```

### Lifecycle Gates

**Draft → Review:**
- Agent has a name
- System prompt is > 100 characters
- At least one knowledge source linked (or explicitly marked "No knowledge base")
- Created by `workspace_admin` or above

**Review → Published:**
- Review gate checklist completed by `agent_manager` or above:
  - [ ] System prompt reviewed for hallucination risks
  - [ ] Policy rules verified in shadow mode
  - [ ] Tested in sandbox with 5+ different user scenarios
  - [ ] Approval policies configured for all high/critical tools
  - [ ] Health monitoring configured (alert thresholds set)
- ADR written if agent uses a new tool or capability type

**Published → Deprecated:**
- Cannot be deprecated if any active WhatsApp/Email connection is routing to it
- Connections must be re-pointed to another agent first
- Deprecated agents remain accessible in read-only mode for audit purposes

---

## 11. Building a New Agent — Developer Checklist

```
□ Create agent record via POST /api/agents with status: 'draft'
□ Write system prompt using the persona template from docs/prompts/01-agent-system-prompt-template.md
□ Link knowledge base documents (POST /api/agents/{id}/knowledge)
□ Define goals (POST /api/agents/{id}/goals)
□ Define policies in shadow mode (POST /api/agents/{id}/policies with shadow_mode: true)
□ Assign tools (POST /api/agents/{id}/tools)
□ Set approval policies for high/critical tools
□ Test in sandbox: golden path, edge cases, policy violations
□ Review shadow mode policy logs — tune policies
□ Submit for review: PATCH /api/agents/{id} with status: 'review'
□ Review gate completed by agent_manager
□ Publish: PATCH /api/agents/{id} with status: 'published'
□ Connect to WhatsApp / Email channel
□ Monitor Agent Health dashboard for first 48h
```
