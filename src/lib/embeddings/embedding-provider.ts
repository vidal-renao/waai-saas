import { OpenAIEmbeddingProvider } from "./openai-embedding-provider";
import { MockEmbeddingProvider } from "./mock-embedding-provider";
import type { EmbeddingProvider } from "./types";

/**
 * Factory for embedding providers.
 * Controlled by the EMBEDDING_PROVIDER environment variable:
 *   - "openai" (default) — requires OPENAI_API_KEY with available quota
 *   - "mock"             — deterministic hash-based vectors, no external calls,
 *                          for staging/testing only (not semantically meaningful)
 *
 * See docs/operations/embedding-providers.md for full configuration guide.
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  if (provider === "mock") {
    return new MockEmbeddingProvider();
  }
  return new OpenAIEmbeddingProvider();
}
