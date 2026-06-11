# Architecture 17 — LLM Provider Runtime

## Interfaz LLMProvider

```typescript
interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

interface LLMInput {
  systemPrompt: string;
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

interface LLMOutput {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rawMetadata: Record<string, unknown>;
}

interface LLMProvider {
  generateResponse(input: LLMInput): Promise<LLMOutput>;
  getProviderName(): string;
  getDefaultModel(): string;
}
```

## Implementación: AnthropicClaudeProvider

Archivo: `src/lib/llm/anthropic-claude-provider.ts`

- Usa `@anthropic-ai/sdk`
- Lee `ANTHROPIC_API_KEY` desde `process.env` (server-only)
- Lee `ANTHROPIC_MODEL` desde `process.env`, **fallback documentado: `claude-haiku-4-5-20251001`**
- Timeout: 30 000 ms
- Sin streaming en MVP
- Errores de API son capturados y re-lanzados como `Error` sin exponer stack traces

### Modelo de configuración

```
ANTHROPIC_API_KEY=sk-ant-...          # requerido, falla si falta
ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # opcional, default documentado
```

### Fallback documentado

Si `ANTHROPIC_MODEL` no está definido, se usa `claude-haiku-4-5-20251001`.
Este default está constante en el código como `DEFAULT_MODEL` con comentario explícito.

## Factory

`src/lib/llm/llm-provider.ts` expone `createLLMProvider(): LLMProvider`.

El llamador (AgentRuntimeService) envuelve la construcción en try/catch
para detectar el error de API key faltante.

## Modelos configurados

| Variable | Uso | Default |
|----------|-----|---------|
| `ANTHROPIC_MODEL` | Sandbox (Fase 3) | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_FAST` | WhatsApp reply (Fase 5) | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_QUALITY` | Agent Builder summary (futuro) | `claude-sonnet-4-6` |

## Evolución futura

| Fase | Cambio |
|------|--------|
| Fase 4 | Añadir RAG context a `LLMInput.metadata` |
| Fase 5 | Crear `WhatsAppRuntimeService` que usa el mismo `LLMProvider` |
| Fase 6 | Streaming via `provider.streamResponse(input)` con ReadableStream |
| Futuro | Añadir `OpenAIProvider`, `GeminiProvider` siguiendo la misma interfaz |

## ADR relacionado

Ver [ADR-0004](../adr/ADR-0004-llm-provider-abstraction.md) para la decisión de abstracción.
