import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { KnowledgeDocumentRepository } from "@/server/repositories/knowledge-document-repository";
import { KnowledgeChunkRepository } from "@/server/repositories/knowledge-chunk-repository";
import { KnowledgeEventRepository } from "@/server/repositories/knowledge-event-repository";
import { createEmbeddingProvider } from "@/lib/embeddings/embedding-provider";
import { extractText } from "@/lib/rag/text-extractor";
import { chunkText } from "@/lib/rag/chunker";
import type { WaaiKnowledgeSourceType } from "@/types/database";

type Client = SupabaseClient<Database>;

export type ProcessingResult =
  | { success: true; chunksCount: number; documentId: string }
  | { success: false; code: string; error: string };

export class KnowledgeProcessingService {
  private readonly docRepo: KnowledgeDocumentRepository;
  private readonly chunkRepo: KnowledgeChunkRepository;
  private readonly eventRepo: KnowledgeEventRepository;

  constructor(private readonly db: Client) {
    this.docRepo = new KnowledgeDocumentRepository(db);
    this.chunkRepo = new KnowledgeChunkRepository(db);
    this.eventRepo = new KnowledgeEventRepository(db);
  }

  async processDocument(
    documentId: string,
    workspaceId: string,
    userId: string
  ): Promise<ProcessingResult> {
    const doc = await this.docRepo.findById(documentId);
    if (!doc || doc.workspace_id !== workspaceId) {
      return { success: false, code: "NOT_FOUND", error: "Documento no encontrado." };
    }

    if (doc.status === "archived") {
      return { success: false, code: "ARCHIVED", error: "No se puede procesar un documento archivado." };
    }

    // Mark as processing
    await this.docRepo.updateStatus(documentId, "processing");
    await this.eventRepo.log({
      workspaceId,
      documentId,
      actorUserId: userId,
      eventType: "document_processing_started",
    });

    // 1. Extract text
    let extractedText: string;
    try {
      const result = extractText(doc.text_content, doc.source_type as WaaiKnowledgeSourceType);
      extractedText = result.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Text extraction failed";
      await this.docRepo.updateStatus(documentId, "failed", msg);
      await this.eventRepo.log({ workspaceId, documentId, actorUserId: userId, eventType: "document_failed", metadata: { error: msg } });
      return { success: false, code: "EXTRACTION_ERROR", error: msg };
    }

    // 2. Chunk text
    const chunks = chunkText(extractedText, doc.title, doc.source_type);
    if (chunks.length === 0) {
      const msg = "El documento no tiene contenido suficiente para procesar.";
      await this.docRepo.updateStatus(documentId, "failed", msg);
      return { success: false, code: "EMPTY_CONTENT", error: msg };
    }

    await this.eventRepo.log({
      workspaceId, documentId, actorUserId: userId,
      eventType: "chunks_generated",
      metadata: { chunks_count: chunks.length },
    });

    // 3. Generate embeddings
    let embeddingProvider: ReturnType<typeof createEmbeddingProvider>;
    try {
      embeddingProvider = createEmbeddingProvider();
    } catch {
      const msg = "La API key de embeddings (OPENAI_API_KEY) no está configurada.";
      await this.docRepo.updateStatus(documentId, "failed", msg);
      return { success: false, code: "NO_API_KEY", error: msg };
    }

    let embeddings: number[][];
    try {
      const batchResult = await embeddingProvider.embedBatch({
        texts: chunks.map((c) => c.content),
      });
      embeddings = batchResult.embeddings;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Embedding generation failed";
      await this.docRepo.updateStatus(documentId, "failed", msg);
      await this.eventRepo.log({ workspaceId, documentId, actorUserId: userId, eventType: "document_failed", metadata: { error: msg } });
      return { success: false, code: "EMBEDDING_ERROR", error: msg };
    }

    // 4. Delete existing chunks (re-processing) and save new ones
    await this.chunkRepo.deleteByDocument(documentId);
    await this.chunkRepo.createMany(
      chunks.map((chunk, i) => ({
        workspaceId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: embeddings[i],
        embeddingModel: embeddingProvider.getDefaultModel(),
        metadata: chunk.metadata,
      }))
    );

    await this.eventRepo.log({
      workspaceId, documentId, actorUserId: userId,
      eventType: "embeddings_generated",
      metadata: { chunks_count: chunks.length, model: embeddingProvider.getDefaultModel() },
    });

    // 5. Mark as ready
    await this.docRepo.updateStatus(documentId, "ready");
    await this.eventRepo.log({
      workspaceId, documentId, actorUserId: userId,
      eventType: "document_processed",
      metadata: { chunks_count: chunks.length },
    });

    // 6. Increment document counter
    await this.db.rpc("waai_increment_document_counter", {
      p_workspace_id: workspaceId,
    });

    return { success: true, chunksCount: chunks.length, documentId };
  }
}
