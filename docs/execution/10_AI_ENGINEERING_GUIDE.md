# WAAI — AI Engineering Guide
**Document Type:** Engineering Standard  
**Version:** 1.0  
**Date:** 2026-07-02  
**Status:** Authoritative  
**Reference:** ADR-0004 (LLM Provider Abstraction), ADR-0005 (Embedding Strategy), docs/masterplan/AI_PLATFORM.md

---

## Guiding Principle

Every AI component in WAAI must be:
1. **Measurable** — cost, latency, and quality tracked on every call
2. **Fallible gracefully** — retries, fallback models, never silent failure
3. **Auditable** — every AI decision traceable to a workspace and conversation
4. **Controllable** — humans can override, approve, or block any AI action
5. **Cost-bounded** — per-workspace budget limits enforced, no unlimited spend

---

## 1. Prompt Lifecycle

### 1.1 Prompt Assembly

All prompts are assembled in `src/lib/prompt-builder.ts`. Prompts are never constructed inline in service files.

**Four-Layer Architecture:**

```
Layer 1 — Agent Persona (CACHEABLE)
├── Role definition
├── Workspace name and context
├── Response language rules
├── Tone and style guidelines
└── ⚡ cache_control: { type: "ephemeral" } ← Reduce cost by ~90% on repeat calls

Layer 2 — RAG Context (DYNAMIC)
├── Retrieved knowledge chunks (from pgvector similarity search)
└── <knowledge_base> XML block

Layer 3 — Memory + Conversation Context (DYNAMIC)
├── User memory facts (from waai_user_memories)
├── Recent conversation history (last N messages)
└── <user_context> and <conversation_history> XML blocks

Layer 4 — Current Message (DYNAMIC)
└── The user's actual message
```

**Implementation:**

```typescript
// src/lib/prompt-builder.ts
import { Agent, KnowledgeChunk, UserMemory, ConversationMessage } from '../server/repositories/types';

export interface PromptLayers {
  layer1SystemPrompt: string;        // cacheable persona
  layer2RagContext: string;          // dynamic RAG
  layer3MemoryContext: string;       // dynamic memory
  layer4UserMessage: string;         // current message
}

export function buildAgentPrompt(
  agent: Agent,
  ragChunks: KnowledgeChunk[],
  memories: UserMemory[],
  history: ConversationMessage[],
  userMessage: string,
): PromptLayers {
  const layer1 = buildPersonaLayer(agent);
  const layer2 = buildRagLayer(ragChunks);
  const layer3 = buildMemoryLayer(memories, history);
  
  return {
    layer1SystemPrompt: layer1,
    layer2RagContext: layer2,
    layer3MemoryContext: layer3,
    layer4UserMessage: userMessage,
  };
}
```

### 1.2 Prompt Caching

Anthropic prompt caching (documented in ADR-0004, not yet implemented — Phase A deliverable):

```typescript
// src/lib/llm/anthropic-claude-provider.ts
async complete(request: LLMRequest): Promise<LLMResponse> {
  const messages = await this.client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens ?? 1024,
    system: [
      {
        type: 'text',
        text: request.systemPrompt,
        cache_control: { type: 'ephemeral' }, // ← cache the stable persona layer
      }
    ],
    messages: [
      { role: 'user', content: request.ragContext + '\n\n' + request.memoryContext },
      { role: 'user', content: request.userMessage },
    ],
  });
  
  return {
    content: messages.content[0].type === 'text' ? messages.content[0].text : '',
    inputTokens: messages.usage.input_tokens,
    outputTokens: messages.usage.output_tokens,
    cacheReadTokens: messages.usage.cache_read_input_tokens,
    cacheCreationTokens: messages.usage.cache_creation_input_tokens,
    model: messages.model,
  };
}
```

**Expected savings:** System prompt is ~2,000 tokens per call. At 10,000 messages/day, caching saves ~$5–15/day depending on model tier.

### 1.3 Prompt Testing

Every prompt change requires a prompt regression test (see `docs/execution/09_TEST_STRATEGY.md` section 6). Test against the golden path scenarios before merging.

---

## 2. Model Routing

### 2.1 LLM Router Rules

The `LLMRouter` in `src/server/services/llm-router.ts` (Phase C) applies rules in order:

```typescript
async function resolveModel(context: RoutingContext): Promise<ModelSelection> {
  // Rule 1: Workspace has explicitly set a model
  if (context.workspace.overrideModel) {
    return { model: context.workspace.overrideModel, provider: inferProvider(context.workspace.overrideModel) };
  }
  
  // Rule 2: Task-based routing
  if (context.task === 'lead_detection' || context.task === 'fact_extraction') {
    return { model: 'claude-haiku-4-5-20251001', provider: 'anthropic' };
  }
  if (context.task === 'complex_reasoning' || context.task === 'document_analysis') {
    return { model: 'claude-sonnet-4-6', provider: 'anthropic' };
  }
  
  // Rule 3: Budget-aware routing (if workspace is near monthly AI budget)
  if (context.monthlyUsagePct > 0.8) {
    return { model: 'claude-haiku-4-5-20251001', provider: 'anthropic' }; // cheaper model
  }
  
  // Rule 4: Default — haiku for WhatsApp, sonnet for complex tasks
  return { model: 'claude-haiku-4-5-20251001', provider: 'anthropic' };
}
```

### 2.2 Model Selection Matrix

| Task | Default Model | Fallback | Reasoning |
|---|---|---|---|
| WhatsApp conversation | `claude-haiku-4-5-20251001` | `gpt-4o-mini` | Speed, cost (< 3s response) |
| Lead detection | `claude-haiku-4-5-20251001` | `gpt-4o-mini` | Simple classification |
| Sandbox chat | `claude-sonnet-4-6` | `gpt-4o` | Higher quality for testing |
| Document analysis | `claude-sonnet-4-6` | `gpt-4o` | Complex reasoning required |
| Fact extraction | `claude-haiku-4-5-20251001` | `gpt-4o-mini` | Simple extraction |
| System prompt generation | `claude-sonnet-4-6` | `gpt-4o` | Creative, nuanced output |
| Multi-agent orchestration | `claude-sonnet-4-6` | `gpt-4o` | Delegation and synthesis |

---

## 3. Retry and Fallback

### 3.1 Retry Logic (Phase A deliverable)

```typescript
// src/lib/llm/anthropic-claude-provider.ts
private async withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  const delays = [1000, 2000, 4000];
  const retryableStatuses = [429, 529, 500, 503];
  
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error instanceof Anthropic.APIError ? error.status : 0;
      const isRetryable = retryableStatuses.includes(status);
      const isLastAttempt = attempt === delays.length;
      
      if (!isRetryable || isLastAttempt) {
        Sentry.captureException(error, { extra: { context, attempt, status } });
        throw error;
      }
      
      Sentry.addBreadcrumb({ category: 'llm.retry', message: `Retrying ${context} (attempt ${attempt + 1})`, data: { status, delay: delays[attempt] } });
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
  
  throw new Error('unreachable');
}
```

### 3.2 Provider Fallback (Phase C)

When all retry attempts for the primary provider fail, the LLM Router falls back to the secondary provider:

```typescript
async function completeWithFallback(request: LLMRequest): Promise<LLMResponse> {
  try {
    return await primaryProvider.complete(request);
  } catch (error) {
    Sentry.captureException(error, { extra: { context: 'primary-provider-failed', model: request.model } });
    
    if (fallbackProvider) {
      Sentry.addBreadcrumb({ category: 'llm.fallback', message: 'Switching to fallback provider' });
      return await fallbackProvider.complete({ ...request, model: FALLBACK_MODEL });
    }
    
    throw error;
  }
}
```

---

## 4. Cost Tracking

### 4.1 Cost Recording (Phase A — immediate fix)

Every AI call records cost immediately after completion:

```typescript
// src/server/services/agent-runtime-service.ts
// After LLM call (step in the 14-step pipeline):
const llmResponse = await llmProvider.complete(request);

// IMMEDIATE: Record cost
await aiCostService.recordCost({
  workspaceId: context.workspaceId,
  agentId: context.agentId,
  agentRunId: currentRunId,
  model: llmResponse.model,
  inputTokens: llmResponse.inputTokens,
  outputTokens: llmResponse.outputTokens,
  cacheReadTokens: llmResponse.cacheReadTokens ?? 0,
  estimatedCostCents: aiCostService.estimateCost({
    model: llmResponse.model,
    inputTokens: llmResponse.inputTokens,
    outputTokens: llmResponse.outputTokens,
    cacheReadTokens: llmResponse.cacheReadTokens ?? 0,
  }).estimatedCostCents,
});
```

### 4.2 Pricing Table

Maintained in `AiCostService`. Updated when Anthropic changes pricing.

```typescript
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number; cacheReadPer1M: number }> = {
  'claude-haiku-4-5-20251001': { inputPer1M: 0.25, outputPer1M: 1.25, cacheReadPer1M: 0.03 },
  'claude-sonnet-4-6':         { inputPer1M: 3.00, outputPer1M: 15.00, cacheReadPer1M: 0.30 },
  'claude-opus-4-8':           { inputPer1M: 15.00, outputPer1M: 75.00, cacheReadPer1M: 1.50 },
  'gpt-4o':                    { inputPer1M: 5.00, outputPer1M: 15.00, cacheReadPer1M: 0 },
  'gpt-4o-mini':               { inputPer1M: 0.15, outputPer1M: 0.60, cacheReadPer1M: 0 },
};
```

### 4.3 Budget Enforcement (Phase C)

```sql
-- Add AI budget column to workspaces
ALTER TABLE waai_workspaces 
  ADD COLUMN IF NOT EXISTS monthly_ai_budget_cents int; -- null = unlimited

-- RPC to check if workspace is over budget
CREATE OR REPLACE FUNCTION waai_check_ai_budget(p_workspace_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT SUM(estimated_cost_cents) FROM waai_ai_cost_snapshots 
     WHERE workspace_id = p_workspace_id 
     AND created_at >= date_trunc('month', now())) 
    < (SELECT monthly_ai_budget_cents FROM waai_workspaces WHERE id = p_workspace_id),
    true  -- if no budget set, always allowed
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 5. Memory Lifecycle

### 5.1 Memory Types

| Type | Scope | Storage | Lifecycle |
|---|---|---|---|
| Session | Single conversation | In-memory / Redis | Cleared when conversation ends |
| User | Per user, per workspace | `waai_user_memories` | Until user deletes account |
| Agent | Per agent | `waai_agents.memory_config` | Until agent is archived |
| Workspace | Per workspace | `waai_workspaces.shared_memory` | Until workspace deleted |

### 5.2 Fact Extraction (Phase C)

After each conversation ends (handoff resolved or session idle > 30min), extract persistent facts:

```typescript
// src/server/services/memory-service.ts
async function extractAndStoreFacts(conversation: Conversation, workspaceId: string): Promise<void> {
  const extractionPrompt = `
    Analyse this conversation and extract facts about the user that would be useful in future conversations.
    Return a JSON array of facts. Each fact: { "fact": string, "confidence": "high"|"medium"|"low" }.
    Only extract facts with confidence "high" or "medium".
    Do not include transient information (e.g., "user asked about opening hours today").
    
    Conversation:
    ${conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;
  
  const response = await llmProvider.complete({
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: 'You are a fact extraction system. Return only valid JSON.',
    userMessage: extractionPrompt,
    maxTokens: 512,
  });
  
  const facts = JSON.parse(response.content) as Array<{ fact: string; confidence: string }>;
  const highConfidenceFacts = facts.filter(f => f.confidence !== 'low');
  
  for (const fact of highConfidenceFacts) {
    await userMemoryRepository.upsert({
      workspaceId,
      userId: conversation.userId,
      fact: fact.fact,
      sourceConversationId: conversation.id,
    });
  }
}
```

### 5.3 Memory Injection

```typescript
// Inject memory into system prompt assembly (Layer 3)
function buildMemoryLayer(memories: UserMemory[]): string {
  if (memories.length === 0) return '';
  
  const factsXml = memories
    .map(m => `  <fact>${m.fact}</fact>`)
    .join('\n');
  
  return `<user_context>\n${factsXml}\n</user_context>`;
}
```

---

## 6. Safety and Content Filtering

### 6.1 Input Safety Check

Before passing user message to agent:

```typescript
// src/server/services/safety-filter.ts
export async function checkInputSafety(message: string): Promise<SafetyResult> {
  // 1. PII detection (before logging or storing)
  const piiMatches = detectPII(message);  // regex patterns: SSN, credit card, IBAN
  if (piiMatches.length > 0) {
    await auditLog.record({ action: 'pii_detected_in_input', piiTypes: piiMatches.map(m => m.type) });
    // Do NOT block — PII in customer messages is expected. Just log.
  }
  
  // 2. Policy violation check (against agent's waai_agent_policies)
  const policyResult = await policyEvaluationService.evaluate(message, agentPolicies);
  if (policyResult.violated && enforcementEnabled) {
    return { allowed: false, reason: 'policy_violation', policyId: policyResult.violatedPolicyId };
  }
  
  return { allowed: true };
}
```

### 6.2 Output Safety Check

Before sending agent response to user:

```typescript
// Basic output safety — do not return the system prompt if asked
function sanitizeOutput(response: string, systemPrompt: string): string {
  // Remove any accidental system prompt disclosure
  if (response.includes(systemPrompt.substring(0, 50))) {
    Sentry.captureMessage('Potential system prompt disclosure detected', 'warning');
    return 'I can\'t share that information, but I\'m here to help! What can I do for you?';
  }
  return response;
}
```

---

## 7. Human Approval Integration

### 7.1 When Approval is Required

The `requiresApproval()` method on each Tool returns true when:
- Tool has `risk_level: 'high' | 'critical'`
- Tool action is irreversible (send external message, modify CRM record, book appointment)
- Agent's workspace has `require_approval_for_all_tools: true`

```typescript
// src/lib/tools/send-calendar-invite.ts
export const sendCalendarInviteTool: Tool = {
  name: 'send_calendar_invite',
  description: 'Books a calendar appointment with the customer',
  parameters: { /* ... */ },
  requiresApproval: () => true,  // always requires human approval — irreversible action
  riskLevel: 'high',
  execute: async (params) => { /* ... */ },
};
```

### 7.2 Approval Timeout Behaviour

If an approval request is not actioned within the SLA:

```typescript
// Inngest function: runs after SLA expires
export const approvalSlaTimer = inngest.createFunction(
  { id: 'approval-sla-escalate' },
  { event: 'approval/created' },
  async ({ event, step }) => {
    const slaHours = event.data.slaHours;
    
    await step.sleep(`wait-${slaHours}h`, `${slaHours}h`);
    
    const request = await approvalRepository.findById(event.data.requestId);
    if (request.status === 'pending') {
      // Auto-escalate to next role in hierarchy
      const nextRole = getRoleAbove(request.assignedRole);
      await approvalService.escalate(request.id, nextRole);
      await notificationService.sendEscalationEmail(request, nextRole);
    }
  }
);
```

---

## 8. AI Observability

Every AI call produces the following observability data:

| Data Point | Storage | Retention |
|---|---|---|
| `estimated_cost_cents` | `waai_agent_runs.estimated_cost_cents` | Per workspace billing period |
| `input_tokens`, `output_tokens` | `waai_agent_runs` | 90 days |
| `model_used` | `waai_agent_runs.model` | 90 days |
| `latency_ms` | `waai_agent_runs.duration_ms` | 90 days |
| `error_code` | Sentry + `waai_audit_logs` | 1 year |
| `cache_read_tokens` | `waai_agent_runs` | 90 days |
| `policy_violation` | `waai_audit_logs` | 7 years (DSG) |
| `approval_decision` | `waai_approval_requests` | 7 years (DSG) |

### Sentry Performance Spans

```typescript
// Instrument the 14-step pipeline
const span = Sentry.startSpan({ name: 'agent-runtime', op: 'ai' }, async () => {
  const ragSpan = Sentry.startSpan({ name: 'rag-retrieval', op: 'db' }, async () => {
    return await ragService.retrieve(message, knowledgeBaseId);
  });
  
  const llmSpan = Sentry.startSpan({ name: 'llm-complete', op: 'ai.inference' }, async () => {
    return await llmProvider.complete(request);
  });
});
```
