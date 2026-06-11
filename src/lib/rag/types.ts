export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  metadata: {
    documentId: string;
    sourceTitle: string;
    chunkIndex: number;
  };
}

export const RAG_CONFIG = {
  chunkSize: 500,
  chunkOverlap: 50,
  topK: 5,
  similarityThreshold: 0.75,
  embeddingDimensions: 1536,
  embeddingModel: "text-embedding-3-small",
} as const;
