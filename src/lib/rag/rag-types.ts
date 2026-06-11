export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    source_type: string;
    document_title: string;
    chunk_index: number;
  };
}

export interface RagChunk {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RagContext {
  chunks: RagChunk[];
  contextText: string;
  ragUsed: boolean;
  ragModel: string;
  ragLatencyMs: number;
}

export interface RagError {
  ragUsed: false;
  ragError: string;
}
