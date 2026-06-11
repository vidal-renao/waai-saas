# ADR-0004 — LLM Provider Abstraction

**Status:** Accepted  
**Date:** 2026-06-07  
**Author:** Vidal Reñao Lopelo

---

## Context

Claude API is the primary LLM. However, cost, availability, or customer requirements might lead to using OpenAI, Gemini, or local models in the future. Tying the application directly to the Anthropic SDK would make this migration expensive.

## Decision

Implement an `LLMProvider` interface. All AI calls go through this interface.

### Interface contract

```typescript
// src/lib/llm/types.ts
export interface LLMMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface LLMCompletionOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface LLMProvider {
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string>
  stream(messages: LLMMessage[], options?: LLMCompletionOptions): AsyncIterable<string>
}
```

### Implementations

- `src/lib/llm/providers/anthropic.ts` — Claude API (default, `claude-haiku-4-5-20251001` for speed/cost, `claude-sonnet-4-6` for complex reasoning)
- `src/lib/llm/providers/openai.ts` — stub, not implemented in MVP

### Model selection strategy

| Use case | Model | Reason |
|---|---|---|
| WhatsApp replies | `claude-haiku-4-5-20251001` | <2s latency, low cost |
| Agent prompt generation | `claude-sonnet-4-6` | Better reasoning for initial setup |
| Lead extraction | `claude-haiku-4-5-20251001` | Structured output, fast |

## Prompt Caching

All requests to the Anthropic SDK must use prompt caching (`cache_control: { type: "ephemeral" }`) on the system prompt to reduce costs. System prompts can be up to 4k tokens.

## Consequences

- **Positive:** Model can be upgraded without touching business logic.
- **Positive:** Enables per-workspace model overrides in the future.
- **Negative:** Streaming abstraction is non-trivial. Will be simplified in MVP (non-streaming first, streaming added in Fase 3).

## Related ADRs

- [ADR-0005](ADR-0005-embedding-model-and-rag-strategy.md) — Embedding model and RAG strategy
