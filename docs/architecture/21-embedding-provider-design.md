# Architecture 21 — Embedding Provider Design (Fase 4)

## Principio

Mismo patrón que LLMProvider (ADR-0004): abstracción por interfaz, implementación intercambiable, factory de creación, modelo desde env var.

## Interfaz

```typescript
// src/lib/embeddings/types.ts
export interface EmbeddingInput {
  text: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingBatchInput {
  texts: string[];
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingOutput {
  embedding: number[];
  provider: string;
  model: string;
  usage: { promptTokens: number; totalTokens: number };
  rawMetadata: Record<string, unknown>;
}

export interface EmbeddingBatchOutput {
  embeddings: number[][];
  provider: string;
  model: string;
  usage: { promptTokens: number; totalTokens: number };
  rawMetadata: Record<string, unknown>;
}

export interface EmbeddingProvider {
  embedText(input: EmbeddingInput): Promise<EmbeddingOutput>;
  embedBatch(input: EmbeddingBatchInput): Promise<EmbeddingBatchOutput>;
  getProviderName(): string;
  getDefaultModel(): string;
}
```

## OpenAIEmbeddingProvider

- Lee `OPENAI_API_KEY` en el constructor — lanza si está ausente
- Lee `OPENAI_EMBEDDING_MODEL` desde env — fallback `text-embedding-3-small`
- Timeout: 30 segundos
- Usa el paquete npm `openai`
- Dimensiones: 1536 (invariante al modelo text-embedding-3-small)
- `embedBatch` usa una sola llamada a la API con múltiples inputs

## Factory

```typescript
// src/lib/embeddings/embedding-provider.ts
export function createEmbeddingProvider(): EmbeddingProvider {
  return new OpenAIEmbeddingProvider();
}
```

## Variables de entorno

| Variable | Requerida | Default |
|----------|-----------|---------|
| OPENAI_API_KEY | Sí | — (lanza en constructor) |
| OPENAI_EMBEDDING_MODEL | No | text-embedding-3-small |
| OPENAI_EMBEDDING_DIMENSIONS | No | 1536 |

## Fallback documentado

Si `OPENAI_API_KEY` no está configurada:
- El constructor lanza `Error: "OPENAI_API_KEY is not configured"`
- `KnowledgeProcessingService` captura en try/catch → devuelve error controlado `NO_API_KEY`
- `RagRetrievalService` captura en try/catch → devuelve contexto vacío + `rag_error`
- En ambos casos: NUNCA exponer el stack trace al cliente

## Modelo NOT hardcoded

```typescript
const DEFAULT_MODEL = "text-embedding-3-small"; // documented fallback
this.model = process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_MODEL;
```
