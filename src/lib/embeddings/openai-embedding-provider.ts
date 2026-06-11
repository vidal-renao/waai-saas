import OpenAI from "openai";
import type {
  EmbeddingProvider,
  EmbeddingInput,
  EmbeddingOutput,
  EmbeddingBatchInput,
  EmbeddingBatchOutput,
} from "./types";

// Fallback model — used if OPENAI_EMBEDDING_MODEL env var is not set.
// See docs/architecture/21-embedding-provider-design.md
const DEFAULT_MODEL = "text-embedding-3-small";
const TIMEOUT_MS = 30_000;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    this.client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
    // OPENAI_EMBEDDING_MODEL from env; DEFAULT_MODEL is the documented fallback
    this.model = process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_MODEL;
  }

  getProviderName(): string {
    return "openai";
  }

  getDefaultModel(): string {
    return this.model;
  }

  async embedText(input: EmbeddingInput): Promise<EmbeddingOutput> {
    const model = input.model ?? this.model;
    let response: OpenAI.Embeddings.CreateEmbeddingResponse;
    try {
      response = await this.client.embeddings.create({
        model,
        input: input.text,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OpenAI embedding error";
      throw new Error(`OpenAIEmbeddingProvider: ${msg}`);
    }

    const item = response.data[0];
    return {
      embedding: item.embedding,
      provider: "openai",
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
      rawMetadata: { object: response.object },
    };
  }

  async embedBatch(input: EmbeddingBatchInput): Promise<EmbeddingBatchOutput> {
    if (input.texts.length === 0) {
      return {
        embeddings: [],
        provider: "openai",
        model: this.model,
        usage: { promptTokens: 0, totalTokens: 0 },
        rawMetadata: {},
      };
    }

    const model = input.model ?? this.model;
    let response: OpenAI.Embeddings.CreateEmbeddingResponse;
    try {
      response = await this.client.embeddings.create({
        model,
        input: input.texts,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OpenAI embedding error";
      throw new Error(`OpenAIEmbeddingProvider: ${msg}`);
    }

    // Preserve order — API returns embeddings in the same order as input
    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    return {
      embeddings,
      provider: "openai",
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
      rawMetadata: { object: response.object },
    };
  }
}
