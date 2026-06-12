import type {
  EmbeddingProvider,
  EmbeddingInput,
  EmbeddingOutput,
  EmbeddingBatchInput,
  EmbeddingBatchOutput,
} from "./types";

// Dimensions must match what the DB vector column expects (same as text-embedding-3-small)
const DIMENSIONS = 1536;
const MOCK_MODEL = "mock-deterministic-v1";

/**
 * Deterministic hash-based embedding provider for staging/testing.
 *
 * Generates unit-normalized vectors seeded from the input text using FNV-1a
 * hash + xorshift32 PRNG. Same text always produces the same vector, but
 * semantic similarity is not meaningful — two related texts will have
 * essentially random cosine similarity.
 *
 * Activate via EMBEDDING_PROVIDER=mock in environment variables.
 * To switch to real embeddings: set EMBEDDING_PROVIDER=openai (or remove the
 * variable) and re-process all documents from the UI.
 *
 * See docs/operations/embedding-providers.md for full configuration guide.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  getProviderName(): string {
    return "mock";
  }

  getDefaultModel(): string {
    return MOCK_MODEL;
  }

  async embedText(input: EmbeddingInput): Promise<EmbeddingOutput> {
    const embedding = deterministicVector(input.text, DIMENSIONS);
    const tokens = estimateTokens(input.text);
    return {
      embedding,
      provider: "mock",
      model: MOCK_MODEL,
      usage: { promptTokens: tokens, totalTokens: tokens },
      rawMetadata: { note: "mock-deterministic — not semantically meaningful" },
    };
  }

  async embedBatch(input: EmbeddingBatchInput): Promise<EmbeddingBatchOutput> {
    if (input.texts.length === 0) {
      return {
        embeddings: [],
        provider: "mock",
        model: MOCK_MODEL,
        usage: { promptTokens: 0, totalTokens: 0 },
        rawMetadata: {},
      };
    }

    const embeddings = input.texts.map((t) => deterministicVector(t, DIMENSIONS));
    const totalTokens = input.texts.reduce((sum, t) => sum + estimateTokens(t), 0);

    return {
      embeddings,
      provider: "mock",
      model: MOCK_MODEL,
      usage: { promptTokens: totalTokens, totalTokens },
      rawMetadata: { note: "mock-deterministic — not semantically meaningful" },
    };
  }
}

// FNV-1a 32-bit hash → seed for xorshift32 PRNG → unit-normalized vector
function deterministicVector(text: string, dimensions: number): number[] {
  // FNV-1a hash for a stable seed from text content
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash = hash >>> 0;
  }

  // xorshift32 PRNG seeded with hash
  let state = hash || 1;
  const vector = new Array<number>(dimensions);
  for (let i = 0; i < dimensions; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    vector[i] = (state / 0xffffffff) * 2 - 1;
  }

  // Normalize to unit length (required for pgvector cosine similarity)
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 chars
  return Math.ceil(text.length / 4);
}
