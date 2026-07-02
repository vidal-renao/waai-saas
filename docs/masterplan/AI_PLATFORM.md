# WAAI v3 — AI Platform Design
**Document Type:** Architecture Reference  
**Date:** 2026-06-30  
**Status:** Authoritative

---

## Overview

The AI Platform is the execution engine that powers every agent interaction. It is designed to be:
- **Provider-agnostic** — route to any LLM without touching business logic
- **Observable** — every token, every cost, every latency tracked
- **Resilient** — retries, failover, circuit breakers
- **Streaming-first** — responses start appearing in < 500ms
- **Safe** — output filters, policy enforcement, human escalation

The existing 14-step `AgentRuntimeService` pipeline is the foundation. v3 enriches it — it does not replace it.

---

## Subsystem Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Platform v3                        │
│                                                          │
│  Input                                                   │
│  ──────────────────────────────────────────────          │
│  InboundMessage → [Context Engine] → EnrichedContext     │
│                        │                                 │
│              [Memory Service]  [RAG Retrieval]           │
│              [Conv History]    [Knowledge Base]          │
│                                                          │
│  Planning                                                │
│  ──────────────────────────────────────────────          │
│  EnrichedContext → [Prompt Engine] → AssembledPrompt     │
│                         │                                │
│               [Variable Injection]                       │
│               [Policy Enforcement]                       │
│               [Prompt Caching Hints]                     │
│                                                          │
│  Execution                                               │
│  ──────────────────────────────────────────────          │
│  AssembledPrompt → [LLM Router] → SelectedProvider       │
│                         │                                │
│             [Model Evaluator]  [Cost Estimator]          │
│             [Retry Orchestrator]                         │
│                   │                                      │
│  [Anthropic] [OpenAI] [Azure] [Gemini] [Local]          │
│                                                          │
│  Output                                                  │
│  ──────────────────────────────────────────────          │
│  RawOutput → [Safety Filter] → [Streaming Service] → UI  │
│                   │                                      │
│         [Cost Tracker]  [Telemetry Sink]                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Subsystem 1 — LLM Router

### Responsibility
Select the right model and provider for each request based on task type, cost budget, latency requirements, and provider availability.

### Current State
`createLLMProvider()` always returns `new AnthropicClaudeProvider()`. No routing.

### v3 Design

```typescript
// src/lib/llm/llm-router.ts
export class LLMRouter {
  select(context: RoutingContext): LLMProvider {
    const strategy = this.resolveStrategy(context);
    return this.providers.get(strategy.provider);
  }

  private resolveStrategy(ctx: RoutingContext): RoutingStrategy {
    // Rule 1: Explicit override (per-workspace config)
    if (ctx.workspaceConfig.llmProvider) return { provider: ctx.workspaceConfig.llmProvider };
    // Rule 2: Task-based routing
    if (ctx.taskType === 'lead_extraction') return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
    if (ctx.taskType === 'complex_reasoning') return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
    // Rule 3: Budget-aware routing
    if (ctx.remainingBudgetCents < 0.01) return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
    // Rule 4: Primary availability check
    if (!this.isHealthy('anthropic')) return this.fallback(ctx);
    // Default
    return { provider: 'anthropic', model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001' };
  }
}
```

### Model Selection Matrix

| Task | Primary Model | Fallback | Reason |
|---|---|---|---|
| WhatsApp reply | claude-haiku-4-5-20251001 | gpt-4o-mini | <2s latency, low cost |
| Sandbox chat | claude-haiku-4-5-20251001 | gpt-4o-mini | Interactive latency |
| Complex reasoning | claude-sonnet-4-6 | gpt-4o | Better at multi-step |
| Agent prompt generation | claude-sonnet-4-6 | gpt-4o | Quality > speed |
| Lead extraction | claude-haiku-4-5-20251001 | gpt-4o-mini | Structured output |
| Document summarization | claude-haiku-4-5-20251001 | gpt-4o-mini | Cost optimization |

---

## Subsystem 2 — Execution Engine

### Responsibility
Manage the lifecycle of an LLM request: submit, stream, retry, timeout, record.

### Current State
Single `try/catch` in `AnthropicClaudeProvider.generateResponse()`. No streaming. No retries.

### v3 Design

```typescript
// src/lib/llm/execution-engine.ts
export class ExecutionEngine {
  async execute(
    provider: LLMProvider,
    request: LLMRequest,
    options: ExecutionOptions
  ): AsyncIterable<string> {
    const attempt = new RetryOrchestrator({
      maxAttempts: 3,
      backoffMs: [1000, 2000, 4000],
      retryOn: [429, 529, 500, 503],
    });

    return attempt.run(async () => {
      const stream = provider.stream(request);
      this.telemetry.recordAttempt(request.runId);
      return stream;
    });
  }
}
```

### Retry Policy

| Status Code | Retry? | Backoff | Notes |
|---|---|---|---|
| 429 Too Many Requests | Yes | 1s, 2s, 4s | Respect Retry-After header |
| 529 Overloaded (Anthropic) | Yes | 1s, 2s, 4s | Anthropic-specific |
| 500 Server Error | Yes | 1s, 2s, 4s | Transient |
| 503 Unavailable | Yes | 1s, 2s, 4s | Switch to fallback on 3rd failure |
| 400 Bad Request | No | — | Prompt error, don't retry |
| 401 Unauthorized | No | — | Key error, alert immediately |
| 408 Timeout | Yes | 2s, 4s | Increase timeout on retry |

---

## Subsystem 3 — Memory Service

### Responsibility
Maintain context that persists across conversations: user preferences, facts stated in past conversations, interaction style.

### Current State
No cross-session memory. Conversation history is limited to last 20 messages within the current session.

### v3 Design

```
Memory Types:
├── SessionMemory    — current conversation (existing: last 20 msgs)
├── UserMemory       — per-phone-number facts (new: persisted in DB)
│   └── "User prefers Spanish", "Called about invoice 1042"
├── AgentMemory      — agent-level learned patterns (new: aggregate)
│   └── "Common objections for this agent"
└── WorkspaceMemory  — org-level business context (new: shared)
    └── "Company pricing changed on 2026-07-01"
```

```sql
-- New table: waai_user_memories
CREATE TABLE waai_user_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references waai_workspaces(id) on delete cascade,
  agent_id uuid references waai_agents(id) on delete cascade,
  contact_phone text not null,
  memory_type text not null check (memory_type in ('fact','preference','interaction')),
  content text not null,
  confidence float default 1.0,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS: workspace isolation
```

### Memory Injection in Prompt
```
<user_context>
  Previous interactions: 3 conversations
  Known facts: prefers Spanish, is a medical professional
  Last contact: 2026-06-15 (asked about clinic hours)
</user_context>
```

---

## Subsystem 4 — Context Engine

### Responsibility
Assemble all relevant context for a request: conversation history, user memory, RAG knowledge, agent configuration, workflow state.

### v3 Design

```typescript
// src/lib/ai/context-engine.ts
export class ContextEngine {
  async buildContext(input: ContextInput): Promise<AssembledContext> {
    const [history, memory, ragContext] = await Promise.all([
      this.historyService.getLast20(input.conversationId),
      this.memoryService.getUserMemory(input.workspaceId, input.agentId, input.contactPhone),
      this.ragService.retrieve(input.workspaceId, input.agentId, input.userMessage),
    ]);

    return {
      systemPrompt: this.buildSystemPrompt(input.agent, memory, ragContext),
      messages: history,
      ragMetadata: ragContext.metadata,
      memoryMetadata: memory.metadata,
    };
  }
}
```

### Context Window Management
- Reserved for system prompt: 4,000 tokens (with Anthropic prompt cache)
- Reserved for RAG context: 2,000 tokens (TOP_K=5 chunks)
- Reserved for memory: 500 tokens
- Available for conversation history: remaining tokens up to model max
- Reserve for response: 2,048 tokens minimum

---

## Subsystem 5 — Prompt Engine

### Responsibility
Assemble the final system prompt from agent configuration, RAG context, memory, and policy rules. Support prompt caching.

### Current State
`AgentPromptBuilderService` assembles prompt. No caching hints. RAG injected via `<business_knowledge>` tag.

### v3 Design: Layered Prompt Assembly

```
Layer 1 (cacheable): Agent persona, tone, language
  └── Changes: only when agent config changes
Layer 2 (cacheable): Business knowledge (RAG chunks)
  └── Changes: per query (not cached)
Layer 3 (dynamic): User memory, conversation context
  └── Changes: every message
Layer 4 (dynamic): Current user message
  └── Changes: every message
```

```typescript
// Anthropic prompt cache hint on stable layers
{
  role: "system",
  content: [
    {
      type: "text",
      text: agentPersonaPrompt,
      cache_control: { type: "ephemeral" }  // Cache layer 1
    },
    {
      type: "text",
      text: ragContext,
    },
  ]
}
```

### Prompt Variables
```
{{agent_name}}         — from waai_agents.name
{{agent_language}}     — from waai_agents.language
{{workspace_name}}     — from waai_workspaces.name
{{business_type}}      — from waai_workspaces.business_type
{{current_date}}       — injected at runtime
{{user_memory}}        — from MemoryService
{{rag_context}}        — from RagRetrievalService
{{policy_rules}}       — from AgentPolicyService
```

---

## Subsystem 6 — Tool Registry

### Responsibility
Register, discover, and execute tools that agents can invoke during reasoning.

### Current State
No tool registry. Agents cannot call external functions or APIs.

### v3 Design

```typescript
// src/lib/ai/tool-registry.ts
export interface Tool {
  name: string;
  description: string;          // shown to the LLM
  parameters: JsonSchema;       // Zod-validated input
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>;
  requiresApproval(input: unknown): boolean;
}

export class ToolRegistry {
  register(tool: Tool): void;
  getToolsForAgent(agentId: string): Tool[];
  execute(toolName: string, input: unknown, ctx: ToolContext): Promise<ToolResult>;
}
```

### Built-in Tools (Phase C)
| Tool | Description | Approval? |
|---|---|---|
| `search_knowledge` | Search agent's knowledge base | No |
| `create_lead` | Create a CRM lead from conversation | No |
| `request_handoff` | Trigger human handoff | No |
| `send_calendar_invite` | Book appointment via Calendar connector | Configurable |
| `lookup_crm_record` | Read customer data from CRM | No |
| `update_crm_record` | Write to CRM | Approval by default |
| `fetch_order_status` | Call ERP for order data | No |
| `send_document` | Send PDF via WhatsApp | Configurable |

---

## Subsystem 7 — Streaming Service

### Responsibility
Convert LLM streaming output to HTTP Server-Sent Events (SSE) for real-time UI updates.

### Current State
No streaming. Full response returned after complete generation.

### v3 Design

```typescript
// src/app/api/agents/[agentId]/sandbox/route.ts
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const llmStream = await executionEngine.execute(provider, llmRequest);
      for await (const chunk of llmStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### WhatsApp Note
WhatsApp does not support streaming. For WhatsApp channels, the agent completes the full response then sends it. Streaming applies to: sandbox, developer API, future web widget.

---

## Subsystem 8 — Cost Tracker

### Responsibility
Compute, record, and enforce AI cost per run. Surface cost in analytics. Alert on budget overruns.

### Current State
`AiCostService` has correct pricing table. Never called from `AgentRuntimeService`. `estimated_cost_cents` always NULL.

### v3 Fix (immediate — Phase A)

```typescript
// agent-runtime-service.ts — add after llmOutput received
const costService = new AiCostService();
const { estimated_cost_cents, input_cost_cents, output_cost_cents } =
  costService.estimateCost(llmOutput.model, llmOutput.inputTokens, llmOutput.outputTokens);

const run = await this.runRepo.create({
  // ...existing fields...
  estimatedCostCents: estimated_cost_cents,  // ← wire this
});
```

### v3 Extension: Budget Enforcement

```typescript
// Per-workspace monthly AI budget (new DB column)
waai_subscriptions.monthly_ai_budget_cents  -- null = unlimited

// Before LLM call
const monthlyCost = await costService.getMonthlyTotal(workspaceId);
if (budget && monthlyCost >= budget) {
  throw new PlanLimitError("MONTHLY_AI_BUDGET_EXCEEDED");
}
```

---

## Subsystem 9 — Safety Filter

### Responsibility
Validate agent output before sending to user. Block policy violations, PII exposure, hallucinated internal data.

### Current State
Prompt instructions only ("do not reveal internal IDs"). No programmatic filter.

### v3 Design

```typescript
// src/lib/ai/safety-filter.ts
export class SafetyFilter {
  async validate(output: string, context: SafetyContext): Promise<FilterResult> {
    const checks = await Promise.all([
      this.checkPIIExposure(output),      // no internal UUIDs, emails
      this.checkPolicyViolation(output, context.agentPolicies),
      this.checkHallucination(output, context.ragChunks), // verify claims against sources
      this.checkToxicity(output),
    ]);

    const violations = checks.filter(c => !c.passed);
    if (violations.length > 0) {
      await this.auditLog.record('safety_filter_blocked', violations);
      return { blocked: true, reason: violations[0].reason, fallback: context.agent.fallbackResponse };
    }
    return { blocked: false };
  }
}
```

---

## Subsystem 10 — Model Evaluation

### Responsibility
Track model performance over time. Enable A/B testing of prompt versions and model variants.

### v3 Design

```sql
-- waai_model_evaluations: per-run evaluation
CREATE TABLE waai_model_evaluations (
  run_id uuid references waai_agent_runs(id),
  model text not null,
  latency_ms int not null,
  input_tokens int not null,
  output_tokens int not null,
  estimated_cost_cents numeric not null,
  user_feedback text,         -- 'thumbs_up' | 'thumbs_down' | null
  safety_filter_triggered bool default false,
  rag_used bool default false,
  rag_chunks_count int,
  created_at timestamptz default now()
);
```

### A/B Testing Flow
1. Define experiment: `{ name: "haiku-vs-sonnet", variants: [{ model: "haiku", weight: 0.5 }, { model: "sonnet", weight: 0.5 }] }`
2. LLM Router assigns variant by workspace+agent hash
3. Both variants tracked in `waai_model_evaluations`
4. Analytics service computes winner by CSAT + cost
5. Rollout winner, end experiment

---

## Subsystem 11 — Multi-Agent Collaboration

### Responsibility
Enable multiple specialized agents to collaborate on a single user request. Orchestrator delegates to specialist agents.

### Current State
No multi-agent. Each conversation is served by exactly one agent.

### v3 Design

```
User Message
     ↓
Orchestrator Agent  (routing, planning)
     ├──→ Specialist Agent A  (product knowledge)
     ├──→ Specialist Agent B  (pricing / billing)
     └──→ Specialist Agent C  (scheduling)
          ↓
Orchestrator collects, synthesizes
     ↓
Final Response to User
```

```typescript
// src/lib/ai/multi-agent-orchestrator.ts
export class MultiAgentOrchestrator {
  async run(input: OrchestrationInput): Promise<OrchestrationOutput> {
    const plan = await this.planner.plan(input.userMessage, input.agentRoster);
    const results = await Promise.all(
      plan.delegations.map(d => this.executeAgent(d.agentId, d.subTask))
    );
    return this.synthesizer.combine(results);
  }
}
```

**Phase G feature** — not for Phase A-C.

---

## AI Platform Implementation Phases

| Phase | Deliverable | Effort |
|---|---|---|
| A (now) | Wire CostTracker, fix retries, fix streaming foundation | 1 week |
| B | Prompt caching activation, Memory Service v1 (session) | 2 weeks |
| C | Tool Registry, Safety Filter, LLM Router (multi-provider) | 4 weeks |
| D | Streaming SSE in sandbox, User Memory persistence | 2 weeks |
| E | Model Evaluation, A/B testing | 3 weeks |
| G | Multi-Agent Orchestrator, Agent-to-Agent collaboration | 6 weeks |
