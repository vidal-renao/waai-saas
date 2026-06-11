import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createEmbeddingProvider } from "@/lib/embeddings/embedding-provider";
import { AgentKnowledgeSourceRepository } from "@/server/repositories/agent-knowledge-source-repository";
import type { RagContext, RagError, RagChunk } from "@/lib/rag/rag-types";

type Client = SupabaseClient<Database>;

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.75;

export class RagRetrievalService {
  private readonly sourceRepo: AgentKnowledgeSourceRepository;

  constructor(private readonly db: Client) {
    this.sourceRepo = new AgentKnowledgeSourceRepository(db);
  }

  async retrieveContext(
    workspaceId: string,
    agentId: string,
    query: string
  ): Promise<RagContext | RagError> {
    // Check if agent has any linked knowledge
    const hasLinks = await this.sourceRepo.hasAnyActiveLinks(agentId);
    if (!hasLinks) {
      return {
        ragUsed: false,
        chunks: [],
        contextText: "",
        ragModel: "",
        ragLatencyMs: 0,
      } as RagContext;
    }

    const start = Date.now();

    // Instantiate embedding provider
    let provider: ReturnType<typeof createEmbeddingProvider>;
    try {
      provider = createEmbeddingProvider();
    } catch (err) {
      return {
        ragUsed: false,
        ragError: err instanceof Error ? err.message : "Embedding provider error",
      };
    }

    // Generate query embedding
    let queryEmbedding: number[];
    try {
      const result = await provider.embedText({ text: query });
      queryEmbedding = result.embedding;
    } catch (err) {
      return {
        ragUsed: false,
        ragError: err instanceof Error ? err.message : "Query embedding failed",
      };
    }

    // Retrieve matching chunks via SQL function
    let rows: Array<{
      chunk_id: string;
      document_id: string;
      content: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }>;
    try {
      const { data, error } = await this.db.rpc("waai_match_agent_knowledge", {
        query_embedding: queryEmbedding,
        match_agent_id: agentId,
        match_workspace_id: workspaceId,
        match_count: TOP_K,
        similarity_threshold: SIMILARITY_THRESHOLD,
      });
      if (error) throw new Error(error.message);
      rows = (data ?? []) as typeof rows;
    } catch (err) {
      return {
        ragUsed: false,
        ragError: err instanceof Error ? err.message : "Retrieval query failed",
      };
    }

    const ragLatencyMs = Date.now() - start;

    if (rows.length === 0) {
      return {
        chunks: [],
        contextText: "",
        ragUsed: false,
        ragModel: provider.getDefaultModel(),
        ragLatencyMs,
      };
    }

    const chunks: RagChunk[] = rows.map((r) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
    }));

    const contextText = buildContextText(chunks);

    return {
      chunks,
      contextText,
      ragUsed: true,
      ragModel: provider.getDefaultModel(),
      ragLatencyMs,
    };
  }
}

function buildContextText(chunks: RagChunk[]): string {
  const parts = chunks.map((chunk) => {
    const title =
      typeof chunk.metadata.document_title === "string"
        ? chunk.metadata.document_title
        : "Documento";
    return `[Fuente: ${title}]\n${chunk.content}`;
  });
  return parts.join("\n\n");
}
