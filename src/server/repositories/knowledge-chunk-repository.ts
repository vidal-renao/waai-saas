import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiKnowledgeChunk } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateKnowledgeChunkInput {
  workspaceId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[];
  embeddingModel: string;
  metadata: Record<string, unknown>;
}

export class KnowledgeChunkRepository {
  constructor(private readonly db: Client) {}

  async findByDocument(documentId: string): Promise<WaaiKnowledgeChunk[]> {
    const { data, error } = await this.db
      .from("waai_knowledge_chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });
    if (error)
      throw new Error(`KnowledgeChunkRepository.findByDocument: ${error.message}`);
    return data ?? [];
  }

  async createMany(inputs: CreateKnowledgeChunkInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const { error } = await this.db.from("waai_knowledge_chunks").insert(
      inputs.map((i) => ({
        workspace_id: i.workspaceId,
        document_id: i.documentId,
        chunk_index: i.chunkIndex,
        content: i.content,
        token_count: i.tokenCount,
        embedding: i.embedding,
        embedding_model: i.embeddingModel,
        metadata: i.metadata,
      }))
    );
    if (error)
      throw new Error(`KnowledgeChunkRepository.createMany: ${error.message}`);
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const { error } = await this.db
      .from("waai_knowledge_chunks")
      .delete()
      .eq("document_id", documentId);
    if (error)
      throw new Error(`KnowledgeChunkRepository.deleteByDocument: ${error.message}`);
  }

  async countByDocument(documentId: string): Promise<number> {
    const { count, error } = await this.db
      .from("waai_knowledge_chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", documentId);
    if (error) return 0;
    return count ?? 0;
  }
}
