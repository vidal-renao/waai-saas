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
