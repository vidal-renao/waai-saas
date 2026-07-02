# WAAI SaaS — AI Platform Audit
**Audit Date:** 2026-06-30 | Evidence: Source code analysis

---

## Mandatory Questions

| Question | Answer | Evidence |
|---|---|---|
| Is Anthropic abstracted? | ⚠️ Partially | Interface exists; factory always returns Anthropic |
| Can OpenAI/Azure/Gemini be added? | ⚠️ Interface allows it; factory does not route to them | `src/lib/llm/llm-provider.ts` |
| Streaming? | ❌ No | `messages.create()` non-streaming call |
| Retries? | ❌ No | Single try in `generateResponse()` |
| Cost tracking? | ⚠️ Service exists, not wired to runtime | `AiCostService` vs `agent-runtime-service.ts` |
| Token tracking? | ✅ Yes | `response.usage.input_tokens` + `output_tokens` stored per run |

---

## Anthropic Integration

**File:** `src/lib/llm/anthropic-claude-provider.ts`

### Initialization
```typescript
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 30_000;

this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
this.model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
```

- API key validated at construction — fails fast if missing ✅
- 30-second timeout configured ✅
- Model configurable via `ANTHROPIC_MODEL` env var ✅
- Hardcoded fallback: `claude-haiku-4-5-20251001` (fastest, cheapest) ✅

### Token Fields (SDK v2 Correctness)
```typescript
return {
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  totalTokens: response.usage.input_tokens + response.usage.output_tokens,
};
```
SDK v2 uses `input_tokens` / `output_tokens` (not `prompt_tokens` / `completion_tokens`). **Correct.** ✅

### Error Handling
```typescript
try {
  response = await this.client.messages.create({ ... });
} catch (err) {
  throw new Error(`AnthropicClaudeProvider: ${msg}`);
}
```
Error is caught and re-thrown as a typed Error. The runtime service catches this and returns `{ code: "CLAUDE_ERROR" }` to the caller. Adequate for MVP.

**Gap: No retries.** A transient Anthropic 529 (overloaded) or 500 causes immediate failure with no backoff. Recommended: exponential backoff with max 3 retries.

**Gap: No streaming.** The current implementation uses blocking `messages.create()`. For sandbox responses, users see nothing until the full answer is ready. On complex prompts with RAG context, latency can exceed 5 seconds with zero feedback. Streaming is a UX-critical feature.

---

## LLM Provider Abstraction

**Interface (`src/lib/llm/types.ts`):**
```typescript
export interface LLMProvider {
  generateResponse(input: LLMInput): Promise<LLMOutput>;
  getProviderName(): string;
  getDefaultModel(): string;
}
```
Well-designed interface that supports any provider. ✅

**Factory (`src/lib/llm/llm-provider.ts`):**
```typescript
export function createLLMProvider(): LLMProvider {
  return new AnthropicClaudeProvider();
}
```
**Critical finding:** The factory is a 1-line hardcode. Despite the interface supporting multiple providers, there is **no routing logic** to select alternative providers. The claim "multi-LLM" in the product UI is architectural potential, not current capability.

To add OpenAI GPT-4o, a developer would need to:
1. Implement `OpenAIProvider implements LLMProvider`
2. Add `case "openai":` to factory
3. Set `LLM_PROVIDER=openai` env var

The groundwork is correct but the execution is missing.

---

## Embedding Provider

**Factory (`src/lib/embeddings/embedding-provider.ts`):**
```typescript
export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  if (provider === "mock") return new MockEmbeddingProvider();
  return new OpenAIEmbeddingProvider();
}
```
This is correctly multi-provider (openai or mock). ✅

**Model:** `text-embedding-3-small` (1536 dimensions) — correct match with `vector(1536)` in DB. ✅

**Mock provider:** Available for staging (`.env.staging.example` sets `EMBEDDING_PROVIDER` implicitly to openai, but mock is available). Staging docs say to use real OpenAI key for knowledge base testing.

---

## RAG Pipeline

**Retrieval service (`src/server/services/rag-retrieval-service.ts`):**

1. Checks if agent has linked knowledge — early exit if none ✅
2. Instantiates embedding provider
3. Generates query embedding via `provider.embedText()`
4. Calls `waai_match_agent_knowledge` RPC (TOP_K=5, threshold=0.75)
5. Builds context text with source attribution
6. Injects into system prompt via `<business_knowledge>` XML tag ✅

**Non-blocking:** RAG failure is caught and handled gracefully:
```typescript
catch {
  ragMetadata = { rag_used: false, rag_error: "retrieval_error" };
}
```
If OpenAI embedding fails, the conversation continues without RAG context. ✅

**Parameters:**
- `TOP_K = 5` — reasonable for most use cases
- `SIMILARITY_THRESHOLD = 0.75` — conservative; may miss relevant chunks on paraphrase queries. Consider 0.65–0.70 for production.

**Prompt injection guardrails:**
```
- NO reveles IDs internos, chunk IDs, embeddings ni metadatos técnicos al usuario.
- Si el usuario pregunta algo fuera del alcance, responde con amabilidad y redirige.
```
Adequate for MVP. ✅

---

## Cost Tracking

**`AiCostService` (`src/server/services/ai-cost-service.ts`):**

Pricing table (as of June 2026):
```typescript
"claude-haiku-4-5-20251001": { inputCentsPerToken: 0.00008, outputCentsPerToken: 0.0004 }
"claude-sonnet-4-6":         { inputCentsPerToken: 0.0003,  outputCentsPerToken: 0.0015 }
```

`estimateCost(model, inputTokens, outputTokens)` → returns `estimated_cost_cents`. ✅

**Critical gap:** `AgentRuntimeService.processMessage()` never calls `AiCostService`. The `runRepo.create()` call at line 268 does not pass `estimatedCostCents`:
```typescript
// agent-runtime-service.ts:268 — estimatedCostCents absent
const run = await this.runRepo.create({
  workspaceId: input.workspaceId,
  ...
  inputTokens: llmOutput.inputTokens,
  outputTokens: llmOutput.outputTokens,
  totalTokens: llmOutput.totalTokens,
  // estimatedCostCents: ← MISSING
});
```

**Result:** `estimated_cost_cents` is always `NULL` in `waai_agent_runs`. The cost analytics dashboard (`/api/billing/costs`) reads from DB runs and returns $0 for all periods. **Cost analytics are broken in production.**

Fix: instantiate `AiCostService`, call `estimateCost(llmOutput.model, llmOutput.inputTokens, llmOutput.outputTokens)`, pass to `runRepo.create()`.

---

## AI Security

- System prompt not exposed to end-users ✅
- RAG metadata (chunk IDs, document IDs) blocked from user-visible output by prompt instructions ✅
- No user input reflected back raw into DB without sanitization (stored as message content — acceptable) ✅
- No AI-generated SQL or code execution ✅

---

## AI Risk Summary

| Finding | Severity | Fix |
|---|---|---|
| `estimated_cost_cents` always NULL in production | 🔴 High | Wire `AiCostService` into `agent-runtime-service.ts` |
| No streaming responses | 🟠 Medium | Add `stream: true` branch to provider |
| No retries on Anthropic failure | 🟠 Medium | Add exponential backoff (3 attempts) |
| LLM factory hardcoded to Anthropic | 🟡 Low | Add `LLM_PROVIDER` routing to factory |
| Similarity threshold 0.75 may be too conservative | 🟡 Low | Tune based on production data |
| Pricing table requires manual update | 🟡 Low | Consider fetching from Anthropic pricing API or alerting on model mismatch |
